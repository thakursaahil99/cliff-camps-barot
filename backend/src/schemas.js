import { z } from 'zod';
import { isISODate, nightsBetween } from './utils/dates.js';

const isoDate = z.string().refine(isISODate, 'Use YYYY-MM-DD');
const uuid = z.string().uuid();
const text = (max) => z.string().trim().max(max);
const optionalText = (max) => text(max).optional().transform((v) => (v ? v : undefined));
const phone = z.string().trim().regex(/^\+?[0-9][0-9 -]{6,16}[0-9]$/, 'Enter a valid phone number');
const token = z.string().min(10).max(64);

export const availabilityQuery = z
  .object({ tent_id: uuid.optional(), from: isoDate, to: isoDate })
  .refine((q) => q.to > q.from, { message: '`to` must be after `from`', path: ['to'] })
  .refine((q) => nightsBetween(q.from, q.to) <= 400, { message: 'Range too long (max 400 days)', path: ['to'] });

export const createBookingBody = z.object({
  tent_id: uuid,
  check_in: isoDate,
  check_out: isoDate,
  guests: z.coerce.number().int().min(1).max(20),
  guest_name: text(80).min(2, 'Please enter your name'),
  phone,
  email: z.string().trim().email('Enter a valid email').max(120),
  notes: optionalText(1000),
  payment_method: z.enum(['upi', 'razorpay']).optional(),
  // honeypot field: real users never fill it
  website: z.string().max(0).optional()
});

const DATA_URL = /^data:(image\/(?:png|jpeg|webp));base64,([A-Za-z0-9+/=]+)$/;
export const upiProofBody = z.object({
  t: token,
  txn_id: z.string().trim().regex(/^[A-Za-z0-9-]{6,40}$/, 'Enter the UPI transaction / reference ID (letters and numbers)'),
  amount: z.coerce.number().positive().max(1000000).optional(),
  screenshot: z
    .string()
    .max(2_800_000, 'Screenshot too large (max 2 MB)')
    .regex(DATA_URL, 'Screenshot must be a PNG, JPG or WebP image')
    .transform((s) => {
      const [, mime, b64] = DATA_URL.exec(s);
      return { mime, buffer: Buffer.from(b64, 'base64') };
    })
    .optional()
});

export const gatewayOrderBody = z.object({ t: token, type: z.enum(['advance', 'full']).default('advance'), provider: z.enum(['razorpay']).default('razorpay') });

export const razorpayVerifyBody = z.object({
  t: token,
  razorpay_order_id: z.string().min(5).max(64),
  razorpay_payment_id: z.string().min(5).max(64),
  razorpay_signature: z.string().min(10).max(256)
});

export const loginBody = z.object({ email: z.string().trim().email().max(120), password: z.string().min(1).max(200) });

export const adminBookingsQuery = z.object({
  status: z.enum(['pending', 'confirmed', 'cancelled']).optional(),
  payment_status: z.enum(['unpaid', 'proof_submitted', 'advance_paid', 'paid', 'refunded']).optional(),
  q: optionalText(80),
  from: isoDate.optional(),
  to: isoDate.optional()
});

export const bookingPatchBody = z.object({
  action: z.enum(['confirm', 'cancel', 'mark_paid', 'record_payment', 'refund', 'note']),
  admin_notes: text(2000).optional(),
  amount: z.coerce.number().positive().max(10000000).optional(),
  txn_id: z.union([z.literal(''), z.string().trim().regex(/^[A-Za-z0-9-]{6,40}$/, 'Enter a valid UPI transaction ID')]).optional(),
  force: z.boolean().optional()
});

export const paymentsQuery = z.object({ status: z.enum(['created', 'submitted', 'verified', 'captured', 'failed', 'rejected', 'refunded']).optional() });
export const paymentPatchBody = z.object({ action: z.enum(['verify', 'reject', 'refund']), notes: text(500).optional() });

export const blockedQuery = z.object({ from: isoDate.optional(), to: isoDate.optional() });
export const blockedCreateBody = z
  .object({
    tent_id: uuid.nullable().optional(),
    from: isoDate,
    to: isoDate, // inclusive last blocked night
    reason: optionalText(200),
    units: z.coerce.number().int().min(1).max(100).nullable().optional()
  })
  .refine((b) => b.to >= b.from, { message: 'End date must be on or after start date', path: ['to'] })
  .refine((b) => nightsBetween(b.from, b.to) < 366, { message: 'Block at most one year at a time', path: ['to'] });

const tentFields = {
  name: text(80).min(2),
  description: text(2000),
  capacity: z.coerce.number().int().min(1).max(20),
  price_per_night: z.coerce.number().min(0).max(1000000),
  units: z.coerce.number().int().min(1).max(100),
  images: z.array(z.string().trim().max(300)).max(20),
  amenities: z.array(text(80)).max(30),
  sort_order: z.coerce.number().int().min(0).max(1000),
  active: z.boolean()
};
export const tentPatchBody = z.object(tentFields).partial().refine((o) => Object.keys(o).length > 0, 'Nothing to update');
export const tentCreateBody = z.object(tentFields).partial().required({ name: true, capacity: true, price_per_night: true });

export const idParam = z.object({ id: uuid });
