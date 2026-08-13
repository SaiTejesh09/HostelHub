import Razorpay from 'razorpay';
import crypto from 'crypto';
import { env } from '../config/env';

class PaymentService {
  private razorpay: any;

  constructor() {
    if (env.RAZORPAY_KEY_ID && env.RAZORPAY_KEY_SECRET) {
      this.razorpay = new Razorpay({
        key_id: env.RAZORPAY_KEY_ID,
        key_secret: env.RAZORPAY_KEY_SECRET,
      });
    } else {
      console.warn('Razorpay keys not configured in environment variables');
    }
  }

  async createOrder(amount: number, receiptId: string) {
    if (!this.razorpay) throw new Error('Razorpay is not configured');

    const options = {
      amount: Math.round(amount * 100), // amount in the smallest currency unit (paise)
      currency: 'INR',
      receipt: receiptId,
    };

    return this.razorpay.orders.create(options);
  }

  verifyPayment(orderId: string, paymentId: string, signature: string): boolean {
    if (!env.RAZORPAY_KEY_SECRET) return false;
    
    const body = orderId + '|' + paymentId;
    const expectedSignature = crypto
      .createHmac('sha256', env.RAZORPAY_KEY_SECRET)
      .update(body.toString())
      .digest('hex');

    return expectedSignature === signature;
  }
}

export const paymentService = new PaymentService();
