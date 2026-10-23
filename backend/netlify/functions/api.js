// Express API as a single Netlify Function (no always-on server, nothing to sleep).
// netlify.toml rewrites /api/* to this function.
import serverless from 'serverless-http';
import { createApp } from '../../src/app.js';

const handle = serverless(createApp(), { binary: ['image/*'] });

export const handler = async (event, context) => {
  // Requests may arrive as /.netlify/functions/api/<path> or as the original /api/<path>; normalise to /api/<path>
  const path = event.path || '/';
  if (path.startsWith('/.netlify/functions/api')) event.path = '/api' + path.slice('/.netlify/functions/api'.length);
  return handle(event, context);
};
