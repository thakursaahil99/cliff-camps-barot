import { Router } from 'express';
import bcrypt from 'bcryptjs';
import { db } from '../db/index.js';
import { requireAdmin, signAdminToken } from '../middleware/auth.js';
import { loginLimiter } from '../middleware/rateLimit.js';
import { validate } from '../middleware/validate.js';
import * as schemas from '../schemas.js';
import { syncAirbnbCalendar } from '../services/airbnbSync.js';
import { adminBookingAction, adminPaymentAction, publicBooking } from '../services/bookings.js';
import { addDays, eachNight } from '../utils/dates.js';
import { ah, badRequest, HttpError, notFound } from '../utils/http.js';
import { config } from '../config.js';

const r = Router();

// Unknown emails are still compared against a real hash, so response time doesn't reveal which emails exist
let dummyHash;
const getDummyHash = () => (dummyHash ||= bcrypt.hashSync('not-a-real-password', 10));

r.post('/login', loginLimiter, validate(schemas.loginBody), ah(async (req, res) => {
  const admin = await db().getAdminByEmail(req.body.email);
  const ok = await bcrypt.compare(req.body.password, admin?.password_hash || getDummyHash());
  if (!admin || !ok) throw new HttpError(401, 'Wrong email or password');
  res.json({ token: signAdminToken(admin), admin: { email: admin.email } });
}));

r.use(requireAdmin);

r.get('/me', (req, res) => res.json({ admin: { email: req.admin.email } }));

r.get('/settings', (_req, res) => {
  res.json({
    db: db().kind,
    calendarFeed: `${config.siteUrl}/api/calendar.ics`,
    airbnbSync: { configured: Boolean(config.airbnb.icalUrl), tentId: config.airbnb.tentId },
    booking: config.booking
  });
});

// ---------------------------------------------------------------- bookings
r.get('/bookings', validate(schemas.adminBookingsQuery, 'query'), ah(async (req, res) => {
  res.json({ bookings: await db().listBookings(req.validQuery) });
}));

r.get('/bookings/:id', validate(schemas.idParam, 'params'), ah(async (req, res) => {
  const booking = await db().getBooking(req.params.id);
  if (!booking) throw notFound('Booking not found');
  const payments = await db().listPayments({ booking_id: booking.id });
  res.json({ booking: { ...booking, ...(await publicBooking(booking, null, payments)), admin_notes: booking.admin_notes }, payments });
}));

r.patch('/bookings/:id', validate(schemas.idParam, 'params'), validate(schemas.bookingPatchBody), ah(async (req, res) => {
  res.json({ booking: await adminBookingAction(req.params.id, req.body) });
}));

// ---------------------------------------------------------------- payments
r.get('/payments', validate(schemas.paymentsQuery, 'query'), ah(async (req, res) => {
  res.json({ payments: await db().listPayments(req.validQuery) });
}));

r.patch('/payments/:id', validate(schemas.idParam, 'params'), validate(schemas.paymentPatchBody), ah(async (req, res) => {
  res.json({ booking: await adminPaymentAction(req.params.id, req.body) });
}));

r.get('/payments/:id/proof', validate(schemas.idParam, 'params'), ah(async (req, res) => {
  const payment = await db().getPayment(req.params.id);
  if (!payment?.proof_path) throw notFound('No screenshot for this payment');
  res.json({ url: await db().getProofUrl(payment.proof_path) });
}));

// ---------------------------------------------------------------- blocked dates
r.get('/blocked-dates', validate(schemas.blockedQuery, 'query'), ah(async (req, res) => {
  res.json({ blocked: await db().listBlocks(req.validQuery) });
}));

r.post('/blocked-dates', validate(schemas.blockedCreateBody), ah(async (req, res) => {
  const { tent_id = null, from, to, reason, units = null } = req.body;
  if (tent_id && !(await db().getTent(tent_id))) throw badRequest('Unknown tent');
  if (units && !tent_id) throw badRequest('Choose a tent type when blocking a number of tents');
  const rows = eachNight(from, addDays(to, 1)).map((date) => ({ tent_id, date, units, reason: reason || 'Blocked by admin', source: 'manual' }));
  res.status(201).json({ blocked: await db().addBlocks(rows) });
}));

r.delete('/blocked-dates/:id', validate(schemas.idParam, 'params'), ah(async (req, res) => {
  if (!(await db().deleteBlock(req.params.id))) throw notFound('Blocked date not found');
  res.status(204).end();
}));

r.post('/sync-airbnb', ah(async (_req, res) => {
  res.json(await syncAirbnbCalendar());
}));

// ---------------------------------------------------------------- tents (prices & availability)
r.get('/tents', ah(async (_req, res) => {
  res.json({ tents: await db().listTents({ includeInactive: true }) });
}));

r.post('/tents', validate(schemas.tentCreateBody), ah(async (req, res) => {
  res.status(201).json({ tent: await db().createTent(req.body) });
}));

r.patch('/tents/:id', validate(schemas.idParam, 'params'), validate(schemas.tentPatchBody), ah(async (req, res) => {
  const tent = await db().updateTent(req.params.id, req.body);
  if (!tent) throw notFound('Tent not found');
  res.json({ tent });
}));

export default r;
