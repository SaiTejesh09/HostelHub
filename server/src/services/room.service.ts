import prisma from '../config/database';
import { createError } from '../middleware/errorHandler';
import { getPaginationParams, buildPaginatedResponse } from '../utils/pagination';
import { logger } from '../utils/logger';

export type RoomType = 'SINGLE' | 'DOUBLE' | 'TRIPLE' | 'DORMITORY';

interface CreateRoomData {
  blockId: string;
  roomNumber: string;
  floor: number;
  capacity?: number;
  type?: RoomType;
  amenities?: string[];
}

interface UpdateRoomData {
  roomNumber?: string;
  floor?: number;
  capacity?: number;
  type?: RoomType;
  isAvailable?: boolean;
  amenities?: string[];
}

interface RoomFilters {
  page?: number;
  limit?: number;
  blockId?: string;
  floor?: number;
  availableOnly?: boolean;
  type?: string;
}

export class RoomService {

  // ── Create room (ADMIN/WARDEN) ──────────────────────────────────────────
  async createRoom(data: CreateRoomData) {
    const block = await prisma.hostelBlock.findUnique({ where: { id: data.blockId } });
    if (!block) throw createError('Hostel block not found', 404);

    const existing = await prisma.room.findUnique({
      where: { blockId_roomNumber: { blockId: data.blockId, roomNumber: data.roomNumber } },
    });
    if (existing) throw createError('Room number already exists in this block', 400);

    const room = await prisma.room.create({
      data: {
        blockId: data.blockId,
        roomNumber: data.roomNumber,
        floor: data.floor,
        capacity: data.capacity || (data.type === 'SINGLE' ? 1 : data.type === 'TRIPLE' ? 3 : data.type === 'DORMITORY' ? 4 : 2),
        type: (data.type as RoomType) || 'DOUBLE',
        amenities: data.amenities || ['Bed', 'Study Desk', 'Wardrobe'],
      },
      include: { block: { select: { id: true, name: true } } },
    });

    logger.info(`Room created: ${room.roomNumber} in block ${block.name}`);
    return room;
  }

  // ── Get all rooms (with filters & pagination) ───────────────────────────
  async getRooms(filters: RoomFilters) {
    const { page, limit, skip } = getPaginationParams(filters);

    const where: Record<string, unknown> = {};
    if (filters.blockId) where.blockId = filters.blockId;
    if (filters.floor !== undefined) where.floor = filters.floor;
    if (filters.availableOnly) where.isAvailable = true;
    if (filters.type) where.type = filters.type;

    const [data, total] = await Promise.all([
      prisma.room.findMany({
        where,
        skip,
        take: limit,
        orderBy: [{ blockId: 'asc' }, { roomNumber: 'asc' }],
        include: {
          block: { select: { id: true, name: true } },
          allocations: {
            where: { isActive: true },
            include: {
              student: {
                select: { id: true, name: true, rollNumber: true, department: true, year: true, phone: true },
              },
            },
          },
        },
      }),
      prisma.room.count({ where }),
    ]);

    return buildPaginatedResponse(data, total, page, limit);
  }

  // ── Get single room with occupants ─────────────────────────────────────
  async getRoomById(id: string) {
    const room = await prisma.room.findUnique({
      where: { id },
      include: {
        block: true,
        allocations: {
          where: { isActive: true },
          include: {
            student: {
              include: { user: { select: { email: true } } },
            },
          },
        },
      },
    });

    if (!room) throw createError('Room not found', 404);
    return room;
  }

  // ── Update room ────────────────────────────────────────────────────────
  async updateRoom(id: string, data: UpdateRoomData) {
    const room = await prisma.room.findUnique({ where: { id } });
    if (!room) throw createError('Room not found', 404);

    const updated = await prisma.room.update({
      where: { id },
      data: {
        ...(data.roomNumber !== undefined && { roomNumber: data.roomNumber }),
        ...(data.floor !== undefined && { floor: data.floor }),
        ...(data.capacity !== undefined && { capacity: data.capacity }),
        ...(data.type !== undefined && { type: data.type }),
        ...(data.isAvailable !== undefined && { isAvailable: data.isAvailable }),
        ...(data.amenities !== undefined && { amenities: data.amenities }),
      },
    });

    return updated;
  }

