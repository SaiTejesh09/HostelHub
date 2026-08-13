import prisma from '../config/database';
import { createError } from '../middleware/errorHandler';
import { getPaginationParams, buildPaginatedResponse } from '../utils/pagination';
import { sendAnnouncementEmail } from '../utils/email';
import { logger } from '../utils/logger';

type AnnouncementCategory = 'GENERAL' | 'ACADEMIC' | 'MAINTENANCE' | 'EVENT' | 'EMERGENCY';
type AnnouncementPriority = 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT';

interface CreateAnnouncementData {
  title: string;
  content: string;
  priority?: AnnouncementPriority;
  category?: AnnouncementCategory;
  targetRoles?: string[];
  isPinned?: boolean;
  expiresAt?: string | Date;
  attachmentUrl?: string;
}

interface UpdateAnnouncementData {
  title?: string;
  content?: string;
  priority?: AnnouncementPriority;
  category?: AnnouncementCategory;
  targetRoles?: string[];
  isPinned?: boolean;
  isActive?: boolean;
  expiresAt?: string | Date | null;
  attachmentUrl?: string | null;
}

interface AnnouncementFilters {
  page?: number;
  limit?: number;
  category?: string;
  priority?: string;
  pinnedOnly?: boolean;
  role?: string; // filter by target role visibility
}

export class AnnouncementService {

  // ── Create announcement (COMMITTEE/WARDEN/ADMIN only) ─────────────────
  async create(authorId: string, data: CreateAnnouncementData) {
    const announcement = await prisma.announcement.create({
      data: {
        title: data.title,
        content: data.content,
        priority: (data.priority as AnnouncementPriority) || 'MEDIUM',
        category: (data.category as AnnouncementCategory) || 'GENERAL',
        authorId,
        targetRoles: data.targetRoles || ['STUDENT', 'COMMITTEE', 'WARDEN', 'ADMIN'],
        isPinned: data.isPinned || false,
        expiresAt: data.expiresAt ? new Date(data.expiresAt) : null,
        attachmentUrl: data.attachmentUrl || null,
      },
      include: {
        author: {
          select: { id: true, email: true, role: true, studentProfile: { select: { name: true } } },
        },
      },
    });

    logger.info(`Announcement created: ${announcement.id} by ${authorId}`);

    // If URGENT or HIGH priority, trigger email notifications asynchronously
    if (['HIGH', 'URGENT'].includes(announcement.priority)) {
      prisma.user.findMany({
        where: { isActive: true, role: { in: announcement.targetRoles as any[] } },
        select: { email: true }
      }).then((users) => {
        users.forEach((u) => {
          if (u.email) {
            sendAnnouncementEmail(u.email, announcement.title, announcement.content, announcement.priority)
              .catch((err) => logger.warn('Failed to send announcement email:', err));
          }
        });
      }).catch((err) => logger.warn('Failed to fetch users for announcement email broadcast:', err));
    }

    return announcement;
  }

  // ── Get all announcements (with filters, pagination, role-based visibility) ─
  async getAll(filters: AnnouncementFilters) {
    const { page, limit, skip } = getPaginationParams(filters);

    const where: Record<string, unknown> = { isActive: true };

    // Filter expired announcements
    where.OR = [
      { expiresAt: null },
      { expiresAt: { gt: new Date() } },
    ];

    if (filters.category) {
      where.category = filters.category;
    }

    if (filters.priority) {
      where.priority = filters.priority;
    }

    if (filters.pinnedOnly) {
      where.isPinned = true;
    }

    // Role-based visibility: show only announcements targeting the user's role
    if (filters.role) {
      where.targetRoles = { has: filters.role };
    }

    const [data, total] = await Promise.all([
      prisma.announcement.findMany({
        where,
        skip,
        take: limit,
        orderBy: [
          { isPinned: 'desc' },
          { createdAt: 'desc' },
        ],
        include: {
          author: {
            select: { id: true, email: true, role: true, studentProfile: { select: { name: true } } },
          },
        },
      }),
      prisma.announcement.count({ where }),
    ]);

    return buildPaginatedResponse(data, total, page, limit);
  }

  // ── Get all announcements for management (include inactive) ───────────
  async getAllForManagement(filters: AnnouncementFilters) {
    const { page, limit, skip } = getPaginationParams(filters);

    const where: Record<string, unknown> = {};

    if (filters.category) {
      where.category = filters.category;
    }

    if (filters.priority) {
      where.priority = filters.priority;
    }

    const [data, total] = await Promise.all([
      prisma.announcement.findMany({
        where,
        skip,
        take: limit,
        orderBy: [
          { isPinned: 'desc' },
          { createdAt: 'desc' },
        ],
        include: {
          author: {
            select: { id: true, email: true, role: true, studentProfile: { select: { name: true } } },
          },
        },
      }),
      prisma.announcement.count({ where }),
    ]);

    return buildPaginatedResponse(data, total, page, limit);
  }

  // ── Get single announcement ───────────────────────────────────────────
  async getById(id: string) {
    const announcement = await prisma.announcement.findUnique({
      where: { id },
      include: {
        author: {
          select: { id: true, email: true, role: true, studentProfile: { select: { name: true } } },
        },
      },
    });

    if (!announcement) throw createError('Announcement not found', 404);
    return announcement;
  }

  // ── Update announcement ───────────────────────────────────────────────
  async update(id: string, actorId: string, data: UpdateAnnouncementData) {
    const announcement = await prisma.announcement.findUnique({ where: { id } });
    if (!announcement) throw createError('Announcement not found', 404);

    const updated = await prisma.announcement.update({
      where: { id },
      data: {
        ...(data.title !== undefined && { title: data.title }),
        ...(data.content !== undefined && { content: data.content }),
        ...(data.priority !== undefined && { priority: data.priority }),
        ...(data.category !== undefined && { category: data.category }),
        ...(data.targetRoles !== undefined && { targetRoles: data.targetRoles }),
        ...(data.isPinned !== undefined && { isPinned: data.isPinned }),
        ...(data.isActive !== undefined && { isActive: data.isActive }),
        ...(data.expiresAt !== undefined && { expiresAt: data.expiresAt ? new Date(data.expiresAt as string) : null }),
        ...(data.attachmentUrl !== undefined && { attachmentUrl: data.attachmentUrl }),
      },
      include: {
        author: {
          select: { id: true, email: true, role: true, studentProfile: { select: { name: true } } },
        },
      },
    });

    logger.info(`Announcement updated: ${id} by ${actorId}`);
    return updated;
  }

  // ── Delete announcement ───────────────────────────────────────────────
  async delete(id: string, actorId: string) {
    const announcement = await prisma.announcement.findUnique({ where: { id } });
    if (!announcement) throw createError('Announcement not found', 404);

    await prisma.announcement.delete({ where: { id } });
    logger.info(`Announcement deleted: ${id} by ${actorId}`);
    return { message: 'Announcement deleted successfully' };
  }

  // ── Toggle pin status ─────────────────────────────────────────────────
  async togglePin(id: string, actorId: string) {
    const announcement = await prisma.announcement.findUnique({ where: { id } });
    if (!announcement) throw createError('Announcement not found', 404);

    const updated = await prisma.announcement.update({
      where: { id },
      data: { isPinned: !announcement.isPinned },
    });

    logger.info(`Announcement pin toggled: ${id} by ${actorId} → ${updated.isPinned}`);
    return updated;
  }
}

export const announcementService = new AnnouncementService();
