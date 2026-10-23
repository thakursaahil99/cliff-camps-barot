import { useCallback, useEffect, useState } from 'react';
import { Link, Navigate, useNavigate, useSearchParams } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { Ban, CalendarDays, Check, CircleCheck, Copy, Eye, LogOut, MessageCircle, Plus, RefreshCw, Save, Search, Tent, Trash2, Wallet, X } from 'lucide-react';
import { api, adminToken, qs } from '../../lib/api.js';
import { inr, prettyDate, toISO } from '../../lib/format.js';
import { Logo, Seo, Spinner, StatusPill } from '../../components/ui.jsx';

const TABS = [
  { id: 'bookings', label: 'Bookings', icon: CalendarDays },
  { id: 'payments', label: 'Payments', icon: Wallet },
  { id: 'calendar', label: 'Calendar', icon: Ban },
  { id: 'tents', label: 'Tents & prices', icon: Tent }
];

function useAdmin(path, deps = []) {
  const [state, setState] = useState({ data: null, error: null, loading: true });
  const navigate = useNavigate();
  const load = useCallback(async () => {
    setState((s) => ({ ...s, loading: true }));
    try {
      setState({ data: await api(path, { admin: true }), error: null, loading: false });
    } catch (error) {
      if (error.status === 401) navigate('/admin/login', { replace: true });
      setState({ data: null, error, loading: false });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [path, ...deps]);
  useEffect(() => { load(); }, [load]);
  return { ...state, reload: load };
}

function Toast({ toast }) {
  return (
    <AnimatePresence>
      {toast && (
        <motion.div
          key={toast.id}
          role="status"
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 30 }}
          className={`fixed bottom-6 left-1/2 z-[95] -translate-x-1/2 rounded-full px-5 py-3 text-sm font-semibold shadow-xl ${toast.error ? 'bg-pin text-white' : 'bg-forest text-cream'}`}
        >
          {toast.text}
        </motion.div>
      )}
    </AnimatePresence>
  );
}

// ------------------------------------------------------------------ bookings
/** wa.me link to the guest's own number, with a confirmation (or follow-up) message ready to send. */
function guestWhatsapp(b) {
  const digits = b.phone.replace(/\D/g, '');
  const number = digits.length === 10 ? `91${digits}` : digits.replace(/^0+/, '');
  const stay = `${prettyDate(b.check_in, { year: 'numeric' })} to ${prettyDate(b.check_out, { year: 'numeric' })} (${b.nights} night${b.nights > 1 ? 's' : ''})`;
  const text = b.status === 'confirmed'
    ? [
        `Hi ${b.guest_name}! Your booking at Cliff Camps, Barot is confirmed ✅`,
        `Ref: ${b.code}`,
        `Tent: ${b.tent?.name || ''} · ${b.guests} guest${b.guests > 1 ? 's' : ''}`,
        `Dates: ${stay}`,
        `Paid: ${inr(b.amount_paid)} · Balance at the camp: ${inr(b.balance_due)}`,
        `Your booking & receipt: ${b.guest_link}`,
        '',
        'See you by the river!'
      ]
    : b.status === 'pending' && b.thank_you_text
      ? [b.thank_you_text]
      : [`Hi ${b.guest_name}, this is Cliff Camps, Barot about your booking ${b.code} (${stay}).`, `Your booking page: ${b.guest_link}`];
  return `https://wa.me/${number}?text=${encodeURIComponent(text.join('\n'))}`;
}

