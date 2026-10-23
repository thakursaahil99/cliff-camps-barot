// Scheduled function (every 30 minutes, see netlify.toml): pull the Airbnb iCal feed into blocked_dates.
import { syncAirbnbCalendar } from '../../src/services/airbnbSync.js';

export const handler = async () => {
  try {
    const result = await syncAirbnbCalendar();
    return { statusCode: 200, body: JSON.stringify(result) };
  } catch (err) {
    console.error('[airbnb-sync] failed:', err.message);
    return { statusCode: 500, body: JSON.stringify({ ok: false, error: err.message }) };
  }
};
