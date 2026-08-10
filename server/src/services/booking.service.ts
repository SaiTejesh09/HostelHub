import prisma from '../config/database';
import { createError } from '../middleware/errorHandler';
import { getPaginationParams, buildPaginatedResponse } from '../utils/pagination';
import { logger } from '../utils/logger';

export type BookingStatusType = 'PENDING' | 'APPROVED' | 'REJECTED' | 'CANCELLED';

interface CreateBookingData {
  studentProfileId: string;
  roomId: string;
  notes?: string;
}

interface BookingFilters {
  page?: number;
  limit?: number;
  studentProfileId?: string;
  roomId?: string;
  status?: BookingStatusType;
}

interface ReviewBookingData {
  reviewerUserId: string;
  status: 'APPROVED' | 'REJECTED';
  notes?: string;
}

export class BookingService {
  // ── Create a new room booking request (STUDENT) ─────────────────────────
  async createBooking(data: CreateBookingData) {
    const student = await prisma.studentProfile.findUnique({
      where: { id: data.studentProfileId },
    });
    if (!student) throw createError('Student profile not found', 404);

    const room = await prisma.room.findUnique({
      where: { id: data.roomId },
      include: { block: true },
    });
    if (!room) throw createError('Room not found', 404);
    if (!room.isAvailable || room.currentOccupancy >= room.capacity) {
      throw createError('Room is full or unavailable', 400);
    }

    // Check if student already has a pending booking
    const existingPending = await prisma.roomBooking.findFirst({
      where: {
        studentProfileId: data.studentProfileId,
        status: 'PENDING',
      },
    });
    if (existingPending) {
      throw createError('You already have a pending room booking request', 400);
    }

    const booking = await prisma.roomBooking.create({
      data: {
        studentProfileId: data.studentProfileId,
        roomId: data.roomId,
        notes: data.notes,
        status: 'PENDING',
      },
      include: {
        room: {
          include: { block: { select: { id: true, name: true } } },
        },
        student: {
          select: { id: true, name: true, rollNumber: true, department: true },
        },
      },
    });

    logger.info(`Booking created by student ${student.rollNumber} for room ${room.roomNumber}`);
    return booking;
  }

  // ── Get bookings (with filters & pagination) ──────────────────────────────
  async getBookings(filters: BookingFilters) {
    const { page, limit, skip } = getPaginationParams(filters);

    const where: Record<string, unknown> = {};
    if (filters.studentProfileId) where.studentProfileId = filters.studentProfileId;
    if (filters.roomId) where.roomId = filters.roomId;
    if (filters.status) where.status = filters.status;

    const [data, total] = await Promise.all([
      prisma.roomBooking.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          room: {
            include: { block: { select: { id: true, name: true } } },
          },
          student: {
            select: { id: true, name: true, rollNumber: true, department: true, phone: true },
          },
        },
      }),
      prisma.roomBooking.count({ where }),
    ]);

    return buildPaginatedResponse(data, total, page, limit);
  }

  // ── Get single booking by ID ─────────────────────────────────────────────
  async getBookingById(id: string) {
    const booking = await prisma.roomBooking.findUnique({
      where: { id },
      include: {
        room: { include: { block: true } },
        student: {
          include: { user: { select: { email: true } } },
        },
      },
    });

    if (!booking) throw createError('Booking request not found', 404);
    return booking;
  }

  // ── Review booking request (WARDEN / ADMIN) ─────────────────────────────
  async reviewBooking(bookingId: string, reviewData: ReviewBookingData) {
    return prisma.$transaction(async (tx) => {
      const booking = await tx.roomBooking.findUnique({
        where: { id: bookingId },
        include: { room: true, student: true },
      });

      if (!booking) throw createError('Booking request not found', 404);
      if (booking.status !== 'PENDING') {
        throw createError(`Booking request has already been ${booking.status.toLowerCase()}`, 400);
      }

      if (reviewData.status === 'APPROVED') {
        const room = booking.room;
        if (!room.isAvailable || room.currentOccupancy >= room.capacity) {
          throw createError('Room is no longer available for allocation', 400);
        }

        // Vacate any previous active room allocation for student
        const previousAllocation = await tx.roomAllocation.findFirst({
          where: { studentProfileId: booking.studentProfileId, isActive: true },
          include: { room: true },
        });

        if (previousAllocation) {
          await tx.roomAllocation.update({
            where: { id: previousAllocation.id },
            data: { isActive: false, vacatedAt: new Date() },
          });

          const prevRoom = previousAllocation.room;
          await tx.room.update({
            where: { id: prevRoom.id },
            data: {
              currentOccupancy: Math.max(0, prevRoom.currentOccupancy - 1),
              isAvailable: true,
            },
          });

          await tx.hostelBlock.update({
            where: { id: prevRoom.blockId },
            data: { currentOccupancy: { decrement: 1 } },
          });
        }

        // Allocate room to student
        await tx.roomAllocation.create({
          data: {
            roomId: room.id,
            studentProfileId: booking.studentProfileId,
            isActive: true,
          },
        });

        // Update room & student profile
        const newOccupancy = room.currentOccupancy + 1;
        await tx.room.update({
          where: { id: room.id },
          data: {
            currentOccupancy: newOccupancy,
            isAvailable: newOccupancy < room.capacity,
          },
        });

        await tx.studentProfile.update({
          where: { id: booking.studentProfileId },
          data: { blockId: room.blockId, roomNumber: room.roomNumber },
        });

        await tx.hostelBlock.update({
          where: { id: room.blockId },
          data: { currentOccupancy: { increment: 1 } },
        });
      }

      // Update booking status
      const updatedBooking = await tx.roomBooking.update({
        where: { id: bookingId },
        data: {
          status: reviewData.status,
          reviewedBy: reviewData.reviewerUserId,
          reviewedAt: new Date(),
          ...(reviewData.notes && { notes: reviewData.notes }),
        },
        include: {
          room: true,
          student: true,
        },
      });

      logger.info(
        `Booking ${bookingId} ${reviewData.status} by reviewer ${reviewData.reviewerUserId}`
      );
      return updatedBooking;
    });
  }

  // ── Cancel booking (STUDENT) ─────────────────────────────────────────────
  async cancelBooking(bookingId: string, studentProfileId: string) {
    const booking = await prisma.roomBooking.findUnique({
      where: { id: bookingId },
    });

    if (!booking) throw createError('Booking request not found', 404);
    if (booking.studentProfileId !== studentProfileId) {
      throw createError('You can only cancel your own booking requests', 403);
    }
    if (booking.status !== 'PENDING') {
      throw createError('Only pending booking requests can be cancelled', 400);
    }

    const cancelled = await prisma.roomBooking.update({
      where: { id: bookingId },
      data: { status: 'CANCELLED' },
    });

    logger.info(`Booking ${bookingId} cancelled by student ${studentProfileId}`);
    return cancelled;
  }
}

export const bookingService = new BookingService();