/** UPI payment the guest sent a screenshot of on WhatsApp - check it in the bank app first, then record it here. */
function RecordPayment({ booking, busy, onRecord }) {
  const due = booking.amount_paid > 0 ? booking.balance_due : Math.min(booking.advance_amount, booking.balance_due);
  const [amount, setAmount] = useState(String(due));
  const [txn, setTxn] = useState('');
  useEffect(() => { setAmount(String(due)); setTxn(''); }, [due]);
  const submit = (e) => {
    e.preventDefault();
    if (!window.confirm(`Have you checked in your bank / UPI app that ${inr(Number(amount))} has arrived?\n\nThe booking will be confirmed and the guest emailed a receipt.`)) return;
    onRecord({ amount: Number(amount), txn_id: txn.trim() });
  };
  return (
    <form onSubmit={submit} className="space-y-3 rounded-2xl bg-white p-4 ring-1 ring-lime/40">
      <p className="font-semibold text-forest">Payment received on WhatsApp / UPI</p>
      <p className="text-xs text-ink/60">Screenshots can be faked - first check that the money is in your bank or UPI app, and match the UTR.</p>
      <div className="grid grid-cols-2 gap-2">
        <div>
          <label htmlFor="rp-amount" className="label">Amount (₹)</label>
          <input id="rp-amount" type="number" min={1} max={booking.balance_due} step="1" required className="field" value={amount} onChange={(e) => setAmount(e.target.value)} />
        </div>
        <div>
          <label htmlFor="rp-txn" className="label">UTR <span className="font-normal text-ink/50">(optional)</span></label>
          <input id="rp-txn" className="field font-mono" value={txn} onChange={(e) => setTxn(e.target.value)} placeholder="412345678901" minLength={6} maxLength={40} pattern="[A-Za-z0-9\-]{6,40}" autoComplete="off" />
        </div>
      </div>
      <button type="submit" disabled={!!busy || !(Number(amount) > 0)} className="btn-primary w-full">
        {busy === 'record_payment' ? <Spinner /> : <CircleCheck size={16} />} {booking.amount_paid > 0 ? 'Balance received' : 'Advance received'} - confirm booking
      </button>
    </form>
  );
}

