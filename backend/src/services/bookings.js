import { config } from '../config.js';
import { db } from '../db/index.js';
import { getProvider } from '../payments/index.js';
import { addMonths, eachNight, nightsBetween, todayIST } from '../utils/dates.js';
import { badRequest, conflict, HttpError, notFound } from '../utils/http.js';
import { bookingCode, bookingToken } from '../utils/tokens.js';
import { holdsInventory, unavailableNights } from './availability.js';
import { buildIcs, toRanges } from './ical.js';
import { sendMail } from './mailer.js';
import { adminNewBookingEmail, adminPaymentSubmittedEmail, bookingLink, guestCancelledEmail, guestRequestEmail, receiptEmail } from './emails.js';
import { balanceDue, inr, quote } from './pricing.js';

const PAID = ['verified', 'captured'];
const money = (n) => Math.round(Number(n) * 100) / 100;

// ------------------------------------------------------------------ availability

/** Nights in [from, to) that can't be booked: for one tent type, or (no tent) nights when every tent is full. */
export async function getUnavailable({ tentId, from, to }) {
  const store = db();
  if (tentId) {
    const tent = await store.getTent(tentId);
    if (!tent || !tent.active) throw notFound('Tent not found');
    const { bookings, blocks } = await store.getStayData(from, to, tentId);
    return unavailableNights(tent, from, to, bookings, blocks);
  }
  const tents = await store.listTents();
  if (!tents.length) return [];
  const { bookings, blocks } = await store.getStayData(from, to);
  const sets = tents.map((t) => new Set(unavailableNights(t, from, to, bookings, blocks)));
  return [...sets[0]].filter((d) => sets.every((s) => s.has(d))).sort();
}

/** Can this existing booking still be honoured? (Its hold may have expired and the tent been re-sold.) */
export async function stillAvailable(booking) {
  const store = db();
  const tent = await store.getTent(booking.tent_id);
  if (!tent) return false;
  const { bookings, blocks } = await store.getStayData(booking.check_in, booking.check_out, tent.id);
  return unavailableNights(tent, booking.check_in, booking.check_out, bookings, blocks, { excludeBookingId: booking.id }).length === 0;
}

function validateStay(checkIn, checkOut) {
  const today = todayIST();
  const nights = nightsBetween(checkIn, checkOut);
  if (checkIn < today) throw badRequest('Check-in date is in the past');
  if (nights < 1) throw badRequest('Check-out must be after check-in');
  if (nights > config.booking.maxNights) throw badRequest(`Maximum stay is ${config.booking.maxNights} nights`);
  if (checkIn > addMonths(today, config.booking.maxMonthsAhead)) throw badRequest(`Bookings open up to ${config.booking.maxMonthsAhead} months ahead`);
}

// ------------------------------------------------------------------ guest-facing

export function whatsappLink(b, tent) {
  const advanceDue = Math.max(0, Number(b.advance_amount) - Number(b.amount_paid || 0));
  const text = [
    `Hi Cliff Camps! I'd like to book a tent.`,
    `Ref: ${b.code}`,
    `Tent: ${tent?.name || ''}`,
    `Dates: ${b.check_in} to ${b.check_out} (${b.nights} night${b.nights > 1 ? 's' : ''})`,
    `Guests: ${b.guests}`,
    `Total: ${inr(b.total_price)}`,
    `Name: ${b.guest_name}, Phone: ${b.phone}`,
    ...(b.status === 'pending' && advanceDue > 0
      ? ['', `I'll pay the advance of ${inr(advanceDue)}${config.upi.id ? ` by UPI to ${config.upi.id}` : ''} and send the payment screenshot here.`]
      : [])
  ].join('\n');
  return `https://wa.me/${config.business.whatsapp}?text=${encodeURIComponent(text)}`;
}

export async function createBooking(input) {
  validateStay(input.check_in, input.check_out);
  const store = db();
  const tent = await store.getTent(input.tent_id);
  if (!tent || !tent.active) throw notFound('Tent not found');
  if (input.guests > tent.capacity) throw badRequest(`${tent.name} sleeps up to ${tent.capacity} guests`);

  const q = quote(tent, input.check_in, input.check_out);
  const row = {
    tent_id: tent.id,
    guest_name: input.guest_name,
    phone: input.phone,
    email: input.email.toLowerCase(),
    guests: input.guests,
    check_in: input.check_in,
    check_out: input.check_out,
    nights: q.nights,
    subtotal: q.subtotal,
    tax_amount: q.tax_amount,
    total_price: q.total_price,
    advance_amount: q.advance_amount,
    payment_method: input.payment_method || null,
    notes: input.notes || null,
    source: 'website'
  };

  let booking;
  for (let attempt = 0; !booking; attempt++) {
    try {
      booking = await store.createBooking({ ...row, code: bookingCode() });
    } catch (err) {
      // retry only the (astronomically rare) booking-code collision
      if (attempt < 2 && err.status === 409 && err.message === 'Please try again') continue;
      throw err;
    }
  }

  await Promise.all([
    sendMail({ to: booking.email, ...guestRequestEmail(booking, tent), replyTo: config.business.email }),
    sendMail({ to: config.adminNotifyEmail, ...adminNewBookingEmail(booking, tent), replyTo: booking.email })
  ]);

  return { booking: await publicBooking(booking, tent), token: bookingToken(booking.id), url: bookingLink(booking), whatsappUrl: whatsappLink(booking, tent) };
}

