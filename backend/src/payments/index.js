/**
 * Payment provider registry.
 *
 * Every provider implements:
 *   id: string                       - stored in payments.method
 *   label: string                    - shown to guests
 *   isEnabled(): boolean             - configured via env vars?
 *   publicConfig(): object           - safe values the browser may see (never secrets)
 *   initiate({ booking, payment }): Promise<object>  - what the browser needs to start paying
 *
 * Providers that confirm payments automatically (gateways) also implement:
 *   verifyClientCallback(payload): boolean           - checkout success signature check
 *   parseWebhook(rawBody, headers): { event, orderId, paymentId, amount } | null  (verified)
 *
 * To add a gateway (e.g. Cashfree, PhonePe PG): create ./cashfree.js implementing the above and register it below.
 * We never see or store card data: gateways collect it on their own hosted checkout.
 */
import { upiProvider } from './upi.js';
import { razorpayProvider } from './razorpay.js';

const providers = { [upiProvider.id]: upiProvider, [razorpayProvider.id]: razorpayProvider };

export const getProvider = (id) => providers[id] || null;
export const enabledProviders = () => Object.values(providers).filter((p) => p.isEnabled());
export const publicPaymentConfig = () =>
  Object.fromEntries(Object.values(providers).map((p) => [p.id, { enabled: p.isEnabled(), label: p.label, ...(p.isEnabled() ? p.publicConfig() : {}) }]));