function BookingDrawer({ id, onClose, onChanged, notify }) {
  const { data, loading, reload } = useAdmin(`/admin/bookings/${id}`);
  const [notes, setNotes] = useState('');
  const [busy, setBusy] = useState(null);
  useEffect(() => { if (data) setNotes(data.booking.admin_notes || ''); }, [data]);

  const act = async (action, extra = {}) => {
    const confirmText = { cancel: 'Cancel this booking? The guest will be emailed.', refund: 'Mark all payments refunded and cancel the booking?', mark_paid: 'Record the remaining balance as paid at the property?' }[action];
    if (confirmText && !window.confirm(confirmText)) return;
    setBusy(action);
    try {
      await api(`/admin/bookings/${id}`, { method: 'PATCH', admin: true, body: { action, ...extra } });
      notify(action === 'note' ? 'Notes saved' : action === 'record_payment' ? 'Payment recorded - booking confirmed and receipt emailed' : `Booking ${action.replace('_', ' ')} done`);
      reload();
      onChanged();
    } catch (err) {
      if (err.status === 409 && action === 'confirm' && window.confirm(`${err.message}\n\nConfirm anyway?`)) {
        setBusy(null);
        return act('confirm', { force: true });
      }
      notify(err.message, true);
    } finally {
      setBusy(null);
    }
  };

  const b = data?.booking;
  return (
    <motion.div className="fixed inset-0 z-[80] flex justify-end bg-forest/40 backdrop-blur-sm" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={onClose}>
      <motion.aside
        role="dialog"
        aria-modal="true"
        aria-label="Booking details"
        initial={{ x: '100%' }}
        animate={{ x: 0 }}
        exit={{ x: '100%' }}
        transition={{ type: 'spring', stiffness: 300, damping: 34 }}
        className="h-full w-full max-w-lg overflow-y-auto bg-cream p-6 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-6 flex items-center justify-between">
          <h2 className="text-3xl text-forest">{b ? b.code : 'Booking'}</h2>
          <button type="button" onClick={onClose} aria-label="Close" className="grid h-10 w-10 place-items-center rounded-full hover:bg-forest/10"><X /></button>
        </div>
        {loading && !b && <Spinner />}
        {b && (
          <div className="space-y-6 text-sm">
            <div className="flex flex-wrap gap-2"><StatusPill value={b.status} /><StatusPill value={b.payment_status} /></div>
            <dl className="grid grid-cols-2 gap-3">
              {[
                ['Guest', b.guest_name],
                ['Guests', b.guests],
                ['Phone', <a key="p" className="link" href={`tel:${b.phone}`}>{b.phone}</a>],
                ['Email', <a key="e" className="link break-all" href={`mailto:${b.email}`}>{b.email}</a>],
                ['Tent', b.tent?.name],
                ['Nights', b.nights],
                ['Check-in', prettyDate(b.check_in, { year: 'numeric' })],
                ['Check-out', prettyDate(b.check_out, { year: 'numeric' })],
                ['Total', inr(b.total_price)],
                ['Advance', inr(b.advance_amount)],
                ['Paid', inr(b.amount_paid)],
                ['Balance', inr(b.balance_due)]
              ].map(([k, v]) => (
                <div key={k} className="rounded-xl bg-white p-3">
                  <dt className="text-xs text-ink/50">{k}</dt>
                  <dd className="font-medium text-forest">{v}</dd>
                </div>
              ))}
            </dl>
            {b.notes && <p className="rounded-xl bg-white p-3"><span className="block text-xs text-ink/50">Guest requests</span>{b.notes}</p>}
            <p className="text-xs text-ink/50">Created {new Date(b.created_at).toLocaleString('en-IN')} · preferred payment: {b.payment_method || '-'}</p>

            <div className="grid grid-cols-2 gap-2">
              <button type="button" disabled={!!busy || b.status === 'confirmed'} onClick={() => act('confirm')} className="btn-primary">{busy === 'confirm' ? <Spinner /> : <Check size={16} />} Confirm</button>
              <button type="button" disabled={!!busy || b.payment_status === 'paid'} onClick={() => act('mark_paid')} className="btn-sun">{busy === 'mark_paid' ? <Spinner /> : <Wallet size={16} />} Mark paid</button>
              <button type="button" disabled={!!busy || b.status === 'cancelled'} onClick={() => act('cancel')} className="btn-outline">{busy === 'cancel' ? <Spinner /> : <Ban size={16} />} Cancel</button>
              <button type="button" disabled={!!busy || b.amount_paid <= 0 || b.payment_status === 'refunded'} onClick={() => act('refund')} className="btn-outline">{busy === 'refund' ? <Spinner /> : <RefreshCw size={16} />} Refunded</button>
            </div>

            {b.status !== 'cancelled' && b.balance_due > 0 && <RecordPayment booking={b} busy={busy} onRecord={(body) => act('record_payment', body)} />}

            <a href={guestWhatsapp(b)} target="_blank" rel="noopener noreferrer" className="btn w-full bg-[#25D366] text-white hover:bg-[#1fb457]">
              <MessageCircle size={16} /> {b.status === 'confirmed' ? 'Send confirmation on WhatsApp' : b.status === 'pending' ? 'Send thank-you on WhatsApp' : 'Message guest on WhatsApp'}
            </a>

            <div>
              <label htmlFor="admin-notes" className="label">Admin notes (private)</label>
              <textarea id="admin-notes" rows={3} className="field" value={notes} onChange={(e) => setNotes(e.target.value)} />
              <button type="button" onClick={() => act('note', { admin_notes: notes })} className="btn-dark mt-2"><Save size={16} /> Save notes</button>
            </div>

            <div>
              <h3 className="mb-2 font-sans text-sm font-semibold text-forest">Payments</h3>
              {data.payments.length === 0 && <p className="text-ink/50">No payments yet.</p>}
              <ul className="space-y-2">
                {data.payments.map((p) => (
                  <li key={p.id} className="flex items-center justify-between rounded-xl bg-white p-3">
                    <span>{inr(p.amount)} · {p.method} {p.txn_id && <span className="font-mono text-xs text-ink/50">{p.txn_id}</span>}</span>
                    <StatusPill value={p.status} />
                  </li>
                ))}
              </ul>
            </div>
          </div>
        )}
      </motion.aside>
    </motion.div>
  );
}

