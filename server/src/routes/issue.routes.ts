import { Router } from 'express';
import { issueController } from '../controllers/issue.controller';
import { authenticate, authorize } from '../middleware/auth';

const router = Router();

// Apply authentication to all routes
router.use(authenticate);

// List/Stats and Create
router.get('/', issueController.getAll);
router.post('/', issueController.create);
router.get('/stats', issueController.getStats);

// Single issue operations
router.get('/:id', issueController.getById);
router.post('/:id/responses', issueController.addResponse);

// Warden/Admin only routes
router.patch('/:id/status', authorize('WARDEN', 'ADMIN'), issueController.updateStatus);

export default router;
