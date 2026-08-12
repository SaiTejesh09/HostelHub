import { Response, NextFunction } from 'express';
import { issueService } from '../services/issue.service';
import type { AuthRequest } from '../middleware/auth';
import { IssueStatus } from '@prisma/client';

export class IssueController {
  async create(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const result = await issueService.create(req.user!.userId, req.body);
      res.status(201).json({ success: true, data: result });
    } catch (error) {
      next(error);
    }
  }

  async getAll(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const q = req.query as Record<string, string>;
      const query: any = {
        page: q.page ? Number(q.page) : 1,
        limit: q.limit ? Number(q.limit) : 10,
        status: q.status,
        category: q.category,
      };

      if (req.user!.role === 'STUDENT') {
        query.userId = req.user!.userId;
      }

      const result = await issueService.getAll(query);
      res.json({ success: true, ...result });
    } catch (error) {
      next(error);
    }
  }

  async getById(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const id = req.params.id as string;
      const result = await issueService.getById(id, req.user!.userId, req.user!.role);
      res.json({ success: true, data: result });
    } catch (error) {
      next(error);
    }
  }

  async updateStatus(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const id = req.params.id as string;
      const status = req.body.status as IssueStatus;
      const result = await issueService.updateStatus(id, status);
      res.json({ success: true, data: result });
    } catch (error) {
      next(error);
    }
  }

  async addResponse(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const id = req.params.id as string;
      const result = await issueService.addResponse(id, req.user!.userId, req.body.message);
      res.status(201).json({ success: true, data: result });
    } catch (error) {
      next(error);
    }
  }

  async getStats(_req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const result = await issueService.getStats();
      res.json({ success: true, data: result });
    } catch (error) {
      next(error);
    }
  }
}

export const issueController = new IssueController();
