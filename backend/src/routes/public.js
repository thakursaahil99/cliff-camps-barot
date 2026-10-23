import { Router } from 'express';
import { config } from '../config.js';
import { db } from '../db/index.js';
import { validate } from '../middleware/validate.js';
import { bookingLimiter, paymentLimiter } from '../middleware/rateLimit.js';
import { publicPaymentConfig, getProvider } from '../payments/index.js';
import * as schemas from '../schemas.js';
import { ah, HttpError, notFound } from '../utils/http.js';
import { verifyBookingToken } from '../utils/tokens.js';
import {
  createBooking, createGatewayOrder, exportCalendar, getUnavailable, markGatewayPaymentCaptured, publicBooking, submitUpiProof, upiDetails
} from '../services/bookings.js';

const r = Router();

/** Health check + keep-alive: runs one real DB query so the free Supabase project never pauses. */
r.get('/health', ah(async (_req, res) => {
  const result = await db().ping();
  res.set('Cache-Control', 'no-store').json({ status: 'ok', db: db().kind, ...result, time: new Date().toISOString() });
}));

r.get('/config', (_req, res) => {
  res.set('Cache-Control', 'public, max-age=300').json({
    business: config.business,
    booking: {
      currency: config.booking.currency,
      advancePercent: config.booking.advancePercent,
      taxPercent: config.booking.taxPercent,
      holdHours: config.booking.holdHours,
      maxNights: config.booking.maxNights,
      maxMonthsAhead: config.booking.maxMonthsAhead
    },
    payments: publicPaymentConfig()
  });
});

r.get('/tents', ah(async (_req, res) => {
  const tents = await db().listTents();
  res.set('Cache-Control', 'public, max-age=60').json({ tents });
}));

r.get('/availability', validate(schemas.availabilityQuery, 'query'), ah(async (req, res) => {
  const { tent_id, from, to } = req.validQuery;
  const unavailable = await getUnavailable({ tentId: tent_id, from, to });
  res.set('Cache-Control', 'no-store').json({ tent_id: tent_id || null, from, to, unavailable });
}));

r.post('/bookings', bookingLimiter, validate(schemas.createBookingBody), ah(async (req, res) => {
  const result = await createBooking(req.body);
  res.status(201).json(result);
}));

/** Loads a booking for the guest, after checking the token from their booking link. */
async function guestBooking(req) {
  const token = req.body?.t || req.query.t || req.headers['x-booking-token'];
  const parsed = schemas.idParam.safeParse(req.params);
  if (!parsed.success || !verifyBookingToken(parsed.data.id, token)) throw notFound('Booking not found');
  const booking = await db().getBooking(parsed.data.id);
  if (!booking) throw notFound('Booking not found');
  return booking;
}

r.get('/bookings/:id', ah(async (req, res) => {
  const booking = await guestBooking(req);
  res.set('Cache-Control', 'no-store').json({ booking: await publicBooking(booking), upi: await upiDetails(booking), payments: publicPaymentConfig() });
}));

r.post('/bookings/:id/payments/upi', paymentLimiter, validate(schemas.upiProofBody), ah(async (req, res) => {
  const booking = await guestBooking(req);
  res.status(201).json({ booking: await submitUpiProof(booking, req.body) });
}));

r.post('/bookings/:id/payments/order', paymentLimiter, validate(schemas.gatewayOrderBody), ah(async (req, res) => {
  const booking = await guestBooking(req);
  res.status(201).json({ order: await createGatewayOrder(booking, req.body) });
}));

/** Razorpay Checkout success handler -> verify signature server-side before trusting anything. */
r.post('/bookings/:id/payments/razorpay/verify', paymentLimiter, validate(schemas.razorpayVerifyBody), ah(async (req, res) => {
  const booking = await guestBooking(req);
  const rzp = getProvider('razorpay');
  if (!rzp.verifyClientCallback(req.body)) throw new HttpError(400, 'Payment signature verification failed');
  const payment = await db().findPaymentByOrderId(req.body.razorpay_order_id);
  if (!payment || payment.booking_id !== booking.id) throw notFound('Payment not found');
  await markGatewayPaymentCaptured({ orderId: req.body.razorpay_order_id, paymentId: req.body.razorpay_payment_id, via: 'checkout' });
  res.json({ booking: await publicBooking(await db().getBooking(booking.id)) });
}));

/** iCal feed of our bookings - paste this URL into Airbnb (Calendar -> Availability -> Connect calendars). */
r.get('/calendar.ics', ah(async (_req, res) => {
  res.set({ 'Content-Type': 'text/calendar; charset=utf-8', 'Cache-Control': 'no-store', 'Content-Disposition': 'inline; filename="cliff-camps.ics"' });
  res.send(await exportCalendar());
}));

export default r;
