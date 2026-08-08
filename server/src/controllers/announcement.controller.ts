import { Response, NextFunction } from 'express';
import { announcementService } from '../services/announcement.service';
import type { AuthRequest } from '../middleware/auth';

export class AnnouncementController {

  // ── Create announcement ───────────────────────────────────────────────
  async create(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const announcement = await announcementService.create(req.user!.userId, req.body);
      res.status(201).json({ success: true, data: announcement });
    } catch (error) {
      next(error);
    }
  }

  // ── Get all announcements (role-filtered for students) ────────────────
  async getAll(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const { page, limit, category, priority, pinnedOnly } = req.query as Record<string, string>;
      const result = await announcementService.getAll({
        page: Number(page) || 1,
        limit: Number(limit) || 20,
        category,
        priority,
        pinnedOnly: pinnedOnly === 'true',
        role: req.user!.role,
      });
      res.json({ success: true, ...result });
    } catch (error) {
      next(error);
    }
  }

  // ── Get all for management (include inactive) ─────────────────────────
  async getAllForManagement(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const { page, limit, category, priority } = req.query as Record<string, string>;
      const result = await announcementService.getAllForManagement({
        page: Number(page) || 1,
        limit: Number(limit) || 20,
        category,
        priority,
      });
      res.json({ success: true, ...result });
    } catch (error) {
      next(error);
    }
  }

  // ── Get single announcement ───────────────────────────────────────────
  async getById(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const id = req.params.id as string;
      const announcement = await announcementService.getById(id);
      res.json({ success: true, data: announcement });
    } catch (error) {
      next(error);
    }
  }

  // ── Update announcement ───────────────────────────────────────────────
  async update(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const id = req.params.id as string;
      const announcement = await announcementService.update(id, req.user!.userId, req.body);
      res.json({ success: true, data: announcement });
    } catch (error) {
      next(error);
    }
  }

  // ── Delete announcement ───────────────────────────────────────────────
  async delete(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const id = req.params.id as string;
      const result = await announcementService.delete(id, req.user!.userId);
      res.json({ success: true, ...result });
    } catch (error) {
      next(error);
    }
  }

  // ── Toggle pin ────────────────────────────────────────────────────────
  async togglePin(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const id = req.params.id as string;
      const announcement = await announcementService.togglePin(id, req.user!.userId);
      res.json({ success: true, data: announcement });
    } catch (error) {
      next(error);
    }
  }
}

export const announcementController = new AnnouncementController();
