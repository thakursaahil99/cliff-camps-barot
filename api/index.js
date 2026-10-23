// Express API as a single Vercel Function. vercel.json rewrites /api/* here as /api?__path=<rest>.
import { createApp } from '../backend/src/app.js';

const app = createApp();

export default function handler(req, res) {
  // Restore the original /api/<path> URL whichever form the rewrite delivers
  const url = new URL(req.url, 'http://localhost');
  const rest = url.searchParams.get('__path');
  if (rest !== null) {
    url.searchParams.delete('__path');
    req.url = '/api/' + rest + url.search;
  }
  return app(req, res);
}
