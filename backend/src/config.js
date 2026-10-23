import 'dotenv/config';

const str = (v, d = '') => (v === undefined || v === null || v === '' ? d : String(v).trim());
const num = (v, d) => {
  const n = Number(v);
  return v === undefined || v === '' || Number.isNaN(n) ? d : n;
};
const bool = (v, d = false) => (v === undefined || v === '' ? d : ['1', 'true', 'yes', 'on'].includes(String(v).toLowerCase()));

const env = str(process.env.NODE_ENV, 'development');
const isProd = env === 'production' || Boolean(process.env.NETLIFY) || Boolean(process.env.VERCEL) || Boolean(process.env.AWS_LAMBDA_FUNCTION_NAME);

const vercelUrl = process.env.VERCEL_PROJECT_PRODUCTION_URL ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}` : '';
const siteUrl = str(process.env.SITE_URL || process.env.URL || vercelUrl, 'http://localhost:5173').replace(/\/$/, '');

let jwtSecret = str(process.env.JWT_SECRET);
if (!jwtSecret) {
  if (isProd) throw new Error('JWT_SECRET must be set in production');
  jwtSecret = 'dev-only-insecure-secret-change-me';
  console.warn('[config] JWT_SECRET not set - using an insecure development secret');
}

export const config = {
  env,
  isProd,
  port: num(process.env.PORT, 4000),
  siteUrl,
  // Origins allowed by CORS. The deployed site is same-origin on Netlify; this list covers previews / custom domains.
  allowedOrigins: [
    siteUrl,
    ...str(process.env.ALLOWED_ORIGINS).split(',').map((s) => s.trim().replace(/\/$/, '')).filter(Boolean)
  ],
  jwtSecret,

  supabase: {
    url: str(process.env.SUPABASE_URL),
    serviceKey: str(process.env.SUPABASE_SERVICE_ROLE_KEY),
    proofsBucket: str(process.env.SUPABASE_PROOFS_BUCKET, 'payment-proofs')
  },
  // Local development without Supabase uses a JSON-file database in backend/.data
  useMemoryDb: bool(process.env.USE_MEMORY_DB, false),

  business: {
    name: 'Cliff Camps, Barot',
    email: 'cliffcampsbarot@gmail.com',
    phones: [
      { number: '8219850117', name: 'Ashwani' },
      { number: '7018955920', name: 'Anit' }
    ],
    whatsapp: '918219850117',
    address: 'Old Hatchery, Barot - Lohardi Road',
    instagram: 'https://www.instagram.com/cliff_camps_117',
    airbnb: 'https://www.airbnb.co.in/rooms/1426016597402048000',
    mapLink: 'https://maps.google.com/?cid=12454268022606769819'
  },
  adminNotifyEmail: str(process.env.ADMIN_NOTIFY_EMAIL, 'cliffcampsbarot@gmail.com'),

  booking: {
    currency: 'INR',
    advancePercent: num(process.env.ADVANCE_PERCENT, 30),
    taxPercent: num(process.env.TAX_PERCENT, 0),
    // Unpaid pending bookings stop holding dates after this many hours
    holdHours: num(process.env.PENDING_HOLD_HOURS, 24),
    maxNights: num(process.env.MAX_NIGHTS, 30),
    maxMonthsAhead: num(process.env.MAX_MONTHS_AHEAD, 12)
  },

  mail: {
    from: str(process.env.MAIL_FROM, 'Cliff Camps Barot <cliffcampsbarot@gmail.com>'),
    smtp: {
      host: str(process.env.SMTP_HOST, 'smtp.gmail.com'),
      port: num(process.env.SMTP_PORT, 465),
      user: str(process.env.SMTP_USER),
      pass: str(process.env.SMTP_PASS)
    },
    resendKey: str(process.env.RESEND_API_KEY)
  },

  upi: {
    id: str(process.env.UPI_ID),
    payeeName: str(process.env.UPI_PAYEE_NAME, 'Cliff Camps')
  },

  razorpay: {
    keyId: str(process.env.RAZORPAY_KEY_ID),
    keySecret: str(process.env.RAZORPAY_KEY_SECRET),
    webhookSecret: str(process.env.RAZORPAY_WEBHOOK_SECRET),
    // false = test mode (only rzp_test_ keys accepted), true = live mode (only rzp_live_ keys accepted)
    live: bool(process.env.PAYMENTS_LIVE, false)
  },

  airbnb: {
    icalUrl: str(process.env.AIRBNB_ICAL_URL),
    // Tent type the Airbnb listing represents. Empty = the listing blocks the whole camp.
    tentId: str(process.env.AIRBNB_TENT_ID) || null
  }
};
