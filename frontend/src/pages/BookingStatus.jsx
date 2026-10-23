import { useCallback, useEffect, useRef, useState } from 'react';
import { Link, useLocation, useParams, useSearchParams } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { CalendarDays, Check, Clock, MessageCircle, Phone, Printer, Users } from 'lucide-react';
import { api } from '../lib/api.js';
import { BUSINESS } from '../lib/site.js';
import { inr, prettyDate, STATUS_LABEL } from '../lib/format.js';
import { Seo, Spinner, StatusPill } from '../components/ui.jsx';
import PaymentPanel from '../booking/PaymentPanel.jsx';

function Confetti() {
  const colors = ['#7CB342', '#F5A623', '#2A9DB5', '#F5F1E3', '#E53935'];
  return (
    <div aria-hidden className="pointer-events-none absolute inset-0 overflow-hidden">
      {Array.from({ length: 36 }, (_, i) => {
        const angle = (i / 36) * Math.PI * 2;
        const dist = 120 + (i % 5) * 40;
        return (
          <motion.span
            key={i}
            className="absolute top-1/2 left-1/2 h-2.5 w-1.5 rounded-sm"
            style={{ background: colors[i % colors.length] }}
            initial={{ x: 0, y: 0, opacity: 1, rotate: 0 }}
            animate={{ x: Math.cos(angle) * dist, y: Math.sin(angle) * dist + 80, opacity: 0, rotate: 360 + i * 20 }}
            transition={{ duration: 1.6, delay: 0.3, ease: [0.16, 1, 0.3, 1] }}
          />
        );
      })}
    </div>
  );
}

function Timeline({ booking }) {
  const paid = ['advance_paid', 'paid'].includes(booking.payment_status);
  const steps = [
    { label: 'Requested', done: true },
    { label: booking.payment_status === 'proof_submitted' ? 'Verifying payment' : 'Advance paid', done: paid, active: booking.payment_status === 'proof_submitted' || (!paid && booking.status === 'pending') },
    { label: 'Confirmed', done: booking.status === 'confirmed' }
  ];
  return (
    <ol className="flex items-center" aria-label="Booking progress">
      {steps.map((s, i) => (
        <li key={s.label} className="flex flex-1 items-center last:flex-none">
          <div className="flex flex-col items-center gap-2">
            <motion.span
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ delay: 0.2 + i * 0.2, type: 'spring' }}
              className={`relative grid h-10 w-10 place-items-center rounded-full ${s.done ? 'bg-lime text-forest' : s.active ? 'bg-sun text-forest' : 'bg-cream/15 text-cream/60'}`}
            >
              {s.done ? <Check size={18} strokeWidth={3} /> : s.active ? <Clock size={18} /> : i + 1}
              {s.active && !s.done && <span className="absolute inset-0 animate-ping-slow rounded-full bg-sun/50" />}
            </motion.span>
            <span className={`text-center text-xs font-medium whitespace-nowrap ${s.done || s.active ? 'text-cream' : 'text-cream/50'}`}>{s.label}</span>
          </div>
          {i < steps.length - 1 && (
            <div className="mx-2 mb-6 h-1 flex-1 overflow-hidden rounded-full bg-cream/15">
              <motion.div className="h-full bg-lime" initial={{ width: 0 }} animate={{ width: steps[i + 1].done || steps[i + 1].active ? '100%' : '0%' }} transition={{ delay: 0.4 + i * 0.3, duration: 0.8 }} />
            </div>
          )}
        </li>
      ))}
    </ol>
  );
}

