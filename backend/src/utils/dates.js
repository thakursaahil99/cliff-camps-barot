// All booking dates are plain calendar dates ('YYYY-MM-DD'), handled in UTC to avoid timezone drift.
const DAY = 86400000;
const ISO = /^\d{4}-\d{2}-\d{2}$/;

export const toTime = (d) => Date.parse(`${d}T00:00:00Z`);
export const fromTime = (t) => new Date(t).toISOString().slice(0, 10);

export function isISODate(s) {
  if (typeof s !== 'string' || !ISO.test(s)) return false;
  const t = toTime(s);
  return !Number.isNaN(t) && fromTime(t) === s;
}

export const addDays = (d, n) => fromTime(toTime(d) + n * DAY);
export const nightsBetween = (from, to) => Math.round((toTime(to) - toTime(from)) / DAY);

/** Every night of a stay: check_in inclusive, check_out exclusive. */
export function eachNight(from, to) {
  const out = [];
  for (let t = toTime(from), end = toTime(to); t < end; t += DAY) out.push(fromTime(t));
  return out;
}

/** Today's date at the camp (India Standard Time). */
export const todayIST = () => fromTime(Date.now() + 5.5 * 3600000);

export const addMonths = (d, n) => {
  const t = new Date(toTime(d));
  t.setUTCMonth(t.getUTCMonth() + n);
  return fromTime(t.getTime());
};

export const formatDate = (d) =>
  new Date(toTime(d)).toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric', timeZone: 'UTC' });
