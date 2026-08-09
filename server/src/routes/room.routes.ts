import { Router } from 'express';
import { roomController } from '../controllers/room.controller';
import { authenticate, requirePermission } from '../middleware/auth';

const router = Router();

router.use(authenticate);

// Get all rooms (with filters) - open to all authenticated users for viewing
router.get('/', roomController.getRooms.bind(roomController));

// Get single room details
router.get('/:id', roomController.getRoomById.bind(roomController));

// Admin/Warden only: create room
router.post('/', requirePermission('MANAGE_BLOCKS'), roomController.createRoom.bind(roomController));

// Admin/Warden only: update room
router.patch('/:id', requirePermission('MANAGE_BLOCKS'), roomController.updateRoom.bind(roomController));

// Admin/Warden only: allocate student to room
router.post('/allocate', requirePermission('MANAGE_BLOCKS'), roomController.allocateStudent.bind(roomController));

// Admin/Warden only: vacate student from room
router.post('/vacate', requirePermission('MANAGE_BLOCKS'), roomController.vacateStudent.bind(roomController));

export default router;