function BookingsTab({ notify, openId, setOpenId }) {
  const [filters, setFilters] = useState({ status: '', payment_status: '', q: '' });
  const [q, setQ] = useState('');
  useEffect(() => {
    const t = setTimeout(() => setFilters((f) => ({ ...f, q })), 350);
    return () => clearTimeout(t);
  }, [q]);
  const { data, loading, reload } = useAdmin(`/admin/bookings${qs(filters)}`);

  return (
    <div>
      <div className="mb-5 flex flex-wrap gap-3">
        <div className="relative min-w-[220px] flex-1">
          <Search size={16} className="absolute top-1/2 left-4 -translate-y-1/2 text-ink/40" />
          <input aria-label="Search bookings" className="field pl-10" placeholder="Name, phone, email or ref…" value={q} onChange={(e) => setQ(e.target.value)} />
        </div>
        <select aria-label="Filter by status" className="field w-auto" value={filters.status} onChange={(e) => setFilters((f) => ({ ...f, status: e.target.value }))}>
          <option value="">All statuses</option>
          <option value="pending">Pending</option>
          <option value="confirmed">Confirmed</option>
          <option value="cancelled">Cancelled</option>
        </select>
        <select aria-label="Filter by payment" className="field w-auto" value={filters.payment_status} onChange={(e) => setFilters((f) => ({ ...f, payment_status: e.target.value }))}>
          <option value="">All payments</option>
          <option value="unpaid">Unpaid</option>
          <option value="proof_submitted">Payment submitted</option>
          <option value="advance_paid">Advance paid</option>
          <option value="paid">Fully paid</option>
          <option value="refunded">Refunded</option>
        </select>
        <button type="button" onClick={reload} className="btn-outline" aria-label="Refresh"><RefreshCw size={16} className={loading ? 'animate-spin' : ''} /></button>
      </div>

      {data?.bookings.length === 0 && <p className="rounded-2xl bg-white p-8 text-center text-ink/50">No bookings match.</p>}
      <div className="overflow-hidden rounded-2xl bg-white shadow-sm">
        <table className="w-full text-left text-sm">
          <thead className="hidden bg-forest/5 text-xs text-ink/60 uppercase md:table-header-group">
            <tr><th className="p-3">Ref</th><th className="p-3">Guest</th><th className="p-3">Tent</th><th className="p-3">Dates</th><th className="p-3">Total</th><th className="p-3">Status</th></tr>
          </thead>
          <tbody>
            {data?.bookings.map((b, i) => (
              <motion.tr
                key={b.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: Math.min(i * 0.02, 0.3) }}
                onClick={() => setOpenId(b.id)}
                onKeyDown={(e) => e.key === 'Enter' && setOpenId(b.id)}
                tabIndex={0}
                className="grid cursor-pointer grid-cols-2 gap-1 border-t border-forest/5 p-3 transition hover:bg-lime/5 md:table-row md:p-0"
              >
                <td className="font-mono text-xs md:p-3">{b.code}</td>
                <td className="md:p-3"><span className="font-medium text-forest">{b.guest_name}</span><span className="block text-xs text-ink/50">{b.phone}</span></td>
                <td className="md:p-3">{b.tent?.name}</td>
                <td className="md:p-3">{prettyDate(b.check_in)} → {prettyDate(b.check_out)}</td>
                <td className="md:p-3">{inr(b.total_price)}<span className="block text-xs text-ink/50">paid {inr(b.amount_paid)}</span></td>
                <td className="flex flex-wrap gap-1 md:table-cell md:p-3"><StatusPill value={b.status} /> <StatusPill value={b.payment_status} /></td>
              </motion.tr>
            ))}
          </tbody>
        </table>
      </div>
      <AnimatePresence>{openId && <BookingDrawer id={openId} onClose={() => setOpenId(null)} onChanged={reload} notify={notify} />}</AnimatePresence>
    </div>
  );
}

