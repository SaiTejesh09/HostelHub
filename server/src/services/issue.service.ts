import { PrismaClient, IssueCategory, IssueStatus } from '@prisma/client';
import { AppError } from '../middleware/errorHandler';

const prisma = new PrismaClient();

export class IssueService {
  async create(userId: string, data: { title: string; description: string; category: IssueCategory; location?: string; imageUrl?: string }) {
    return prisma.issue.create({
      data: {
        userId,
        ...data,
      },
      include: {
        user: { select: { id: true, email: true, studentProfile: { select: { name: true, roomNumber: true } } } },
      },
    });
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
      throw new AppError(404, 'Issue not found');
    }

    if (role === 'STUDENT' && issue.userId !== userId) {
      throw new AppError(403, 'Not authorized to view this issue');
    }

    return issue;
  }

  async updateStatus(id: string, status: IssueStatus) {
    const issue = await prisma.issue.findUnique({ where: { id } });
    if (!issue) {
      throw new AppError(404, 'Issue not found');
    }

    return prisma.issue.update({
      where: { id },
      data: { status },
    });
  }

  async addResponse(id: string, userId: string, message: string) {
    const issue = await prisma.issue.findUnique({ where: { id } });
    if (!issue) {
      throw new AppError(404, 'Issue not found');
    }

    return prisma.issueResponse.create({
      data: {
        issueId: id,
        userId,
        message,
      },
      include: {
        user: { select: { id: true, role: true, studentProfile: { select: { name: true } } } },
      },
    });
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
