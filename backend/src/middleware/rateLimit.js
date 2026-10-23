import rateLimit from 'express-rate-limit';

// Netlify puts the real client IP in x-nf-client-connection-ip.
// Note: on serverless each warm instance keeps its own counters, so limits are best-effort per instance.
const keyGenerator = (req) =>
  req.headers['x-nf-client-connection-ip'] || req.headers['x-forwarded-for']?.split(',')[0].trim() || req.ip || 'unknown';

const make = (windowMinutes, limit, message) =>
  rateLimit({
    windowMs: windowMinutes * 60 * 1000,
    limit,
    keyGenerator,
    standardHeaders: 'draft-7',
    legacyHeaders: false,
    validate: false,
    skip: () => process.env.NODE_ENV === 'test',
    message: { error: message }
  });

export const apiLimiter = make(1, 120, 'Too many requests - please slow down');
export const bookingLimiter = make(15, 10, 'Too many booking attempts - please try again in a few minutes');
export const paymentLimiter = make(15, 20, 'Too many payment attempts - please try again later');
export const loginLimiter = make(15, 8, 'Too many login attempts - please wait 15 minutes');