const maskTxn = (s) => (s && s.length > 6 ? `${'•'.repeat(s.length - 4)}${s.slice(-4)}` : s);

export async function publicBooking(b, tent, payments) {
  const store = db();
  tent ||= await store.getTent(b.tent_id);
  payments ||= await store.listPayments({ booking_id: b.id });
  const holdExpiresAt = new Date(Date.parse(b.created_at) + config.booking.holdHours * 3600000).toISOString();
  const open = b.status === 'pending' && b.payment_status === 'unpaid';
  return {
    id: b.id,
    code: b.code,
    status: b.status,
    payment_status: b.payment_status,
    tent: tent ? { id: tent.id, name: tent.name, image: tent.images?.[0] || null } : null,
    guest_name: b.guest_name,
    email: b.email,
    phone: b.phone,
    guests: b.guests,
    check_in: b.check_in,
    check_out: b.check_out,
    nights: b.nights,
    subtotal: Number(b.subtotal),
    tax_amount: Number(b.tax_amount),
    total_price: Number(b.total_price),
    advance_amount: Number(b.advance_amount),
    amount_paid: Number(b.amount_paid || 0),
    balance_due: balanceDue(b),
    payment_method: b.payment_method,
    notes: b.notes,
    created_at: b.created_at,
    hold_expires_at: holdExpiresAt,
    // An unpaid request whose hold lapsed may have lost its dates - the page then asks the guest to contact us
    dates_available: open && !holdsInventory(b) ? await stillAvailable(b) : true,
    whatsapp_url: whatsappLink(b, tent),
    payments: payments.map((p) => ({ id: p.id, method: p.method, amount: Number(p.amount), status: p.status, txn_id: maskTxn(p.txn_id), created_at: p.created_at }))
  };
}

async function loadPayable(booking) {
  if (booking.status === 'cancelled') throw conflict('This booking was cancelled');
  if (booking.payment_status === 'paid' || booking.payment_status === 'refunded') throw conflict('This booking needs no further payment');
  if (booking.status === 'pending' && booking.payment_status === 'unpaid' && !holdsInventory(booking) && !(await stillAvailable(booking))) {
    throw conflict('Sorry, your hold expired and these dates are no longer available. Please contact us or make a new booking.');
  }
}

/** Amount for a payment: the advance (minus anything already paid) or the full balance. */
function amountFor(booking, type) {
  const balance = balanceDue(booking);
  if (type === 'full') return balance;
  return Math.max(0, Math.min(balance, money(Number(booking.advance_amount) - Number(booking.amount_paid || 0)))) || balance;
}

export async function upiDetails(booking) {
  const upi = getProvider('upi');
  if (!upi.isEnabled()) return null;
  const advance = amountFor(booking, 'advance');
  const full = amountFor(booking, 'full');
  return {
    payeeName: config.upi.payeeName,
    upiId: config.upi.id,
    advance: { amount: advance, uri: upi.buildUri({ amount: advance, note: booking.code }) },
    full: { amount: full, uri: upi.buildUri({ amount: full, note: booking.code }) }
  };
}

export async function submitUpiProof(booking, { txn_id, amount, screenshot }) {
  const upi = getProvider('upi');
  if (!upi.isEnabled()) throw new HttpError(503, 'UPI payments are not enabled');
  await loadPayable(booking);
  const store = db();
  const pendingProof = (await store.listPayments({ booking_id: booking.id })).find((p) => p.status === 'submitted');
  if (pendingProof) throw conflict('A payment for this booking is already waiting for verification');
  const existing = await store.findPaymentByTxnId(txn_id);
  if (existing && existing.status !== 'rejected') throw conflict('This UPI transaction ID has already been submitted');

  const payAmount = money(amount || amountFor(booking, 'advance'));
  if (payAmount <= 0 || payAmount > balanceDue(booking) + 0.01) throw badRequest(`Amount must be between ₹1 and ${inr(balanceDue(booking))}`);

  let payment = await store.createPayment({ booking_id: booking.id, method: 'upi', amount: payAmount, status: 'submitted', txn_id });
  if (screenshot) {
    const proof_path = await store.saveProof(payment.id, screenshot.buffer, screenshot.mime);
    payment = await store.updatePayment(payment.id, { proof_path });
  }
  const updated = await store.updateBooking(booking.id, { payment_status: booking.payment_status === 'unpaid' ? 'proof_submitted' : booking.payment_status, payment_method: 'upi' });
  await sendMail({ to: config.adminNotifyEmail, ...adminPaymentSubmittedEmail(updated, payment) });
  return publicBooking(updated);
}

