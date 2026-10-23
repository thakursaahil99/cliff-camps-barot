// Vercel Cron (see vercel.json): pull the Airbnb iCal feed into blocked_dates.
import { syncAirbnbCalendar } from '../backend/src/services/airbnbSync.js';

export default async function handler(req, res) {
  // Vercel sends "Authorization: Bearer <CRON_SECRET>" when CRON_SECRET is set
  if (process.env.CRON_SECRET && req.headers.authorization !== `Bearer ${process.env.CRON_SECRET}`) {
    return res.status(401).json({ ok: false, error: 'Unauthorized' });
  }
  try {
    res.status(200).json(await syncAirbnbCalendar());
  } catch (err) {
    console.error('[airbnb-sync] failed:', err.message);
    res.status(500).json({ ok: false, error: err.message });
  }
}
