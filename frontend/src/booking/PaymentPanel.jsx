import { useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { QRCodeSVG } from 'qrcode.react';
import { Check, Copy, CreditCard, ImagePlus, QrCode, ShieldCheck, Smartphone, X } from 'lucide-react';
import { api } from '../lib/api.js';
import { inr } from '../lib/format.js';
import { Spinner } from '../components/ui.jsx';

/** Shrinks a screenshot to WebP (max 1400px) so uploads stay small. */
async function compressImage(file) {
  const bitmap = await createImageBitmap(file);
  const scale = Math.min(1, 1400 / Math.max(bitmap.width, bitmap.height));
  const canvas = document.createElement('canvas');
  canvas.width = Math.round(bitmap.width * scale);
  canvas.height = Math.round(bitmap.height * scale);
  canvas.getContext('2d').drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  for (const q of [0.82, 0.65, 0.5]) {
    const url = canvas.toDataURL('image/webp', q);
    if (url.startsWith('data:image/webp') && url.length < 2_000_000) return url;
  }
  return canvas.toDataURL('image/jpeg', 0.6);
}

let rzpScript;
const loadRazorpay = () =>
  (rzpScript ||= new Promise((resolve, reject) => {
    const s = document.createElement('script');
    s.src = 'https://checkout.razorpay.com/v1/checkout.js';
    s.onload = () => resolve(window.Razorpay);
    s.onerror = () => {
      rzpScript = null;
      reject(new Error('Could not load Razorpay. Check your connection and try again.'));
    };
    document.body.appendChild(s);
  }));

function AmountChoice({ booking, value, onChange }) {
  const advance = Math.max(0, Math.min(booking.balance_due, booking.advance_amount - booking.amount_paid)) || booking.balance_due;
  const options = [
    { id: 'advance', label: booking.amount_paid > 0 ? 'Remaining advance' : 'Advance', amount: advance },
    { id: 'full', label: 'Full amount', amount: booking.balance_due }
  ].filter((o, i, all) => i === 0 || o.amount !== all[0].amount);
  if (options.length < 2) return null;
  return (
    <div role="radiogroup" aria-label="Amount to pay" className="mb-6 grid grid-cols-2 gap-2 rounded-2xl bg-cream p-1.5">
      {options.map((o) => (
        <button
          key={o.id}
          type="button"
          role="radio"
          aria-checked={value === o.id}
          onClick={() => onChange(o.id)}
          className={`relative rounded-xl px-3 py-2.5 text-sm transition ${value === o.id ? 'text-cream' : 'text-forest hover:bg-white'}`}
        >
          {value === o.id && <motion.span layoutId="amount-pill" className="absolute inset-0 rounded-xl bg-forest" transition={{ type: 'spring', stiffness: 400, damping: 32 }} />}
          <span className="relative block font-semibold">{inr(o.amount)}</span>
          <span className="relative block text-xs opacity-75">{o.label}</span>
        </button>
      ))}
    </div>
  );
}

function UpiPay({ booking, upi, token, onUpdated, type }) {
  const target = type === 'full' ? upi.full : upi.advance;
  const [copied, setCopied] = useState(false);
  const [txn, setTxn] = useState('');
  const [shot, setShot] = useState(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(upi.upiId);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch { /* clipboard blocked */ }
  };

  const pickFile = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) return setError('Please choose an image file');
    try {
      setShot(await compressImage(file));
      setError(null);
    } catch {
      setError('Could not read that image - try another screenshot');
    }
  };

  const submit = async (e) => {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const res = await api(`/bookings/${booking.id}/payments/upi`, { method: 'POST', body: { t: token, txn_id: txn.trim(), amount: target.amount, ...(shot ? { screenshot: shot } : {}) } });
      onUpdated(res.booking);
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="grid gap-8 md:grid-cols-[auto_1fr]">
      <div className="flex flex-col items-center">
        <motion.div initial={{ rotateY: 90, opacity: 0 }} animate={{ rotateY: 0, opacity: 1 }} transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }} className="relative rounded-3xl bg-white p-4 shadow-[0_20px_50px_-20px_rgba(11,42,30,0.5)] ring-1 ring-forest/10">
          <QRCodeSVG value={target.uri} size={200} level="M" fgColor="#0B2A1E" imageSettings={{ src: '/logo-192.png', height: 40, width: 40, excavate: true }} title={`UPI QR code to pay ${inr(target.amount)} to ${upi.payeeName}`} />
          <span className="absolute -inset-1 -z-10 animate-pulse rounded-[1.7rem] bg-gradient-to-br from-lime/40 to-teal/40 blur-md" />
        </motion.div>
        <p className="mt-3 text-center text-xs text-ink/60">Scan with any UPI app</p>
      </div>

      <div className="space-y-5">
        <div>
          <p className="text-sm text-ink/60">Pay to</p>
          <p className="font-display text-3xl text-forest">{upi.payeeName}</p>
          <button type="button" onClick={copy} className="mt-1 inline-flex items-center gap-2 rounded-full bg-cream px-3 py-1.5 font-mono text-sm text-forest transition hover:bg-cream-200">
            {upi.upiId} {copied ? <Check size={14} className="text-lime-700" /> : <Copy size={14} />}
            <span className="sr-only" aria-live="polite">{copied ? 'Copied' : ''}</span>
          </button>
        </div>
        <div className="rounded-2xl bg-forest p-4 text-cream">
          <p className="text-xs tracking-wider text-cream/60 uppercase">Amount</p>
          <p className="font-display text-5xl">{inr(target.amount)}</p>
          <p className="text-xs text-cream/60">Note / reference: {booking.code}</p>
        </div>
        <a href={target.uri} className="btn-primary w-full py-4 md:hidden">
          <Smartphone size={18} /> Pay with GPay / PhonePe / Paytm
        </a>
        <a href={target.uri} className="btn-outline hidden w-full md:inline-flex">
          <Smartphone size={18} /> Open UPI app (on phone)
        </a>
      </div>

      <form onSubmit={submit} className="space-y-4 border-t border-forest/10 pt-6 md:col-span-2">
        <p className="font-semibold text-forest">After paying, tell us the transaction ID</p>
        <div>
          <label htmlFor="txn" className="label">UPI transaction / reference ID (UTR)</label>
          <input id="txn" className="field font-mono" value={txn} onChange={(e) => setTxn(e.target.value)} placeholder="e.g. 412345678901" required minLength={6} maxLength={40} pattern="[A-Za-z0-9\-]{6,40}" autoComplete="off" />
          <p className="mt-1 text-xs text-ink/50">Find it in your UPI app under the payment details (usually 12 digits).</p>
        </div>
        <div>
          <span className="label">Screenshot <span className="font-normal text-ink/50">(optional)</span></span>
          {shot ? (
            <div className="relative inline-block">
              <img src={shot} alt="Payment screenshot preview" className="h-32 rounded-xl object-cover ring-1 ring-forest/10" />
              <button type="button" onClick={() => setShot(null)} aria-label="Remove screenshot" className="absolute -top-2 -right-2 grid h-7 w-7 place-items-center rounded-full bg-pin text-white shadow">
                <X size={14} />
              </button>
            </div>
          ) : (
            <label className="flex cursor-pointer items-center gap-3 rounded-2xl border-2 border-dashed border-forest/20 p-4 text-sm text-ink/60 transition hover:border-lime hover:bg-lime/5">
              <ImagePlus size={22} className="text-teal-700" /> Add payment screenshot
              <input type="file" accept="image/*" onChange={pickFile} className="sr-only" />
            </label>
          )}
        </div>
        {error && <p role="alert" className="rounded-xl bg-pin/10 p-3 text-sm text-pin">{error}</p>}
        <button type="submit" disabled={busy || txn.trim().length < 6} className="btn-dark w-full py-4">
          {busy ? <Spinner /> : <Check size={18} />} {busy ? 'Submitting…' : 'I have paid - submit for verification'}
        </button>
      </form>
    </div>
  );
}