export async function createGatewayOrder(booking, { provider: providerId = 'razorpay', type = 'advance' }) {
  const provider = getProvider(providerId);
  if (!provider?.isEnabled() || !provider.verifyClientCallback) throw new HttpError(503, 'Online payment is not available right now');
  await loadPayable(booking);
  const amount = amountFor(booking, type);
  const store = db();
  const payment = await store.createPayment({ booking_id: booking.id, method: provider.id, amount, status: 'created' });
  try {
    const checkout = await provider.initiate({ booking, amount, payment });
    await store.updatePayment(payment.id, { provider_order_id: checkout.orderId });
    return { paymentId: payment.id, ...checkout };
  } catch (err) {
    await store.updatePayment(payment.id, { status: 'failed', notes: String(err.message).slice(0, 300) });
    throw err;
  }
}

/** Called from the checkout callback (after signature check) and from the verified webhook. Idempotent. */
export async function markGatewayPaymentCaptured({ orderId, paymentId, amount, via }) {
  const store = db();
  const payment = await store.findPaymentByOrderId(orderId);
  if (!payment) throw notFound('Payment order not found');
  if (amount != null && Math.abs(Number(amount) - Number(payment.amount)) > 0.01) {
    await store.updatePayment(payment.id, { notes: `Amount mismatch from ${via}: got ${amount}` });
    throw badRequest('Payment amount mismatch');
  }
  const captured = await store.transitionPayment(payment.id, ['created', 'failed'], {
    status: 'captured',
    provider_payment_id: paymentId,
    txn_id: paymentId,
    notes: `Captured via ${via}`
  });
  if (!captured) return { booking: await store.getBooking(payment.booking_id), alreadyProcessed: true };
  return { booking: await applyPayments(payment.booking_id, { sendReceipt: true }), alreadyProcessed: false };
}

/**
 * Recomputes amount_paid / payment_status from the payments table and confirms the booking once the advance is in.
 * Sends the confirmation + receipt email when asked (after a payment is verified or captured).
 */
export async function applyPayments(bookingId, { sendReceipt = false } = {}) {
  const store = db();
  const booking = await store.getBooking(bookingId);
  const payments = await store.listPayments({ booking_id: bookingId });
  const paid = money(payments.filter((p) => PAID.includes(p.status)).reduce((s, p) => s + Number(p.amount), 0));
  const total = Number(booking.total_price);

  let payment_status = 'unpaid';
  if (booking.payment_status === 'refunded') payment_status = 'refunded';
  else if (paid >= total - 0.01) payment_status = 'paid';
  else if (paid > 0) payment_status = 'advance_paid';
  else if (payments.some((p) => p.status === 'submitted')) payment_status = 'proof_submitted';

  const patch = { amount_paid: paid, payment_status };
  if (booking.status === 'pending' && paid > 0 && paid >= Number(booking.advance_amount) - 1) patch.status = 'confirmed';
  const updated = await store.updateBooking(bookingId, patch);

  if (sendReceipt && paid > 0 && updated.status === 'confirmed') {
    const tent = await store.getTent(updated.tent_id);
    await sendMail({ to: updated.email, ...receiptEmail(updated, tent, payments), replyTo: config.business.email });
  }
  return updated;
}

// ------------------------------------------------------------------ admin actions

