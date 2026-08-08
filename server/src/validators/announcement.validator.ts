import { z } from 'zod';

export const createAnnouncementSchema = z.object({
  title: z.string().min(3, 'Title must be at least 3 characters').max(200, 'Title must be at most 200 characters'),
  content: z.string().min(10, 'Content must be at least 10 characters').max(5000, 'Content must be at most 5000 characters'),
  priority: z.enum(['LOW', 'MEDIUM', 'HIGH', 'URGENT']).optional(),
  category: z.enum(['GENERAL', 'ACADEMIC', 'MAINTENANCE', 'EVENT', 'EMERGENCY']).optional(),
  targetRoles: z.array(z.enum(['STUDENT', 'COMMITTEE', 'WARDEN', 'ADMIN'])).optional(),
  isPinned: z.boolean().optional(),
  expiresAt: z.string().datetime().optional().nullable(),
  attachmentUrl: z.string().url().optional().nullable(),
});

export const updateAnnouncementSchema = z.object({
  title: z.string().min(3).max(200).optional(),
  content: z.string().min(10).max(5000).optional(),
  priority: z.enum(['LOW', 'MEDIUM', 'HIGH', 'URGENT']).optional(),
  category: z.enum(['GENERAL', 'ACADEMIC', 'MAINTENANCE', 'EVENT', 'EMERGENCY']).optional(),
  targetRoles: z.array(z.enum(['STUDENT', 'COMMITTEE', 'WARDEN', 'ADMIN'])).optional(),
  isPinned: z.boolean().optional(),
  isActive: z.boolean().optional(),
  expiresAt: z.string().datetime().optional().nullable(),
  attachmentUrl: z.string().url().optional().nullable(),
});