export default function BookingStatus() {
  const { id } = useParams();
  const [params] = useSearchParams();
  const token = params.get('t') || '';
  const location = useLocation();
  const fresh = location.state?.fresh;
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);
  const [payBalance, setPayBalance] = useState(false);

  const load = useCallback(async () => {
    try {
      setData(await api(`/bookings/${id}?t=${encodeURIComponent(token)}`));
      setError(null);
    } catch (err) {
      setError(err);
    }
  }, [id, token]);

  useEffect(() => { load(); }, [load]);

  // Until the camp confirms, check back every 10s (and straight away when the guest returns to the tab),
  // so the page turns to "confirmed" by itself the moment the admin records the payment.
  const waiting = data?.booking.status === 'pending';
  useEffect(() => {
    if (!waiting) return;
    const tick = () => document.visibilityState === 'visible' && load();
    const t = setInterval(tick, 10000);
    document.addEventListener('visibilitychange', tick);
    window.addEventListener('focus', tick);
    return () => {
      clearInterval(t);
      document.removeEventListener('visibilitychange', tick);
      window.removeEventListener('focus', tick);
    };
  }, [waiting, load]);

  // Celebrate when the status flips to confirmed while the page is open
  const prevStatus = useRef(null);
  const [justConfirmed, setJustConfirmed] = useState(false);
  useEffect(() => {
    const status = data?.booking.status;
    if (prevStatus.current === 'pending' && status === 'confirmed') {
      setJustConfirmed(true);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
    if (status) prevStatus.current = status;
  }, [data?.booking.status]);

  if (error) {
    return (
      <section className="bg-forest pt-40 pb-40 text-center text-cream">
        <Seo title="Booking" noindex />
        <h1 className="text-6xl">Booking not found</h1>
        <p className="mx-auto mt-4 max-w-md text-cream/70">{error.status === 404 ? 'Please open the link from your confirmation email.' : error.message}</p>
        <Link to="/book" className="btn-primary mt-8">Make a booking</Link>
      </section>
    );
  }

  if (!data) {
    return (
      <section className="grid min-h-[70vh] place-items-center bg-forest text-cream" role="status">
        <Spinner className="h-10 w-10" />
        <span className="sr-only">Loading booking</span>
      </section>
    );
  }

  const b = data.booking;
  // UPI is handled on WhatsApp, so the page only offers online (Razorpay) payment when it is set up
  const canPay = Boolean(data.payments?.razorpay?.enabled) && b.status !== 'cancelled' && !['paid', 'refunded', 'proof_submitted'].includes(b.payment_status) && b.balance_due > 0 && b.dates_available;
  const heading =
    b.status === 'cancelled' ? 'Booking cancelled' : b.status === 'confirmed' ? 'You’re all set!' : b.payment_status === 'proof_submitted' ? 'Payment received - verifying' : fresh ? 'Request received!' : 'Complete your booking';

  return (
    <>
      <Seo title={`Booking ${b.code}`} noindex />
      <section className="grain relative overflow-hidden bg-forest pt-32 pb-16 text-cream sm:pt-40">
        {(fresh || b.status === 'confirmed') && <Confetti key={b.status} />}
        <div className="container-x relative max-w-4xl">
          <motion.div key={b.status} initial={{ scale: 0, rotate: -45 }} animate={{ scale: 1, rotate: 0 }} transition={{ type: 'spring', stiffness: 200, damping: 14 }} className={`mb-6 grid h-16 w-16 place-items-center rounded-full ${b.status === 'cancelled' ? 'bg-pin' : b.status === 'confirmed' ? 'bg-lime' : 'bg-sun'} text-forest shadow-xl`}>
            {b.status === 'confirmed' ? <Check size={32} strokeWidth={3} /> : <CalendarDays size={28} />}
          </motion.div>
          <p className="font-mono text-sm text-cream/60">Booking ref {b.code}</p>
          <AnimatePresence>
            {justConfirmed && (
              <motion.p role="status" initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }} className="mb-3 inline-flex items-center gap-2 rounded-full bg-lime px-4 py-1.5 text-sm font-bold text-forest shadow-lg">
                <Check size={16} strokeWidth={3} /> Payment received - your booking is confirmed!
              </motion.p>
            )}
          </AnimatePresence>
          <motion.h1 key={heading} initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }} className="mt-1 text-6xl leading-[0.9] sm:text-7xl">
            {heading}
          </motion.h1>
          {b.status === 'pending' && b.payment_status === 'unpaid' && b.dates_available && (
            <p className="mt-4 max-w-2xl text-cream/75">
              We’ve emailed {b.email} a copy. Your dates are held until <strong>{new Date(b.hold_expires_at).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' })}</strong> - {b.payment_method === 'razorpay' && data.payments?.razorpay?.enabled ? `pay the advance of ${inr(b.advance_amount - b.amount_paid)} below to confirm.` : `send your booking on WhatsApp and we’ll share the payment details for the ${inr(b.advance_amount - b.amount_paid)} advance.`}
            </p>
          )}
          {b.status === 'pending' && b.payment_status === 'unpaid' && b.dates_available && (
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.35 }} className="mt-6 flex flex-col gap-3 sm:flex-row sm:items-center">
              <a href={location.state?.whatsappUrl || b.whatsapp_url} target="_blank" rel="noopener noreferrer" className="btn bg-[#25D366] px-7 py-4 text-base text-white shadow-[0_10px_30px_-10px_rgba(37,211,102,0.9)] hover:bg-[#1fb457]">
                <MessageCircle size={20} /> {location.state?.waOpened ? 'Open WhatsApp again' : 'Send booking on WhatsApp'}
              </a>
              <p className="text-sm text-cream/70">We’ll reply with the payment details. Your booking is confirmed as soon as the advance reaches us.</p>
            </motion.div>
          )}
          {b.payment_status === 'proof_submitted' && <p className="mt-4 max-w-2xl text-cream/75">Thanks! We’re checking your UPI payment. You’ll get a confirmation email with your receipt as soon as it’s verified - this page updates by itself.</p>}
          {b.status === 'confirmed' && <p className="mt-4 max-w-2xl text-cream/75">Your stay is confirmed and a receipt is in your inbox. See you by the river!</p>}
          {!b.dates_available && b.status === 'pending' && (
            <p className="mt-4 max-w-2xl rounded-2xl bg-pin/20 p-4 text-cream">Your hold expired and these dates have since been booked. Please contact us - we’ll gladly help you find other dates.</p>
          )}
          <div className="mt-10 max-w-xl">
            <Timeline booking={b} />
          </div>
        </div>
      </section>

      <section className="container-x grid max-w-6xl gap-8 py-14 pb-36 lg:grid-cols-[1fr_360px]">
        <div className="min-w-0 space-y-8">
          {b.status === 'confirmed' && b.confirmed_text && (
            <motion.div initial={{ opacity: 0, y: 30, scale: 0.97 }} animate={{ opacity: 1, y: 0, scale: 1 }} transition={{ delay: 0.2, type: 'spring', stiffness: 120 }} className="card relative overflow-hidden p-6 ring-2 ring-lime sm:p-8">
              <span aria-hidden className="absolute -top-16 -right-16 h-44 w-44 rounded-full bg-lime/25 blur-2xl" />
              <p className="relative text-[15px] leading-relaxed break-words whitespace-pre-line text-ink/80 [&::first-line]:font-display [&::first-line]:text-3xl [&::first-line]:text-forest">
                {/* the guest is already on this page, so the link to it (meant for WhatsApp) is left out here */}
                {b.confirmed_text.split('\n').filter((line) => !line.startsWith('Your booking & receipt:')).join('\n')}
              </p>
            </motion.div>
          )}
          {b.status === 'pending' && b.thank_you_text && (
            <motion.div initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }} className="card relative overflow-hidden p-6 sm:p-8">
              <span aria-hidden className="absolute -top-16 -right-16 h-44 w-44 rounded-full bg-lime/15 blur-2xl" />
              <p className="relative text-[15px] leading-relaxed whitespace-pre-line text-ink/80 [&::first-line]:font-display [&::first-line]:text-3xl [&::first-line]:text-forest">{b.thank_you_text}</p>
            </motion.div>
          )}
          <AnimatePresence>
            {canPay && (
              <motion.div initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, height: 0 }} className="card p-6 sm:p-8">
                <h2 className="mb-2 text-4xl text-forest">{b.amount_paid > 0 ? `Balance ${inr(b.balance_due)}` : 'Pay your advance'}</h2>
                {b.amount_paid > 0 && !payBalance ? (
                  <div className="flex flex-wrap items-center justify-between gap-4">
                    <p className="text-ink/70">Pay the balance at the camp when you arrive - or settle it online now if you prefer.</p>
                    <button type="button" onClick={() => setPayBalance(true)} className="btn-outline">Pay balance online now</button>
                  </div>
                ) : (
                  <div className="mt-4"><PaymentPanel booking={b} upi={null} paymentsConfig={data.payments} token={token} onUpdated={load} /></div>
                )}
              </motion.div>
            )}
          </AnimatePresence>

          {b.payments.length > 0 && (
            <div className="card p-6 sm:p-8">
              <h2 className="mb-4 text-3xl text-forest">Payments</h2>
              <ul className="divide-y divide-forest/10">
                {b.payments.map((p) => (
                  <li key={p.id} className="flex flex-wrap items-center justify-between gap-2 py-3 text-sm">
                    <span>
                      <span className="font-semibold text-forest">{inr(p.amount)}</span> · {p.method === 'property' ? 'At property' : p.method.toUpperCase()}
                      {p.txn_id && <span className="ml-2 font-mono text-xs text-ink/50">{p.txn_id}</span>}
                    </span>
                    <StatusPill value={p.status} />
                  </li>
                ))}
              </ul>
              {b.amount_paid > 0 && (
                <button type="button" onClick={() => window.print()} className="btn-outline mt-4 print:hidden">
                  <Printer size={16} /> Print receipt
                </button>
              )}
            </div>
          )}
        </div>

        <aside className="space-y-4 lg:sticky lg:top-28 lg:self-start">
          <div className="card overflow-hidden">
            {b.tent?.image && <img src={b.tent.image} alt="" className="h-36 w-full object-cover" />}
            <div className="space-y-3 p-6 text-sm">
              <div className="flex items-center justify-between gap-2">
                <p className="font-display text-3xl text-forest">{b.tent?.name}</p>
                <StatusPill value={b.status} />
              </div>
              <p className="flex items-center gap-2 text-ink/70"><CalendarDays size={16} /> {prettyDate(b.check_in)} → {prettyDate(b.check_out)} · {b.nights} night{b.nights > 1 ? 's' : ''}</p>
              <p className="flex items-center gap-2 text-ink/70"><Users size={16} /> {b.guests} guest{b.guests > 1 ? 's' : ''} · {b.guest_name}</p>
              <div className="space-y-1.5 border-t border-forest/10 pt-3">
                <div className="flex justify-between"><span>Subtotal</span><span>{inr(b.subtotal)}</span></div>
                {b.tax_amount > 0 && <div className="flex justify-between"><span>Taxes</span><span>{inr(b.tax_amount)}</span></div>}
                <div className="flex justify-between font-semibold text-forest"><span>Total</span><span>{inr(b.total_price)}</span></div>
                <div className="flex justify-between text-lime-700"><span>Paid</span><span>{inr(b.amount_paid)}</span></div>
                <div className="flex justify-between"><span>Balance (at property)</span><span>{inr(b.balance_due)}</span></div>
              </div>
              <p className="text-xs text-ink/50">Payment: {STATUS_LABEL[b.payment_status]}</p>
            </div>
          </div>
          <a href={location.state?.whatsappUrl || b.whatsapp_url} target="_blank" rel="noopener noreferrer" className="btn w-full bg-[#25D366] py-3.5 text-white hover:bg-[#1fb457]">
            <MessageCircle size={18} /> Send details on WhatsApp
          </a>
          <a href={`tel:+91${BUSINESS.phones[0].number}`} className="btn-outline w-full">
            <Phone size={16} /> Call {BUSINESS.phones[0].name} · {BUSINESS.phones[0].number}
          </a>
        </aside>
      </section>
    </>
  );
}