export async function adminBookingAction(id, { action, admin_notes, force, ...extra }) {
  const store = db();
  const booking = await store.getBooking(id);
  if (!booking) throw notFound('Booking not found');
  const notes = admin_notes !== undefined ? { admin_notes } : {};

  switch (action) {
    case 'confirm': {
      if (booking.status === 'cancelled' && !force) throw conflict('Booking is cancelled - re-open it with force if the tent is free');
      if (!force && !holdsInventory(booking) && !(await stillAvailable(booking))) {
        throw conflict('These dates are now taken by another booking or block. Use "force" to confirm anyway.');
      }
      const updated = await store.updateBooking(id, { status: 'confirmed', ...notes });
      const tent = await store.getTent(updated.tent_id);
      const payments = await store.listPayments({ booking_id: id });
      await sendMail({ to: updated.email, ...receiptEmail(updated, tent, payments), replyTo: config.business.email });
      return updated;
    }
    case 'cancel': {
      const updated = await store.updateBooking(id, { status: 'cancelled', ...notes });
      await sendMail({ to: updated.email, ...guestCancelledEmail(updated), replyTo: config.business.email });
      return updated;
    }
    case 'mark_paid': {
      // Balance collected at the property (cash / UPI on arrival)
      const balance = balanceDue(booking);
      if (balance > 0) {
        await store.createPayment({ booking_id: id, method: 'property', amount: balance, status: 'verified', notes: 'Marked paid by admin' });
      }
      if (Object.keys(notes).length) await store.updateBooking(id, notes);
      if (booking.status === 'pending') await store.updateBooking(id, { status: 'confirmed' });
      return applyPayments(id, { sendReceipt: true });
    }
    case 'record_payment': {
      // UPI payment the guest sent proof of on WhatsApp / phone, checked by the admin in the bank app
      if (booking.status === 'cancelled' && !force) throw conflict('Booking is cancelled - re-open it with force if the tent is free');
      const amount = money(extra.amount);
      const balance = balanceDue(booking);
      if (!(amount > 0)) throw badRequest('Enter the amount received');
      if (amount > balance + 1) throw badRequest(`Only ${inr(balance)} is still due on this booking`);
      if (!force && !holdsInventory(booking) && !(await stillAvailable(booking))) {
        throw conflict('These dates are now taken by another booking or block. Use "force" to record the payment anyway.');
      }
      const txnId = extra.txn_id?.trim() || null;
      if (txnId && (await store.findPaymentByTxnId(txnId))) throw conflict('This UPI transaction ID is already recorded on a booking');
      await store.createPayment({ booking_id: id, method: 'upi', amount, status: 'verified', txn_id: txnId, notes: 'Recorded by admin (WhatsApp / phone)' });
      if (Object.keys(notes).length) await store.updateBooking(id, notes);
      if (booking.status === 'pending') await store.updateBooking(id, { status: 'confirmed' });
      return applyPayments(id, { sendReceipt: true });
    }
    case 'refund': {
      const payments = await store.listPayments({ booking_id: id });
      for (const p of payments.filter((x) => PAID.includes(x.status))) await store.updatePayment(p.id, { status: 'refunded' });
      return store.updateBooking(id, { payment_status: 'refunded', status: 'cancelled', ...notes });
    }
    case 'note':
      return store.updateBooking(id, notes);
    default:
      throw badRequest('Unknown action');
  }
}

export async function adminPaymentAction(id, { action, notes }) {
  const store = db();
  const payment = await store.getPayment(id);
  if (!payment) throw notFound('Payment not found');
  if (action === 'verify') {
    const done = await store.transitionPayment(id, ['submitted', 'created', 'rejected'], { status: 'verified', notes: notes ?? payment.notes });
    if (!done) throw conflict(`Payment is already ${payment.status}`);
    return applyPayments(payment.booking_id, { sendReceipt: true });
  }
  if (action === 'reject') {
    const done = await store.transitionPayment(id, ['submitted', 'created'], { status: 'rejected', notes: notes ?? 'Rejected by admin' });
    if (!done) throw conflict(`Payment is already ${payment.status}`);
    return applyPayments(payment.booking_id);
  }
  if (action === 'refund') {
    await store.updatePayment(id, { status: 'refunded', notes: notes ?? 'Refunded manually' });
    return applyPayments(payment.booking_id);
  }
  throw badRequest('Unknown action');
}

// ------------------------------------------------------------------ iCal export (import into Airbnb)

/**
 * Nights to show as unavailable on Airbnb.
 * - AIRBNB_TENT_ID set: nights when website bookings + manual blocks fill every tent of that type
 *   (Airbnb's own bookings are ignored here - Airbnb already knows about them).
 * - Not set (the listing stands for the whole camp): any night with a website booking or manual block.
 */
export async function exportCalendar() {
  const store = db();
  const from = todayIST();
  const to = addMonths(from, 18);
  let nights;
  if (config.airbnb.tentId) {
    const tent = await store.getTent(config.airbnb.tentId);
    if (!tent) return buildIcs({ name: 'Cliff Camps, Barot', ranges: [] });
    const { bookings, blocks } = await store.getStayData(from, to, tent.id);
    nights = unavailableNights(tent, from, to, bookings, blocks, { ignoreSource: 'airbnb' });
  } else {
    const { bookings, blocks } = await store.getStayData(from, to);
    const now = Date.now();
    const set = new Set();
    for (const b of bookings) {
      if (!holdsInventory(b, now)) continue;
      for (const d of eachNight(b.check_in, b.check_out)) if (d >= from && d < to) set.add(d);
    }
    for (const bl of blocks) if (bl.source !== 'airbnb') set.add(bl.date);
    nights = [...set];
  }
  return buildIcs({ name: 'Cliff Camps, Barot', ranges: toRanges(nights), summary: 'Cliff Camps - booked' });
}