function RazorpayPay({ booking, config, token, onUpdated, type }) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);

  const pay = async () => {
    setBusy(true);
    setError(null);
    try {
      const [Razorpay, { order }] = await Promise.all([loadRazorpay(), api(`/bookings/${booking.id}/payments/order`, { method: 'POST', body: { t: token, type } })]);
      await new Promise((resolve, reject) => {
        const rzp = new Razorpay({
          key: order.keyId,
          order_id: order.orderId,
          amount: order.amount,
          currency: order.currency,
          name: order.name,
          description: order.description,
          image: `${window.location.origin}/logo-192.png`,
          prefill: order.prefill,
          notes: order.notes,
          theme: { color: '#0B2A1E' },
          handler: async (resp) => {
            try {
              const res = await api(`/bookings/${booking.id}/payments/razorpay/verify`, { method: 'POST', body: { t: token, ...resp } });
              onUpdated(res.booking);
              resolve();
            } catch (err) {
              reject(err);
            }
          },
          modal: { ondismiss: () => resolve() }
        });
        rzp.on('payment.failed', (r) => reject(new Error(r.error?.description || 'Payment failed')));
        rzp.open();
      });
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  };

  const amount = type === 'full' ? booking.balance_due : Math.max(0, Math.min(booking.balance_due, booking.advance_amount - booking.amount_paid)) || booking.balance_due;
  return (
    <div className="space-y-5">
      {!config.live && <p className="inline-flex rounded-full bg-sun/20 px-3 py-1 text-xs font-semibold text-sun-600">Test mode - no real money is charged</p>}
      <p className="text-ink/70">Pay securely with UPI, debit/credit card or netbanking on Razorpay’s checkout. Your booking is confirmed automatically.</p>
      <div className="rounded-2xl bg-forest p-4 text-cream">
        <p className="text-xs tracking-wider text-cream/60 uppercase">Amount</p>
        <p className="font-display text-5xl">{inr(amount)}</p>
      </div>
      {error && <p role="alert" className="rounded-xl bg-pin/10 p-3 text-sm text-pin">{error}</p>}
      <button type="button" onClick={pay} disabled={busy} className="btn-primary w-full py-4 text-base">
        {busy ? <Spinner /> : <CreditCard size={18} />} {busy ? 'Opening secure checkout…' : `Pay ${inr(amount)} securely`}
      </button>
      <p className="flex items-center gap-2 text-xs text-ink/50">
        <ShieldCheck size={14} /> Card details are entered on Razorpay - we never see or store them.
      </p>
    </div>
  );
}

