// Runs the Airbnb iCal sync once (same code as the scheduled Netlify function).
import { syncAirbnbCalendar } from '../src/services/airbnbSync.js';

console.log(await syncAirbnbCalendar());