  // ── Allocate student to room (ACID transaction) ────────────────────────
  async allocateStudent(roomId: string, studentProfileId: string) {
    return prisma.$transaction(async (tx) => {
      const room = await tx.room.findUnique({
        where: { id: roomId },
        include: { block: true },
      });
      if (!room) throw createError('Room not found', 404);
      if (!room.isAvailable || room.currentOccupancy >= room.capacity) {
        throw createError('Room is full or unavailable', 400);
      }

      const student = await tx.studentProfile.findUnique({ where: { id: studentProfileId } });
      if (!student) throw createError('Student profile not found', 404);

      // Check if student already has an active allocation and vacate previous room correctly
      const previousAllocation = await tx.roomAllocation.findFirst({
        where: { studentProfileId, isActive: true },
        include: { room: true },
      });

      if (previousAllocation) {
        // Deactivate previous allocation
        await tx.roomAllocation.update({
          where: { id: previousAllocation.id },
          data: { isActive: false, vacatedAt: new Date() },
        });

        // Decrement previous room occupancy
        const prevRoom = previousAllocation.room;
        const prevNewOccupancy = Math.max(0, prevRoom.currentOccupancy - 1);
        await tx.room.update({
          where: { id: prevRoom.id },
          data: {
            currentOccupancy: prevNewOccupancy,
            isAvailable: true,
          },
        });

        // Decrement previous block occupancy
        await tx.hostelBlock.update({
          where: { id: prevRoom.blockId },
          data: { currentOccupancy: { decrement: 1 } },
        });
      }

      // Create new allocation
      const allocation = await tx.roomAllocation.create({
        data: {
          roomId,
          studentProfileId,
          isActive: true,
        },
      });

      // Update new room occupancy & student profile
      const newOccupancy = room.currentOccupancy + 1;
      await tx.room.update({
        where: { id: roomId },
        data: {
          currentOccupancy: newOccupancy,
          isAvailable: newOccupancy < room.capacity,
        },
      });

      await tx.studentProfile.update({
        where: { id: studentProfileId },
        data: { blockId: room.blockId, roomNumber: room.roomNumber },
      });

      // Update new block occupancy
      await tx.hostelBlock.update({
        where: { id: room.blockId },
        data: { currentOccupancy: { increment: 1 } },
      });

      logger.info(`Student ${student.rollNumber} allocated to Room ${room.roomNumber}`);
      return allocation;
    });
  }

  // ── Vacate student from room ───────────────────────────────────────────
  async vacateStudent(studentProfileId: string) {
    return prisma.$transaction(async (tx) => {
      const activeAllocation = await tx.roomAllocation.findFirst({
        where: { studentProfileId, isActive: true },
        include: { room: true },
      });

      if (!activeAllocation) throw createError('No active room allocation found for student', 404);

      // Deactivate allocation
      await tx.roomAllocation.update({
        where: { id: activeAllocation.id },
        data: { isActive: false, vacatedAt: new Date() },
      });

      // Decrement room & block occupancy
      const room = activeAllocation.room;
      const newOccupancy = Math.max(0, room.currentOccupancy - 1);
      await tx.room.update({
        where: { id: room.id },
        data: {
          currentOccupancy: newOccupancy,
          isAvailable: true,
        },
      });

      await tx.hostelBlock.update({
        where: { id: room.blockId },
        data: { currentOccupancy: { decrement: 1 } },
      });

      await tx.studentProfile.update({
        where: { id: studentProfileId },
        data: { roomNumber: null },
      });

      logger.info(`Student vacated from Room ${room.roomNumber}`);
      return { message: 'Student vacated successfully' };
    });
  }
}

export const roomService = new RoomService();
