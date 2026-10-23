import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { config } from './config.js';
import { apiLimiter } from './middleware/rateLimit.js';
import publicRoutes from './routes/public.js';
import adminRoutes from './routes/admin.js';
import webhookRoutes from './routes/webhooks.js';
import { HttpError } from './utils/http.js';

export function createApp() {
  const app = express();
  app.disable('x-powered-by');
  app.set('trust proxy', 1);

  app.use(helmet({ contentSecurityPolicy: false, crossOriginResourcePolicy: { policy: 'same-site' } }));

  // Webhooks: server-to-server, verified by signature, need the raw body -> mounted before CORS/JSON parsing
  app.use('/api/webhooks', webhookRoutes);

  app.use(
    '/api',
    cors({
      origin(origin, cb) {
        // Same-origin requests and non-browser clients send no Origin header
        if (!origin || config.allowedOrigins.includes(origin.replace(/\/$/, ''))) return cb(null, true);
        // Local development on any port
        if (!config.isProd && /^http:\/\/(localhost|127\.0\.0\.1):\d+$/.test(origin)) return cb(null, true);
        cb(new HttpError(403, 'Origin not allowed'));
      },
      methods: ['GET', 'POST', 'PATCH', 'DELETE'],
      allowedHeaders: ['Content-Type', 'Authorization', 'X-Booking-Token'],
      maxAge: 600
    })
  );
  app.use('/api', apiLimiter);
  app.use(express.json({ limit: '3mb' }));

  app.use('/api/admin', adminRoutes);
  app.use('/api', publicRoutes);

  app.use('/api', (_req, _res, next) => next(new HttpError(404, 'API route not found')));

  // eslint-disable-next-line no-unused-vars
  app.use((err, req, res, _next) => {
    if (err.type === 'entity.too.large') err = new HttpError(413, 'Upload too large (max 2 MB screenshot)');
    if (err.type === 'entity.parse.failed') err = new HttpError(400, 'Invalid JSON body');
    const status = err.status && err.status < 600 ? err.status : 500;
    if (status >= 500) console.error(`[api] ${req.method} ${req.originalUrl}`, err);
    res.status(status).json({ error: status >= 500 && config.isProd ? 'Something went wrong. Please try again or contact us.' : err.message, ...(err.details ? { fields: err.details } : {}) });
  });

  return app;
}
