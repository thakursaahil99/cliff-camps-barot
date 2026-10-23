import crypto from 'node:crypto';
import { config } from '../config.js';

/** Unguessable per-booking token so guests can open their booking page without an account. */
export const bookingToken = (bookingId) =>
  crypto.createHmac('sha256', config.jwtSecret).update(`booking:${bookingId}`).digest('base64url').slice(0, 32);

export function verifyBookingToken(bookingId, token) {
  if (typeof token !== 'string' || !token) return false;
  const expected = Buffer.from(bookingToken(bookingId));
  const given = Buffer.from(token);
  return expected.length === given.length && crypto.timingSafeEqual(expected, given);
}

export function timingSafeEqualHex(a, b) {
  if (typeof a !== 'string' || typeof b !== 'string' || a.length !== b.length) return false;
  return crypto.timingSafeEqual(Buffer.from(a, 'utf8'), Buffer.from(b, 'utf8'));
}

const ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
/** Short human-friendly booking reference, e.g. CC-7F3K9Q (used in UPI notes and emails). */
export function bookingCode() {
  const bytes = crypto.randomBytes(6);
  return 'CC-' + Array.from(bytes, (b) => ALPHABET[b % ALPHABET.length]).join('');
}
