export const inr = (n) => '₹' + Number(n || 0).toLocaleString('en-IN', { maximumFractionDigits: 2 });

/** Local calendar date -> 'YYYY-MM-DD' (no timezone shift). */
export const toISO = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

/** 'YYYY-MM-DD' -> local Date at midnight. */
export const fromISO = (s) => {
  const [y, m, d] = s.split('-').map(Number);
  return new Date(y, m - 1, d);
};

export const addDaysISO = (s, n) => {
  const d = fromISO(s);
  d.setDate(d.getDate() + n);
  return toISO(d);
};

export const nights = (from, to) => Math.round((fromISO(to) - fromISO(from)) / 86400000);

export const prettyDate = (s, opts = {}) =>
  fromISO(s).toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short', ...opts });

export const STATUS_LABEL = {
  pending: 'Pending',
  confirmed: 'Confirmed',
  cancelled: 'Cancelled',
  unpaid: 'Unpaid',
  proof_submitted: 'Payment submitted',
  advance_paid: 'Advance paid',
  paid: 'Fully paid',
  refunded: 'Refunded',
  created: 'Started',
  submitted: 'Awaiting check',
  verified: 'Verified',
  captured: 'Captured',
  failed: 'Failed',
  rejected: 'Rejected'
};

export const STATUS_TONE = {
  pending: 'bg-sun/15 text-sun-600 ring-sun/30',
  confirmed: 'bg-lime/15 text-lime-700 ring-lime/30',
  cancelled: 'bg-pin/10 text-pin ring-pin/20',
  unpaid: 'bg-forest/5 text-forest/70 ring-forest/10',
  proof_submitted: 'bg-teal/10 text-teal-700 ring-teal/30',
  advance_paid: 'bg-lime/15 text-lime-700 ring-lime/30',
  paid: 'bg-lime/25 text-lime-700 ring-lime/40',
  refunded: 'bg-pin/10 text-pin ring-pin/20',
  created: 'bg-forest/5 text-forest/70 ring-forest/10',
  submitted: 'bg-teal/10 text-teal-700 ring-teal/30',
  verified: 'bg-lime/15 text-lime-700 ring-lime/30',
  captured: 'bg-lime/15 text-lime-700 ring-lime/30',
  failed: 'bg-pin/10 text-pin ring-pin/20',
  rejected: 'bg-pin/10 text-pin ring-pin/20'
};
