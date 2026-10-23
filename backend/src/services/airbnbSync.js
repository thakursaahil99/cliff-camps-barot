import { config } from '../config.js';
import { db } from '../db/index.js';
import { addDays, addMonths, todayIST } from '../utils/dates.js';
import { parseIcs, nightsFromEvents } from './ical.js';

/**
 * Pulls the Airbnb listing's iCal feed and stores its booked nights as blocked dates (source = 'airbnb').
 * Runs every 30 minutes (Netlify scheduled function) and on demand from the admin panel.
 * On any fetch/parse error the previously synced blocks are kept, so a temporary Airbnb outage never opens dates.
 */
export async function syncAirbnbCalendar() {
  if (!config.airbnb.icalUrl) return { ok: false, skipped: true, reason: 'AIRBNB_ICAL_URL not set' };

  const res = await fetch(config.airbnb.icalUrl, {
    headers: { 'User-Agent': 'CliffCampsCalendarSync/1.0' },
    signal: AbortSignal.timeout(8000)
  });
  if (!res.ok) throw new Error(`Airbnb calendar responded ${res.status}`);
  const text = await res.text();
  if (!text.includes('BEGIN:VCALENDAR')) throw new Error('Airbnb calendar response is not an iCal file');

  const from = addDays(todayIST(), -1);
  const to = addMonths(from, 18);
  const events = parseIcs(text);
  const nights = nightsFromEvents(events).filter((d) => d >= from && d < to);
  const tentId = config.airbnb.tentId;
  const rows = nights.map((date) => ({
    date,
    tent_id: tentId,
    // One Airbnb listing = one tent of that type; without a tent mapping the whole camp is blocked.
    units: tentId ? 1 : null,
    reason: 'Airbnb booking / block'
  }));
  const count = await db().replaceBlocksBySource('airbnb', rows);
  console.log(`[airbnb-sync] ${events.length} events -> ${count} blocked nights`);
  return { ok: true, events: events.length, nights: count, syncedAt: new Date().toISOString() };
}