// ------------------------------------------------------------------ payments
function PaymentsTab({ notify, onOpenBooking }) {
  const [status, setStatus] = useState('submitted');
  const { data, loading, reload } = useAdmin(`/admin/payments${qs({ status })}`);
  const [proof, setProof] = useState(null);
  const [busy, setBusy] = useState(null);

  const act = async (p, action) => {
    if (action === 'reject' && !window.confirm('Reject this payment? The booking goes back to unpaid.')) return;
    setBusy(p.id + action);
    try {
      await api(`/admin/payments/${p.id}`, { method: 'PATCH', admin: true, body: { action } });
      notify(action === 'verify' ? 'Payment verified - booking confirmed & receipt emailed' : `Payment ${action}ed`);
      reload();
    } catch (err) {
      notify(err.message, true);
    } finally {
      setBusy(null);
    }
  };
  const viewProof = async (p) => {
    try {
      setProof((await api(`/admin/payments/${p.id}/proof`, { admin: true })).url);
    } catch (err) {
      notify(err.message, true);
    }
  };

  return (
    <div>
      <div className="mb-5 flex flex-wrap items-center gap-2">
        {['submitted', 'verified', 'captured', 'rejected', 'refunded', ''].map((s) => (
          <button key={s || 'all'} type="button" onClick={() => setStatus(s)} className={`rounded-full px-4 py-2 text-sm font-semibold transition ${status === s ? 'bg-forest text-cream' : 'bg-white text-forest hover:bg-forest/5'}`}>
            {s ? (s === 'submitted' ? 'To verify' : s[0].toUpperCase() + s.slice(1)) : 'All'}
          </button>
        ))}
        <button type="button" onClick={reload} className="btn-outline ml-auto" aria-label="Refresh"><RefreshCw size={16} className={loading ? 'animate-spin' : ''} /></button>
      </div>
      {status === 'submitted' && <p className="mb-4 text-sm text-ink/60">Check each UPI transaction ID against your bank / UPI app before verifying. Verifying confirms the booking and emails the guest a receipt.</p>}
      {data?.payments.length === 0 && <p className="rounded-2xl bg-white p-8 text-center text-ink/50">Nothing here.</p>}
      <div className="grid gap-3 md:grid-cols-2">
        {data?.payments.map((p) => (
          <motion.div layout key={p.id} initial={{ opacity: 0, scale: 0.97 }} animate={{ opacity: 1, scale: 1 }} className="rounded-2xl bg-white p-5 shadow-sm">
            <div className="flex items-start justify-between gap-2">
              <div>
                <p className="font-display text-3xl text-forest">{inr(p.amount)}</p>
                <p className="text-xs text-ink/50">{p.method.toUpperCase()} · {new Date(p.created_at).toLocaleString('en-IN')}</p>
              </div>
              <StatusPill value={p.status} />
            </div>
            {p.txn_id && <p className="mt-3 rounded-xl bg-cream p-2 font-mono text-sm">{p.txn_id}</p>}
            {p.booking && (
              <button type="button" onClick={() => onOpenBooking(p.booking.id)} className="link mt-2 block text-left text-sm">
                {p.booking.code} · {p.booking.guest_name} · {prettyDate(p.booking.check_in)} ({inr(p.booking.total_price)} total)
              </button>
            )}
            <div className="mt-4 flex flex-wrap gap-2">
              {p.proof_path && <button type="button" onClick={() => viewProof(p)} className="btn-outline px-4 py-2"><Eye size={14} /> Screenshot</button>}
              {['submitted', 'created', 'rejected'].includes(p.status) && (
                <button type="button" disabled={!!busy} onClick={() => act(p, 'verify')} className="btn-primary px-4 py-2">{busy === p.id + 'verify' ? <Spinner className="h-4 w-4" /> : <CircleCheck size={14} />} Verify & confirm</button>
              )}
              {['submitted', 'created'].includes(p.status) && (
                <button type="button" disabled={!!busy} onClick={() => act(p, 'reject')} className="btn-outline px-4 py-2"><X size={14} /> Reject</button>
              )}
              {['verified', 'captured'].includes(p.status) && (
                <button type="button" disabled={!!busy} onClick={() => window.confirm('Mark this payment refunded? (Do the actual refund in your bank / Razorpay dashboard.)') && act(p, 'refund')} className="btn-outline px-4 py-2"><RefreshCw size={14} /> Mark refunded</button>
              )}
            </div>
          </motion.div>
        ))}
      </div>
      <AnimatePresence>
        {proof && (
          <motion.div className="fixed inset-0 z-[90] grid place-items-center bg-forest/80 p-4" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setProof(null)}>
            <motion.img initial={{ scale: 0.9 }} animate={{ scale: 1 }} src={proof} alt="UPI payment screenshot" className="max-h-[85vh] rounded-2xl shadow-2xl" />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ------------------------------------------------------------------ calendar / blocked dates
function CalendarTab({ notify }) {
  const today = toISO(new Date());
  const { data: tentsData } = useAdmin('/admin/tents');
  const { data: settings } = useAdmin('/admin/settings');
  const { data, reload } = useAdmin(`/admin/blocked-dates${qs({ from: today })}`);
  const [form, setForm] = useState({ tent_id: '', from: today, to: today, reason: '', units: '' });
  const [busy, setBusy] = useState(false);
  const tents = tentsData?.tents || [];
  const tentName = (id) => (id ? tents.find((t) => t.id === id)?.name || 'Tent' : 'Whole camp');

  const add = async (e) => {
    e.preventDefault();
    setBusy(true);
    try {
      const r = await api('/admin/blocked-dates', {
        method: 'POST',
        admin: true,
        body: { tent_id: form.tent_id || null, from: form.from, to: form.to, reason: form.reason || undefined, units: form.units ? Number(form.units) : null }
      });
      notify(`${r.blocked.length} night(s) blocked`);
      reload();
    } catch (err) {
      notify(err.message, true);
    } finally {
      setBusy(false);
    }
  };
  const remove = async (id) => {
    try {
      await api(`/admin/blocked-dates/${id}`, { method: 'DELETE', admin: true });
      reload();
    } catch (err) {
      notify(err.message, true);
    }
  };
  const sync = async () => {
    setBusy(true);
    try {
      const r = await api('/admin/sync-airbnb', { method: 'POST', admin: true });
      notify(r.skipped ? r.reason : `Airbnb synced: ${r.nights} night(s) blocked`, r.skipped);
      reload();
    } catch (err) {
      notify(err.message, true);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="grid gap-6 lg:grid-cols-[380px_1fr]">
      <div className="space-y-6">
        <form onSubmit={add} className="space-y-3 rounded-2xl bg-white p-5 shadow-sm">
          <h2 className="text-3xl text-forest">Block dates</h2>
          <p className="text-xs text-ink/50">E.g. bookings taken by phone, maintenance, or private events.</p>
          <div>
            <label htmlFor="b-tent" className="label">Applies to</label>
            <select id="b-tent" className="field" value={form.tent_id} onChange={(e) => setForm({ ...form, tent_id: e.target.value, units: e.target.value ? form.units : '' })}>
              <option value="">Whole camp</option>
              {tents.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
            </select>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label htmlFor="b-from" className="label">First night</label>
              <input id="b-from" type="date" className="field" min={today} value={form.from} onChange={(e) => setForm({ ...form, from: e.target.value, to: e.target.value > form.to ? e.target.value : form.to })} required />
            </div>
            <div>
              <label htmlFor="b-to" className="label">Last night</label>
              <input id="b-to" type="date" className="field" min={form.from} value={form.to} onChange={(e) => setForm({ ...form, to: e.target.value })} required />
            </div>
          </div>
          {form.tent_id && (
            <div>
              <label htmlFor="b-units" className="label">How many tents <span className="font-normal text-ink/50">(empty = all of this type)</span></label>
              <input id="b-units" type="number" min={1} className="field" value={form.units} onChange={(e) => setForm({ ...form, units: e.target.value })} />
            </div>
          )}
          <div>
            <label htmlFor="b-reason" className="label">Reason</label>
            <input id="b-reason" className="field" placeholder="Phone booking - Mr Sharma" value={form.reason} onChange={(e) => setForm({ ...form, reason: e.target.value })} />
          </div>
          <button type="submit" disabled={busy} className="btn-dark w-full"><Plus size={16} /> Block</button>
        </form>

        <div className="space-y-3 rounded-2xl bg-white p-5 shadow-sm">
          <h2 className="text-3xl text-forest">Airbnb sync</h2>
          <p className="text-sm text-ink/60">
            Airbnb bookings are pulled in every 30 minutes{settings?.airbnbSync.configured ? '' : ' once AIRBNB_ICAL_URL is set'}. To stop Airbnb double-booking website guests, add this feed in Airbnb → Calendar → Availability → Connect another calendar:
          </p>
          {settings && (
            <button type="button" onClick={() => navigator.clipboard?.writeText(settings.calendarFeed).then(() => notify('Feed URL copied'))} className="flex w-full items-center justify-between gap-2 rounded-xl bg-cream p-3 text-left font-mono text-xs break-all">
              {settings.calendarFeed} <Copy size={14} className="shrink-0" />
            </button>
          )}
          <button type="button" onClick={sync} disabled={busy} className="btn-outline w-full"><RefreshCw size={16} /> Sync Airbnb now</button>
        </div>
      </div>

      <div className="rounded-2xl bg-white p-5 shadow-sm">
        <h2 className="mb-4 text-3xl text-forest">Upcoming blocked nights</h2>
        {data?.blocked.length === 0 && <p className="text-ink/50">No blocked dates.</p>}
        <ul className="divide-y divide-forest/5">
          <AnimatePresence initial={false}>
            {data?.blocked.map((d) => (
              <motion.li key={d.id} layout exit={{ opacity: 0, x: 40 }} className="flex items-center justify-between gap-2 py-2.5 text-sm">
                <span>
                  <span className="font-medium text-forest">{prettyDate(d.date, { year: 'numeric' })}</span> · {tentName(d.tent_id)}
                  {d.units ? ` (${d.units} tent${d.units > 1 ? 's' : ''})` : ''}
                  <span className="block text-xs text-ink/50">{d.reason} {d.source === 'airbnb' && <span className="rounded bg-[#FF385C]/10 px-1.5 text-[#d9304e]">Airbnb</span>}</span>
                </span>
                {d.source === 'manual' && (
                  <button type="button" onClick={() => remove(d.id)} aria-label={`Unblock ${d.date}`} className="grid h-9 w-9 place-items-center rounded-full text-pin hover:bg-pin/10"><Trash2 size={16} /></button>
                )}
              </motion.li>
            ))}
          </AnimatePresence>
        </ul>
      </div>
    </div>
  );
}

// ------------------------------------------------------------------ tents
function TentEditor({ tent, onSaved, notify }) {
  const [t, setT] = useState({ ...tent, amenitiesText: (tent.amenities || []).join('\n'), imagesText: (tent.images || []).join('\n') });
  const [busy, setBusy] = useState(false);
  const set = (k) => (e) => setT({ ...t, [k]: e.target.type === 'checkbox' ? e.target.checked : e.target.value });
  const save = async (e) => {
    e.preventDefault();
    setBusy(true);
    try {
      await api(`/admin/tents/${tent.id}`, {
        method: 'PATCH',
        admin: true,
        body: {
          name: t.name,
          description: t.description || '',
          price_per_night: Number(t.price_per_night),
          capacity: Number(t.capacity),
          units: Number(t.units),
          active: t.active,
          amenities: t.amenitiesText.split('\n').map((s) => s.trim()).filter(Boolean),
          images: t.imagesText.split('\n').map((s) => s.trim()).filter(Boolean)
        }
      });
      notify(`${t.name} saved`);
      onSaved();
    } catch (err) {
      notify(err.message, true);
    } finally {
      setBusy(false);
    }
  };
  return (
    <form onSubmit={save} className="space-y-3 rounded-2xl bg-white p-5 shadow-sm">
      <div className="flex items-center gap-3">
        {t.images?.[0] && <img src={t.images[0]} alt="" className="h-14 w-14 rounded-xl object-cover" />}
        <input aria-label="Tent name" className="field font-display text-2xl" value={t.name} onChange={set('name')} />
      </div>
      <div className="grid grid-cols-3 gap-2">
        <div><label className="label" htmlFor={`p-${tent.id}`}>Price / night (₹)</label><input id={`p-${tent.id}`} type="number" min={0} className="field" value={t.price_per_night} onChange={set('price_per_night')} /></div>
        <div><label className="label" htmlFor={`c-${tent.id}`}>Sleeps</label><input id={`c-${tent.id}`} type="number" min={1} className="field" value={t.capacity} onChange={set('capacity')} /></div>
        <div><label className="label" htmlFor={`u-${tent.id}`}>No. of tents</label><input id={`u-${tent.id}`} type="number" min={1} className="field" value={t.units} onChange={set('units')} /></div>
      </div>
      <div><label className="label" htmlFor={`d-${tent.id}`}>Description</label><textarea id={`d-${tent.id}`} rows={3} className="field" value={t.description || ''} onChange={set('description')} /></div>
      <div className="grid gap-2 sm:grid-cols-2">
        <div><label className="label" htmlFor={`a-${tent.id}`}>Amenities (one per line)</label><textarea id={`a-${tent.id}`} rows={4} className="field text-xs" value={t.amenitiesText} onChange={set('amenitiesText')} /></div>
        <div><label className="label" htmlFor={`i-${tent.id}`}>Photos (paths, one per line)</label><textarea id={`i-${tent.id}`} rows={4} className="field font-mono text-xs" value={t.imagesText} onChange={set('imagesText')} /></div>
      </div>
      <div className="flex items-center justify-between">
        <label className="flex cursor-pointer items-center gap-2 text-sm font-medium text-forest">
          <input type="checkbox" checked={t.active} onChange={set('active')} className="h-5 w-5 accent-lime-700" /> Bookable on website
        </label>
        <button type="submit" disabled={busy} className="btn-primary">{busy ? <Spinner /> : <Save size={16} />} Save</button>
      </div>
    </form>
  );
}

function TentsTab({ notify }) {
  const { data, reload } = useAdmin('/admin/tents');
  const [adding, setAdding] = useState(false);
  const addTent = async () => {
    const name = window.prompt('Name of the new tent type');
    if (!name) return;
    setAdding(true);
    try {
      await api('/admin/tents', { method: 'POST', admin: true, body: { name, capacity: 2, price_per_night: 2500, units: 1, active: false, images: ['/images/tent-interior-1280.webp'], amenities: [] } });
      notify('Tent added (hidden until you tick "Bookable")');
      reload();
    } catch (err) {
      notify(err.message, true);
    } finally {
      setAdding(false);
    }
  };
  return (
    <div>
      <div className="mb-4 flex justify-between">
        <p className="text-sm text-ink/60">Prices apply to new bookings immediately. Untick “Bookable” to hide a tent type.</p>
        <button type="button" onClick={addTent} disabled={adding} className="btn-outline"><Plus size={16} /> Add tent type</button>
      </div>
      <div className="grid gap-4 lg:grid-cols-2">
        {data?.tents.map((t) => <TentEditor key={t.id + t.updated_at} tent={t} onSaved={reload} notify={notify} />)}
      </div>
    </div>
  );
}

// ------------------------------------------------------------------ shell
export default function AdminApp() {
  const navigate = useNavigate();
  const [params, setParams] = useSearchParams();
  const tab = params.get('tab') || 'bookings';
  const openId = params.get('booking');
  const [toast, setToast] = useState(null);
  const { data: me } = useAdmin('/admin/me');
  const { data: pending, reload: reloadPending } = useAdmin('/admin/payments?status=submitted');

  const notify = useCallback((text, error = false) => {
    const id = Date.now();
    setToast({ id, text, error });
    setTimeout(() => setToast((t) => (t?.id === id ? null : t)), 3200);
    reloadPending();
  }, [reloadPending]);

  if (!adminToken.get()) return <Navigate to="/admin/login" replace />;

  const setTab = (id) => setParams({ tab: id });
  const setOpenId = (id) => setParams(id ? { tab: 'bookings', booking: id } : { tab: 'bookings' });
  const logout = () => {
    adminToken.clear();
    navigate('/admin/login', { replace: true });
  };
  const pendingCount = pending?.payments.length || 0;

  return (
    <div className="min-h-screen bg-cream-200/50">
      <Seo title="Admin" noindex />
      <header className="sticky top-0 z-40 bg-forest text-cream shadow-lg">
        <div className="container-x flex items-center justify-between gap-4 py-3">
          <Link to="/" className="flex items-center gap-3">
            <Logo size={44} className="h-11 w-11" />
            <span className="leading-none"><span className="block font-display text-2xl tracking-wide">Cliff Camps</span><span className="text-xs text-cream/60">Admin</span></span>
          </Link>
          <div className="flex items-center gap-3 text-sm">
            <span className="hidden text-cream/70 sm:inline">{me?.admin.email}</span>
            <button type="button" onClick={logout} className="btn-ghost px-4 py-2"><LogOut size={16} /> Log out</button>
          </div>
        </div>
        <nav aria-label="Admin sections" className="container-x flex gap-1 overflow-x-auto pb-2">
          {TABS.map((t) => (
            <button key={t.id} type="button" onClick={() => setTab(t.id)} className={`relative flex items-center gap-2 rounded-full px-4 py-2 text-sm font-semibold whitespace-nowrap transition ${tab === t.id ? 'text-forest' : 'text-cream/75 hover:text-cream'}`}>
              {tab === t.id && <motion.span layoutId="admin-tab" className="absolute inset-0 rounded-full bg-lime" transition={{ type: 'spring', stiffness: 400, damping: 32 }} />}
              <t.icon size={16} className="relative" /> <span className="relative">{t.label}</span>
              {t.id === 'payments' && pendingCount > 0 && <span className="relative grid h-5 min-w-5 place-items-center rounded-full bg-sun px-1 text-xs text-forest">{pendingCount}</span>}
            </button>
          ))}
        </nav>
      </header>
      <main className="container-x py-8">
        <AnimatePresence mode="wait">
          <motion.div key={tab} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -12 }} transition={{ duration: 0.25 }}>
            {tab === 'bookings' && <BookingsTab notify={notify} openId={openId} setOpenId={setOpenId} />}
            {tab === 'payments' && <PaymentsTab notify={notify} onOpenBooking={setOpenId} />}
            {tab === 'calendar' && <CalendarTab notify={notify} />}
            {tab === 'tents' && <TentsTab notify={notify} />}
          </motion.div>
        </AnimatePresence>
      </main>
      <Toast toast={toast} />
    </div>
  );
}

