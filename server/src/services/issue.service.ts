import { PrismaClient, IssueCategory, IssueStatus } from '@prisma/client';
import { createError } from '../middleware/errorHandler';
import { notificationService } from './notification.service';
import { io } from '../app';
import { emitToRole } from '../sockets';

const prisma = new PrismaClient();

export class IssueService {
  async create(userId: string, data: { title: string; description: string; category: IssueCategory; location?: string; imageUrl?: string }) {
    const issue = await prisma.issue.create({
      data: {
        userId,
        ...data,
      },
      include: {
        user: { select: { id: true, email: true, studentProfile: { select: { name: true, roomNumber: true } } } },
      },
    });

    // Notify committee/warden of new issue
    emitToRole(io, 'WARDEN', 'issue:new_issue', issue);
    emitToRole(io, 'COMMITTEE', 'issue:new_issue', issue);

    return issue;
  }

  async getAll(query: { page?: number; limit?: number; status?: IssueStatus; category?: IssueCategory; userId?: string }) {
    const page = query.page || 1;
    const limit = query.limit || 10;
    const skip = (page - 1) * limit;

    const where: any = {};
    if (query.status) where.status = query.status;
    if (query.category) where.category = query.category;
    if (query.userId) where.userId = query.userId;

    const [issues, total] = await Promise.all([
      prisma.issue.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          user: { select: { id: true, studentProfile: { select: { name: true, roomNumber: true } } } },
          _count: { select: { responses: true } },
        },
      }),
      prisma.issue.count({ where }),
    ]);

    return {
      data: issues,
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async getById(id: string, userId: string, role: string) {
    const issue = await prisma.issue.findUnique({
      where: { id },
      include: {
        user: { select: { id: true, studentProfile: { select: { name: true, roomNumber: true } } } },
        responses: {
          include: {
            user: { select: { id: true, role: true, studentProfile: { select: { name: true } } } },
          },
          orderBy: { createdAt: 'asc' },
        },
      },
    });

    if (!issue) {
      throw createError('Issue not found', 404);
    }

    if (role === 'STUDENT' && issue.userId !== userId) {
      throw createError('Not authorized to view this issue', 403);
    }

    return issue;
  }

  async updateStatus(id: string, status: IssueStatus) {
    const issue = await prisma.issue.findUnique({ where: { id } });
    if (!issue) {
      throw createError('Issue not found', 404);
    }

    const updated = await prisma.issue.update({
      where: { id },
      data: { status },
    });

    // Emit realtime socket event
    io.to(`user:${issue.userId}`).emit('issue:status_updated', {
      issueId: id,
      title: issue.title,
      status,
    });

    // Create in-app notification
    await notificationService.create({
      userId: issue.userId,
      title: 'Issue Status Updated',
      message: `Your issue "${issue.title}" is now ${status.replace('_', ' ')}.`,
      type: 'GENERAL',
    });

    return updated;
  }

  async addResponse(id: string, userId: string, message: string) {
    const issue = await prisma.issue.findUnique({ where: { id } });
    if (!issue) {
      throw createError('Issue not found', 404);
    }

    const response = await prisma.issueResponse.create({
      data: {
        issueId: id,
        userId,
        message,
      },
      include: {
        user: { select: { id: true, role: true, studentProfile: { select: { name: true } } } },
      },
    });

    if (userId !== issue.userId) {
      // Emit realtime socket event
      io.to(`user:${issue.userId}`).emit('issue:new_response', {
        issueId: id,
        title: issue.title,
        message: response.message,
      });

      // Create in-app notification
      await notificationService.create({
        userId: issue.userId,
        title: 'New Update on Issue',
        message: `There is a new update on your issue "${issue.title}".`,
        type: 'GENERAL',
      });
    } else {
      // If student is responding, notify wardens
      emitToRole(io, 'WARDEN', 'issue:new_response', {
        issueId: id,
        title: issue.title,
        message: response.message,
      });
      emitToRole(io, 'COMMITTEE', 'issue:new_response', {
        issueId: id,
        title: issue.title,
        message: response.message,
      });
    }

    return response;
  }

  async getStats() {
    const stats = await prisma.issue.groupBy({
      by: ['status'],
      _count: true,
    });

    const result = {
      OPEN: 0,
      IN_PROGRESS: 0,
      RESOLVED: 0,
      CLOSED: 0,
      TOTAL: 0,
    };

    stats.forEach(stat => {
      result[stat.status as keyof typeof result] = stat._count;
      result.TOTAL += stat._count;
    });

    return result;
  }
}

export const issueService = new IssueService();
