import { Router } from 'express';
import { paymentController } from '../controllers/payment.controller';
import { authenticate } from '../middleware/auth';

const router = Router();

// All payment routes require authentication
router.use(authenticate);

// Get student's invoices
router.get('/invoices', paymentController.getMyInvoices);

// Initiate payment for a specific invoice
router.post('/invoices/:id/pay', paymentController.initiatePayment);

// Verify Razorpay payment
router.post('/verify', paymentController.verifyPayment);

export default router;
