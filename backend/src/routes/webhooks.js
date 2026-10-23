import { Router } from 'express';
import express from 'express';
import { getProvider } from '../payments/index.js';
import { markGatewayPaymentCaptured } from '../services/bookings.js';
import { ah, HttpError } from '../utils/http.js';

const r = Router();

/** Raw body as a Buffer, also when serverless-http has already buffered it. */
function rawBody(req) {
  if (Buffer.isBuffer(req.body)) return req.body;
  if (typeof req.body === 'string') return Buffer.from(req.body);
  if (Buffer.isBuffer(req.rawBody)) return req.rawBody;
  return Buffer.alloc(0);
}

r.post('/razorpay', express.raw({ type: '*/*', limit: '1mb' }), ah(async (req, res) => {
  const rzp = getProvider('razorpay');
  const event = rzp.parseWebhook(rawBody(req), req.headers);
  if (!event) throw new HttpError(400, 'Invalid webhook signature');
  if (event.event === 'payment.captured' && event.orderId) {
    try {
      await markGatewayPaymentCaptured({ orderId: event.orderId, paymentId: event.paymentId, amount: event.amount, via: 'webhook' });
    } catch (err) {
      // Orders not created by this site (or already handled) must not make Razorpay retry forever
      if (err.status !== 404) throw err;
    }
  }
  res.json({ received: true });
}));

export default r;
