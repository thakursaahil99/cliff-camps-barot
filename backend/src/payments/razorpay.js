import crypto from 'node:crypto';
import { config } from '../config.js';
import { HttpError } from '../utils/http.js';
import { timingSafeEqualHex } from '../utils/tokens.js';

const API = 'https://api.razorpay.com/v1';
const rz = config.razorpay;

/** Live keys only in live mode, test keys only in test mode - so a misconfigured env can't take real money in testing. */
function keyMatchesMode() {
  return rz.live ? rz.keyId.startsWith('rzp_live_') : rz.keyId.startsWith('rzp_test_');
}

const hmac = (secret, data) => crypto.createHmac('sha256', secret).update(data).digest('hex');

export const razorpayProvider = {
  id: 'razorpay',
  label: 'Razorpay (UPI, cards, netbanking)',
  isEnabled: () => Boolean(rz.keyId && rz.keySecret && keyMatchesMode()),
  publicConfig: () => ({ keyId: rz.keyId, live: rz.live }),

  async initiate({ booking, amount, payment }) {
    const res = await fetch(`${API}/orders`, {
      method: 'POST',
      headers: {
        Authorization: 'Basic ' + Buffer.from(`${rz.keyId}:${rz.keySecret}`).toString('base64'),
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        amount: Math.round(Number(amount) * 100), // paise
        currency: 'INR',
        receipt: payment.id.slice(0, 40),
        notes: { booking_id: booking.id, booking_code: booking.code, payment_id: payment.id }
      }),
      signal: AbortSignal.timeout(8000)
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new HttpError(502, `Razorpay order failed: ${data?.error?.description || res.status}`);
    return {
      method: 'razorpay',
      keyId: rz.keyId,
      orderId: data.id,
      amount: data.amount,
      currency: data.currency,
      name: config.business.name,
      description: `Booking ${booking.code}`,
      prefill: { name: booking.guest_name, email: booking.email, contact: booking.phone },
      notes: { booking_code: booking.code }
    };
  },

  /** Checkout handler signature: HMAC_SHA256(order_id + "|" + payment_id, key_secret). */
  verifyClientCallback({ razorpay_order_id, razorpay_payment_id, razorpay_signature }) {
    if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature) return false;
    return timingSafeEqualHex(hmac(rz.keySecret, `${razorpay_order_id}|${razorpay_payment_id}`), razorpay_signature);
  },

  /** Webhook signature: HMAC_SHA256(raw request body, webhook secret) in X-Razorpay-Signature. */
  parseWebhook(rawBody, headers) {
    if (!rz.webhookSecret) throw new HttpError(503, 'RAZORPAY_WEBHOOK_SECRET not configured');
    const signature = headers['x-razorpay-signature'];
    if (!timingSafeEqualHex(hmac(rz.webhookSecret, rawBody), signature)) return null;
    const body = JSON.parse(rawBody.toString('utf8'));
    const entity = body?.payload?.payment?.entity || {};
    return { event: body.event, orderId: entity.order_id, paymentId: entity.id, amount: entity.amount / 100, status: entity.status };
  }
};
