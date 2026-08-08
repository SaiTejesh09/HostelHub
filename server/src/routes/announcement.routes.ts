import { Router } from 'express';
import { announcementController } from '../controllers/announcement.controller';
import { authenticate, requirePermission } from '../middleware/auth';
import { validate } from '../middleware/validate';
import { createAnnouncementSchema, updateAnnouncementSchema } from '../validators/announcement.validator';

const router = Router();

// All routes require authentication
router.use(authenticate);

// ── Public (all authenticated users) ────────────────────────────────────
router.get('/', requirePermission('VIEW_ANNOUNCEMENTS'), (req, res, next) => announcementController.getAll(req, res, next));
router.get('/:id', requirePermission('VIEW_ANNOUNCEMENTS'), (req, res, next) => announcementController.getById(req, res, next));

// ── Management (committee/warden/admin) ─────────────────────────────────
router.get('/manage/all', requirePermission('CREATE_ANNOUNCEMENT'), (req, res, next) => announcementController.getAllForManagement(req, res, next));
router.post('/', requirePermission('CREATE_ANNOUNCEMENT'), validate(createAnnouncementSchema), (req, res, next) => announcementController.create(req, res, next));
router.put('/:id', requirePermission('CREATE_ANNOUNCEMENT'), validate(updateAnnouncementSchema), (req, res, next) => announcementController.update(req, res, next));
router.patch('/:id/pin', requirePermission('CREATE_ANNOUNCEMENT'), (req, res, next) => announcementController.togglePin(req, res, next));
router.delete('/:id', requirePermission('MANAGE_ANNOUNCEMENT'), (req, res, next) => announcementController.delete(req, res, next));

export default router;
