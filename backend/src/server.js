// Local development server. In production the same app runs as a Netlify Function (netlify/functions/api.js).
import { createApp } from './app.js';
import { config } from './config.js';
import { db } from './db/index.js';
import { syncAirbnbCalendar } from './services/airbnbSync.js';

const app = createApp();
app.listen(config.port, () => {
  console.log(`[api] Cliff Camps API on http://localhost:${config.port}/api (db: ${db().kind})`);
});

// Mirror the Netlify scheduled function locally: Airbnb iCal sync every 30 minutes
if (config.airbnb.icalUrl) {
  const sync = () => syncAirbnbCalendar().catch((e) => console.error('[airbnb-sync]', e.message));
  sync();
  setInterval(sync, 30 * 60 * 1000);
}
