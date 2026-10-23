import { config } from '../config.js';
import { nightsBetween } from '../utils/dates.js';

const round2 = (n) => Math.round(n * 100) / 100;

/** Server-side price calculation - the client's numbers are never trusted. */
export function quote(tent, checkIn, checkOut) {
  const nights = nightsBetween(checkIn, checkOut);
  const rate = Number(tent.price_per_night);
  const subtotal = round2(nights * rate);
  const tax_amount = round2((subtotal * config.booking.taxPercent) / 100);
  const total_price = round2(subtotal + tax_amount);
  // Advance is rounded up to whole rupees so UPI amounts are simple to type and verify
  const advance_amount = Math.min(total_price, Math.ceil((total_price * config.booking.advancePercent) / 100));
  return { nights, rate, subtotal, tax_amount, total_price, advance_amount };
}

export const balanceDue = (b) => round2(Math.max(0, Number(b.total_price) - Number(b.amount_paid || 0)));

export const inr = (n) => '₹' + Number(n).toLocaleString('en-IN', { maximumFractionDigits: 2 });
