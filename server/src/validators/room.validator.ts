import { z } from 'zod';

export const createRoomSchema = z.object({
  blockId: z.string().uuid('Invalid block ID'),
  roomNumber: z.string().min(1, 'Room number is required').max(20),
  floor: z.number().int().min(0, 'Floor must be 0 or higher'),
  capacity: z.number().int().min(1).max(10).optional(),
  type: z.enum(['SINGLE', 'DOUBLE', 'TRIPLE', 'DORMITORY']).optional(),
  amenities: z.array(z.string()).optional(),
});

export const updateRoomSchema = z.object({
  roomNumber: z.string().min(1).max(20).optional(),
  floor: z.number().int().min(0).optional(),
  capacity: z.number().int().min(1).max(10).optional(),
  type: z.enum(['SINGLE', 'DOUBLE', 'TRIPLE', 'DORMITORY']).optional(),
  isAvailable: z.boolean().optional(),
  amenities: z.array(z.string()).optional(),
});

export const allocateRoomSchema = z.object({
  studentProfileId: z.string().uuid('Invalid student profile ID'),
});