export default function PaymentPanel({ booking, upi, paymentsConfig, token, onUpdated }) {
  const methods = [
    upi && { id: 'upi', label: 'UPI', icon: QrCode },
    paymentsConfig?.razorpay?.enabled && { id: 'razorpay', label: 'Card / Online', icon: CreditCard }
  ].filter(Boolean);
  const [method, setMethod] = useState(methods.find((m) => m.id === booking.payment_method)?.id || methods[0]?.id);
  const [type, setType] = useState('advance');

  if (!methods.length) {
    return <p className="text-ink/70">Online payment isn’t set up yet - we’ll contact you with payment details. You can also WhatsApp us.</p>;
  }

  return (
    <div>
      {methods.length > 1 && (
        <div role="tablist" aria-label="Payment method" className="mb-6 flex gap-2">
          {methods.map((m) => (
            <button
              key={m.id}
              type="button"
              role="tab"
              aria-selected={method === m.id}
              onClick={() => setMethod(m.id)}
              className={`relative flex flex-1 items-center justify-center gap-2 rounded-2xl px-4 py-3 text-sm font-semibold transition ${method === m.id ? 'text-forest' : 'text-ink/60 hover:bg-cream'}`}
            >
              {method === m.id && <motion.span layoutId="method-pill" className="absolute inset-0 rounded-2xl bg-lime/20 ring-2 ring-lime" />}
              <m.icon size={18} className="relative" /> <span className="relative">{m.label}</span>
            </button>
          ))}
        </div>
      )}
      <AmountChoice booking={booking} value={type} onChange={setType} />
      <AnimatePresence mode="wait">
        <motion.div key={method + type} initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} transition={{ duration: 0.3 }}>
          {method === 'upi' ? (
            <UpiPay booking={booking} upi={upi} token={token} onUpdated={onUpdated} type={type} />
          ) : (
            <RazorpayPay booking={booking} config={paymentsConfig.razorpay} token={token} onUpdated={onUpdated} type={type} />
          )}
        </motion.div>
      </AnimatePresence>
    </div>
  );
}
