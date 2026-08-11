import { Response, NextFunction } from 'express';
import { bookingService, BookingStatusType } from '../services/booking.service';
import type { AuthRequest } from '../middleware/auth';

export class BookingController {
  // ── Create a booking request ─────────────────────────────────────────────
  async createBooking(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const { studentProfileId, roomId, notes } = req.body;
      const booking = await bookingService.createBooking({
        studentProfileId,
        roomId,
        notes,
      });
      res.status(201).json({ success: true, data: booking });
    } catch (error) {
      next(error);
    }
  }

  // ── Get list of bookings (paginated & filtered) ─────────────────────────
  async getBookings(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const filters = {
        page: req.query.page ? parseInt(req.query.page as string) : 1,
        limit: req.query.limit ? parseInt(req.query.limit as string) : 10,
        studentProfileId: req.query.studentProfileId as string,
        roomId: req.query.roomId as string,
        status: req.query.status as BookingStatusType,
      };

      const result = await bookingService.getBookings(filters);
      res.status(200).json({ success: true, ...result });
    } catch (error) {
      next(error);
    }
  }

  // ── Get single booking details ───────────────────────────────────────────
  async getBookingById(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const booking = await bookingService.getBookingById(req.params.id as string);
      res.status(200).json({ success: true, data: booking });
    } catch (error) {
      next(error);
    }
  }

  // ── Review booking request (WARDEN / ADMIN) ──────────────────────────────
  async reviewBooking(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const bookingId = req.params.id as string;
      const { status, notes } = req.body;
      const reviewerUserId = req.user?.userId || '';

      const updated = await bookingService.reviewBooking(bookingId, {
        reviewerUserId,
        status,
        notes,
      });

      res.status(200).json({ success: true, data: updated });
    } catch (error) {
      next(error);
    }
  }

  // ── Cancel pending booking (STUDENT) ─────────────────────────────────────
  async cancelBooking(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const bookingId = req.params.id as string;
      const { studentProfileId } = req.body;

      const cancelled = await bookingService.cancelBooking(bookingId, studentProfileId);
      res.status(200).json({ success: true, data: cancelled });
    } catch (error) {
      next(error);
    }
  }
}

export const bookingController = new BookingController();
