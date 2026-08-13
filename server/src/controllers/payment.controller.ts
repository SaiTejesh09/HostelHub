import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { paymentService } from '../services/payment.service';
import { AuthRequest } from '../middleware/auth';
import { createError } from '../middleware/errorHandler';
import { logger } from '../utils/logger';
import { v4 as uuidv4 } from 'uuid';

const prisma = new PrismaClient();

export const paymentController = {
  // Fetch invoices for the logged-in student
  getMyInvoices: async (req: AuthRequest, res: Response) => {
    try {
      const invoices = await prisma.invoice.findMany({
        where: { userId: req.user!.userId },
        orderBy: { createdAt: 'desc' },
        include: {
          payments: {
            orderBy: { createdAt: 'desc' }
          }
        }
      });
      res.json({ success: true, data: invoices });
    } catch (error) {
      logger.error('Error fetching invoices:', error);
      res.status(500).json({ success: false, message: 'Server error' });
    }
  },

  // Initiate Razorpay order for an invoice
  initiatePayment: async (req: AuthRequest, res: Response) => {
    try {
      const invoiceId = req.params.id as string;
      const userId = req.user!.userId;

      // Ensure invoice belongs to user and is not paid
      const invoice = await prisma.invoice.findFirst({
        where: { id: invoiceId, userId }
      });

      if (!invoice) throw createError('Invoice not found', 404);
      if (invoice.status === 'PAID') throw createError('Invoice is already paid', 400);
      if (invoice.status === 'CANCELLED') throw createError('Invoice is cancelled', 400);

      // Create a pending Payment record
      const transactionId = `txn_${uuidv4().replace(/-/g, '')}`;
      
      const payment = await prisma.payment.create({
        data: {
          invoiceId,
          userId,
          amount: invoice.amount,
          method: 'RAZORPAY',
          status: 'PENDING',
          transactionId
        }
      });

      // Create order via Razorpay service
      const order = await paymentService.createOrder(invoice.amount, transactionId);

      // Update payment with Razorpay order ID
      await prisma.payment.update({
        where: { id: payment.id },
        data: { razorpayOrderId: order.id }
      });

      res.json({
        success: true,
        data: {
          paymentId: payment.id,
          orderId: order.id,
          amount: order.amount,
          currency: order.currency
        }
      });
    } catch (error: any) {
      logger.error('Error initiating payment:', error);
      res.status(error.statusCode || 500).json({ success: false, message: error.message || 'Server error' });
    }
  },

  // Verify Razorpay signature after frontend completes checkout
  verifyPayment: async (req: AuthRequest, res: Response) => {
    try {
      const { razorpay_order_id, razorpay_payment_id, razorpay_signature } = req.body;

      if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
        throw createError('Missing required payment parameters', 400);
      }

      // Verify signature
      const isValid = paymentService.verifyPayment(
        razorpay_order_id,
        razorpay_payment_id,
        razorpay_signature
      );

      if (!isValid) {
        // Log failure and update DB if possible
        const payment = await prisma.payment.findUnique({ where: { razorpayOrderId: razorpay_order_id } });
        if (payment) {
          await prisma.payment.update({
            where: { id: payment.id },
            data: { status: 'FAILED' }
          });
        }
        throw createError('Invalid payment signature', 400);
      }

      // Transaction to safely mark invoice and payment as success
      const result = await prisma.$transaction(async (tx) => {
        const payment = await tx.payment.findUnique({
          where: { razorpayOrderId: razorpay_order_id },
          include: { invoice: true }
        });

        if (!payment) throw createError('Payment record not found', 404);
        if (payment.status === 'SUCCESS') throw createError('Payment already verified', 400);

        // Update payment status
        const updatedPayment = await tx.payment.update({
          where: { id: payment.id },
          data: {
            status: 'SUCCESS',
            razorpayPaymentId: razorpay_payment_id,
            razorpaySignature: razorpay_signature
          }
        });

        // Update invoice status
        const updatedInvoice = await tx.invoice.update({
          where: { id: payment.invoiceId },
          data: { status: 'PAID' }
        });

        return { invoice: updatedInvoice, payment: updatedPayment };
      });

      res.json({ success: true, data: result });
    } catch (error: any) {
      logger.error('Error verifying payment:', error);
      res.status(error.statusCode || 500).json({ success: false, message: error.message || 'Server error' });
    }
  }
};
