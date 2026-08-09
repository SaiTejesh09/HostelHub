import { Response, NextFunction } from 'express';
import { roomService } from '../services/room.service';
import type { AuthRequest } from '../middleware/auth';

export class RoomController {

  async createRoom(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      // Expecting { blockId, roomNumber, floor, capacity, type, amenities }
      const room = await roomService.createRoom(req.body);
      res.status(201).json({ success: true, data: room });
    } catch (error) {
      next(error);
    }
  }

  async getRooms(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const filters = {
        page: req.query.page ? parseInt(req.query.page as string) : 1,
        limit: req.query.limit ? parseInt(req.query.limit as string) : 10,
        blockId: req.query.blockId as string,
        floor: req.query.floor ? parseInt(req.query.floor as string) : undefined,
        availableOnly: req.query.availableOnly === 'true',
        type: req.query.type as string,
      };

      const result = await roomService.getRooms(filters);
      res.status(200).json({ success: true, ...result });
    } catch (error) {
      next(error);
    }
  }

  async getRoomById(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const room = await roomService.getRoomById(req.params.id as string);
      res.status(200).json({ success: true, data: room });
    } catch (error) {
      next(error);
    }
  }

  async updateRoom(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const updated = await roomService.updateRoom(req.params.id as string, req.body);
      res.status(200).json({ success: true, data: updated });
    } catch (error) {
      next(error);
    }
  }

  async allocateStudent(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const { roomId, studentProfileId } = req.body;
      const allocation = await roomService.allocateStudent(roomId, studentProfileId);
      res.status(200).json({ success: true, data: allocation });
    } catch (error) {
      next(error);
    }
  }

  async vacateStudent(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const { studentProfileId } = req.body;
      const result = await roomService.vacateStudent(studentProfileId);
      res.status(200).json({ success: true, data: result });
    } catch (error) {
      next(error);
    }
  }
}

export const roomController = new RoomController();
