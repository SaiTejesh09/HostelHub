import { Router } from 'express';
import { bookingController } from '../controllers/booking.controller';
import { authenticate, requirePermission } from '../middleware/auth';

const router = Router();

router.use(authenticate);

// Get bookings (filtered by student/room/status)
router.get('/', bookingController.getBookings.bind(bookingController));
// My bookings alias for student
router.get('/my', bookingController.getBookings.bind(bookingController));

// Get single booking by ID
router.get('/:id', bookingController.getBookingById.bind(bookingController));

// Student: create a new room booking request
router.post('/', bookingController.createBooking.bind(bookingController));

// Student: cancel own pending booking
router.patch('/:id/cancel', bookingController.cancelBooking.bind(bookingController));

// Warden / Admin only: review (approve/reject) room booking request
router.patch('/:id/review', requirePermission('MANAGE_BLOCKS'), bookingController.reviewBooking.bind(bookingController));

export default router;
