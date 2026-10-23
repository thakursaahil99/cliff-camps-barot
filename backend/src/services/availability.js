import { config } from '../config.js';
import { eachNight } from '../utils/dates.js';

/**
 * Does this booking currently occupy a tent?
 * Confirmed bookings always do. Pending bookings do while a payment is in progress, or for
 * `holdHours` after creation, so abandoned requests don't block the calendar forever.
 */
export function holdsInventory(b, now = Date.now()) {
  if (b.status === 'confirmed') return true;
  if (b.status !== 'pending') return false;
  if (b.payment_status && b.payment_status !== 'unpaid') return true;
  return now - Date.parse(b.created_at) < config.booking.holdHours * 3600000;
}

/**
 * Per-night usage of one tent type.
 * A blocked_dates row with `units = null` closes the tent (or the whole camp when tent_id is null);
 * a row with a number takes that many units (used for Airbnb, where one listing = one tent).
 *
 * @returns Map<date, { used: number, closed: boolean }>
 */
export function nightlyUsage(tent, from, to, bookings, blocks, { excludeBookingId, ignoreSource } = {}) {
  const usage = new Map(eachNight(from, to).map((d) => [d, { used: 0, closed: false }]));
  const now = Date.now();
  for (const b of bookings) {
    if (b.tent_id !== tent.id || b.id === excludeBookingId || !holdsInventory(b, now)) continue;
    for (const d of eachNight(b.check_in, b.check_out)) {
      const u = usage.get(d);
      if (u) u.used += 1;
    }
  }
  for (const bl of blocks) {
    if (bl.tent_id && bl.tent_id !== tent.id) continue;
    if (ignoreSource && bl.source === ignoreSource) continue;
    const u = usage.get(bl.date);
    if (!u) continue;
    if (bl.units == null) u.closed = true;
    else u.used += Number(bl.units);
  }
  return usage;
}

/** Nights in [from, to) on which this tent type has no free unit. */
export function unavailableNights(tent, from, to, bookings, blocks, opts) {
  const units = Math.max(1, Number(tent.units) || 1);
  const out = [];
  for (const [d, u] of nightlyUsage(tent, from, to, bookings, blocks, opts)) {
    if (u.closed || u.used >= units) out.push(d);
  }
  return out;
}
