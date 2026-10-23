import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { ArrowRight, CalendarDays, Check, CreditCard, Instagram, Mail, MapPin, MessageCircle, Minus, Phone, Plus, ShieldCheck, Users } from 'lucide-react';
import { api, qs } from '../lib/api.js';
import { BUSINESS, PHOTOS, whatsappUrl } from '../lib/site.js';
import { useSiteConfig, useTents } from '../lib/hooks.js';
import { addDaysISO, inr, nights as countNights, prettyDate, toISO } from '../lib/format.js';
import { PageHero, Seo, Spinner } from '../components/ui.jsx';
import { Reveal, Stagger, item } from '../components/motion.jsx';
import DateRangePicker from '../booking/DateRangePicker.jsx';

const PHONE_RE = /^\+?[0-9][0-9 -]{6,16}[0-9]$/;
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

function Step({ n, title, children, done }) {
  return (
    <Reveal as="section" id={`step-${n}`} className="relative scroll-mt-28 sm:pl-14" amount={0.1}>
      <div className="flex items-center gap-3">
        <span className={`grid h-10 w-10 shrink-0 place-items-center rounded-full font-display text-xl transition-colors duration-500 sm:absolute sm:top-0 sm:left-0 ${done ? 'bg-lime text-forest' : 'bg-forest text-cream'}`}>
          <AnimatePresence mode="wait" initial={false}>
            <motion.span key={done ? 'done' : 'n'} initial={{ scale: 0, rotate: -90 }} animate={{ scale: 1, rotate: 0 }} exit={{ scale: 0 }}>
              {done ? <Check size={18} strokeWidth={3} /> : n}
            </motion.span>
          </AnimatePresence>
        </span>
        <h2 className="text-4xl text-forest">{title}</h2>
      </div>
      <div className="mt-5">{children}</div>
    </Reveal>
  );
}

function AnimatedAmount({ value, className }) {
  return (
    <span className={`relative inline-flex overflow-hidden ${className || ''}`}>
      <AnimatePresence mode="popLayout" initial={false}>
        <motion.span key={value} initial={{ y: '100%', opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: '-100%', opacity: 0 }} transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}>
          {inr(value)}
        </motion.span>
      </AnimatePresence>
    </span>
  );
}

function Summary({ tent, dates, guests, config, quote }) {
  return (
    <div className="card overflow-hidden">
      <div className="relative h-36 overflow-hidden bg-forest">
        <AnimatePresence mode="wait">
          <motion.img
            key={tent?.id || 'none'}
            src={tent?.images?.[0] || PHOTOS.riversideWide.src}
            alt=""
            initial={{ opacity: 0, scale: 1.1 }}
            animate={{ opacity: 0.85, scale: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.6 }}
            className="h-full w-full object-cover"
          />
        </AnimatePresence>
        <div className="absolute inset-0 bg-gradient-to-t from-forest to-transparent" />
        <p className="absolute bottom-3 left-5 font-display text-3xl tracking-wide text-cream">{tent?.name || 'Choose a tent'}</p>
      </div>
      <div className="space-y-4 p-6">
        <dl className="grid grid-cols-2 gap-3 text-sm">
          <div className="rounded-2xl bg-cream p-3">
            <dt className="text-xs text-ink/60">Check-in</dt>
            <dd className="font-semibold text-forest">{dates.from ? prettyDate(dates.from) : '—'}</dd>
          </div>
          <div className="rounded-2xl bg-cream p-3">
            <dt className="text-xs text-ink/60">Check-out</dt>
            <dd className="font-semibold text-forest">{dates.to ? prettyDate(dates.to) : '—'}</dd>
          </div>
        </dl>
        <p className="flex items-center gap-2 text-sm text-ink/70">
          <Users size={16} /> {guests} guest{guests > 1 ? 's' : ''}
        </p>
        {quote ? (
          <div className="space-y-2 border-t border-forest/10 pt-4 text-sm">
            <div className="flex justify-between text-ink/80">
              <span>{inr(quote.rate)} × {quote.nights} night{quote.nights > 1 ? 's' : ''}</span>
              <AnimatedAmount value={quote.subtotal} />
            </div>
            {quote.tax > 0 && (
              <div className="flex justify-between text-ink/80">
                <span>Taxes ({config.booking.taxPercent}%)</span>
                <AnimatedAmount value={quote.tax} />
              </div>
            )}
            <div className="flex items-end justify-between border-t border-dashed border-forest/15 pt-3">
              <span className="font-semibold text-forest">Total</span>
              <AnimatedAmount value={quote.total} className="font-display text-4xl text-forest" />
            </div>
            <div className="flex justify-between rounded-2xl bg-lime/15 px-4 py-3 text-forest">
              <span>
                Advance to confirm <span className="text-ink/60">({config.booking.advancePercent}%)</span>
              </span>
              <AnimatedAmount value={quote.advance} className="font-bold" />
            </div>
            <p className="text-xs text-ink/60">Balance {inr(quote.total - quote.advance)} payable at the property.</p>
          </div>
        ) : (
          <p className="rounded-2xl bg-cream p-4 text-sm text-ink/60">Select a tent and your dates to see the price.</p>
        )}
        <a href={BUSINESS.airbnb} target="_blank" rel="noopener noreferrer" className="btn-outline w-full">
          <span className="grid h-5 w-5 place-items-center rounded bg-[#FF385C] text-[10px] font-bold text-white">A</span>
          Also book on Airbnb
        </a>
      </div>
    </div>
  );
}

function BookingForm() {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const { tents, error: tentsError } = useTents();
  const config = useSiteConfig();

  const today = toISO(new Date());
  const maxDate = addDaysISO(today, 30 * (config?.booking.maxMonthsAhead ?? 12));
  const [tentId, setTentId] = useState(params.get('tent') || '');
  const [dates, setDates] = useState({ from: null, to: null });
  const [guests, setGuests] = useState(2);
  const [form, setForm] = useState({ guest_name: '', phone: '', email: '', notes: '', website: '' });
  const [method, setMethod] = useState('upi');
  const [unavailable, setUnavailable] = useState(new Set());
  const [loadingDates, setLoadingDates] = useState(false);
  const [touched, setTouched] = useState({});
  const [submitting, setSubmitting] = useState(false);
  const [serverError, setServerError] = useState(null);

  const tent = tents?.find((t) => t.id === tentId);

  useEffect(() => {
    if (tents?.length && !tents.some((t) => t.id === tentId)) setTentId(tents[0].id);
  }, [tents, tentId]);

  useEffect(() => {
    if (tent && guests > tent.capacity) setGuests(tent.capacity);
  }, [tent, guests]);

  useEffect(() => {
    if (!config) return;
    const enabled = Object.entries(config.payments).filter(([, p]) => p.enabled).map(([k]) => k);
    if (enabled.length && !enabled.includes(method)) setMethod(enabled[0]);
  }, [config, method]);

  // Booked nights for the chosen tent, next 12 months
  useEffect(() => {
    if (!tentId) return;
    const ctrl = new AbortController();
    setLoadingDates(true);
    api(`/availability${qs({ tent_id: tentId, from: today, to: addDaysISO(today, 366) })}`, { signal: ctrl.signal })
      .then((r) => {
        const set = new Set(r.unavailable);
        setUnavailable(set);
        // drop a selection that is no longer possible
        setDates((d) => {
          if (!d.from) return d;
          const n = d.to ? countNights(d.from, d.to) : 1;
          for (let i = 0; i < n; i++) if (set.has(addDaysISO(d.from, i))) return { from: null, to: null };
          return d;
        });
      })
      .catch((e) => e.name !== 'AbortError' && setServerError('Could not load availability. Please refresh, or contact us to book.'))
      .finally(() => setLoadingDates(false));
    return () => ctrl.abort();
  }, [tentId, today]);

  const quote = useMemo(() => {
    if (!tent || !dates.from || !dates.to || !config) return null;
    const n = countNights(dates.from, dates.to);
    const rate = Number(tent.price_per_night);
    const subtotal = n * rate;
    const tax = Math.round(subtotal * config.booking.taxPercent) / 100;
    const total = subtotal + tax;
    const advance = Math.min(total, Math.ceil((total * config.booking.advancePercent) / 100));
    return { nights: n, rate, subtotal, tax, total, advance };
  }, [tent, dates, config]);

  const errors = {
    guest_name: form.guest_name.trim().length < 2 && 'Please enter your name',
    phone: !PHONE_RE.test(form.phone.trim()) && 'Enter a valid phone number',
    email: !EMAIL_RE.test(form.email.trim()) && 'Enter a valid email'
  };
  const datesDone = Boolean(dates.from && dates.to);
  const detailsDone = !errors.guest_name && !errors.phone && !errors.email;
  const canSubmit = tent && datesDone && detailsDone && !submitting;
  const missing = !tent ? 'Choose a tent' : !datesDone ? 'Select your check-in and check-out dates' : !detailsDone ? 'Fill in your name, phone and email' : null;

  // Booking requests paid by UPI go to WhatsApp, where the guest sends the payment screenshot
  const whatsappFlow = method === 'upi';
  useEffect(() => { if (!missing && serverError?.endsWith('to continue.')) setServerError(null); }, [missing, serverError]);

  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));
  const blur = (k) => () => setTouched((t) => ({ ...t, [k]: true }));

  async function submit(e) {
    e.preventDefault();
    if (submitting) return;
    if (missing) {
      // Show what is left instead of a dead, greyed-out button
      if (tent && datesDone) setTouched({ guest_name: true, phone: true, email: true });
      setServerError(`${missing} to continue.`);
      document.getElementById(`step-${!tent ? 1 : !datesDone ? 2 : 3}`)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      if (tent && datesDone) setTimeout(() => document.getElementById(errors.guest_name ? 'guest_name' : errors.phone ? 'phone' : 'email')?.focus({ preventScroll: true }), 500);
      return;
    }
    setSubmitting(true);
    setServerError(null);
    // Open the WhatsApp tab now, inside the click, so pop-up blockers allow it; it gets its address once the booking is saved
    const waTab = whatsappFlow ? window.open('', '_blank') : null;
    try {
      const res = await api('/bookings', {
        method: 'POST',
        body: { tent_id: tent.id, check_in: dates.from, check_out: dates.to, guests, ...form, payment_method: method }
      });
      let waOpened = false;
      if (waTab && !waTab.closed) {
        try { waTab.location.href = res.whatsappUrl; waOpened = true; } catch { /* tab gone */ }
      }
      navigate(`/booking/${res.booking.id}?t=${res.token}`, { state: { fresh: true, whatsappUrl: res.whatsappUrl, waOpened } });
    } catch (err) {
      waTab?.close();
      setServerError(err.message);
      if (err.status === 409) {
        // someone else got there first - refresh the calendar
        setDates({ from: null, to: null });
        const r = await api(`/availability${qs({ tent_id: tent.id, from: today, to: addDaysISO(today, 366) })}`).catch(() => null);
        if (r) setUnavailable(new Set(r.unavailable));
      }
    } finally {
      setSubmitting(false);
    }
  }

  const payments = config?.payments || {};
  const fieldErr = (k) => touched[k] && errors[k];

  return (
    <form onSubmit={submit} noValidate className="grid gap-10 lg:grid-cols-[1fr_380px]">
      <div className="space-y-14">
        <Step n={1} title="Choose your tent" done={Boolean(tent)}>
          {!tents && <Spinner />}
          {tentsError && <p className="text-pin">Couldn’t load tents. Please call or WhatsApp us.</p>}
          <div className="grid gap-4 sm:grid-cols-2">
            {tents?.map((t, i) => (
              <motion.label
                initial={{ opacity: 0, y: 24 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.1, duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
                key={t.id}
                className={`group relative flex cursor-pointer gap-4 overflow-hidden rounded-3xl border-2 bg-white p-3 transition ${tentId === t.id ? 'border-lime shadow-glow' : 'border-transparent shadow-sm hover:border-forest/20'}`}
              >
                <input type="radio" name="tent" value={t.id} checked={tentId === t.id} onChange={() => setTentId(t.id)} className="sr-only" />
                <img src={t.images?.[0]} alt="" loading="lazy" className="h-24 w-24 shrink-0 rounded-2xl object-cover transition duration-500 group-hover:scale-105" />
                <span className="flex min-w-0 flex-col justify-center pr-6">
                  <span className="font-display text-2xl leading-none text-forest">{t.name}</span>
                  <span className="mt-1 text-sm text-ink/60">Up to {t.capacity} guests</span>
                  <span className="mt-1 font-semibold text-forest">{inr(t.price_per_night)} <span className="text-sm font-normal text-ink/60">/ night</span></span>
                </span>
                <AnimatePresence>
                  {tentId === t.id && (
                    <motion.span initial={{ scale: 0 }} animate={{ scale: 1 }} exit={{ scale: 0 }} className="absolute top-3 right-3 grid h-7 w-7 place-items-center rounded-full bg-lime text-forest">
                      <Check size={16} strokeWidth={3} />
                    </motion.span>
                  )}
                </AnimatePresence>
              </motion.label>
            ))}
          </div>
        </Step>

        <Step n={2} title="Dates & guests" done={datesDone}>
          <div className="card p-3 sm:p-6">
            <DateRangePicker value={dates} onChange={setDates} unavailable={unavailable} today={today} maxDate={maxDate} maxNights={config?.booking.maxNights} loading={loadingDates} />
            <div className="mt-4 flex flex-wrap items-center justify-between gap-4 border-t border-forest/10 px-2 pt-4 text-sm">
              <div className="flex flex-wrap items-center gap-4 text-ink/60">
                <span className="flex items-center gap-2"><span className="h-4 w-4 rounded-full bg-forest" /> Selected</span>
                <span className="flex items-center gap-2"><span className="h-4 w-4 rounded-full bg-[repeating-linear-gradient(135deg,#e3e6df_0_3px,#f8f8f5_3px_6px)] ring-1 ring-forest/10" /> Booked</span>
              </div>
              <p className="font-medium text-forest" aria-live="polite">
                {datesDone ? `${countNights(dates.from, dates.to)} night${countNights(dates.from, dates.to) > 1 ? 's' : ''} selected` : dates.from ? 'Now pick your check-out date' : 'Pick your check-in date'}
              </p>
              {dates.from && (
                <button type="button" onClick={() => setDates({ from: null, to: null })} className="link text-sm">
                  Clear dates
                </button>
              )}
            </div>
          </div>
          <div className="mt-5 flex items-center justify-between rounded-3xl bg-white p-4 shadow-sm">
            <span className="flex items-center gap-3 font-medium text-forest">
              <Users size={20} className="text-teal-700" /> Guests
              {tent && <span className="text-sm font-normal text-ink/60">(max {tent.capacity})</span>}
            </span>
            <div className="flex items-center gap-3">
              <button type="button" aria-label="Fewer guests" onClick={() => setGuests((g) => Math.max(1, g - 1))} disabled={guests <= 1} className="grid h-10 w-10 place-items-center rounded-full border border-forest/20 text-forest transition hover:bg-forest hover:text-cream disabled:opacity-30">
                <Minus size={16} />
              </button>
              <output aria-live="polite" className="w-6 text-center font-display text-3xl text-forest">{guests}</output>
              <button type="button" aria-label="More guests" onClick={() => setGuests((g) => Math.min(tent?.capacity || 1, g + 1))} disabled={!tent || guests >= tent.capacity} className="grid h-10 w-10 place-items-center rounded-full border border-forest/20 text-forest transition hover:bg-forest hover:text-cream disabled:opacity-30">
                <Plus size={16} />
              </button>
            </div>
          </div>
        </Step>

        <Step n={3} title="Your details" done={detailsDone}>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="sm:col-span-2">
              <label htmlFor="guest_name" className="label">Full name</label>
              <input id="guest_name" className="field" autoComplete="name" value={form.guest_name} onChange={set('guest_name')} onBlur={blur('guest_name')} aria-invalid={Boolean(fieldErr('guest_name'))} aria-describedby="err-name" />
              {fieldErr('guest_name') && <p id="err-name" className="mt-1 text-sm text-pin">{errors.guest_name}</p>}
            </div>
            <div>
              <label htmlFor="phone" className="label">Phone / WhatsApp</label>
              <input id="phone" className="field" type="tel" inputMode="tel" autoComplete="tel" placeholder="98765 43210" value={form.phone} onChange={set('phone')} onBlur={blur('phone')} aria-invalid={Boolean(fieldErr('phone'))} aria-describedby="err-phone" />
              {fieldErr('phone') && <p id="err-phone" className="mt-1 text-sm text-pin">{errors.phone}</p>}
            </div>
            <div>
              <label htmlFor="email" className="label">Email</label>
              <input id="email" className="field" type="email" inputMode="email" autoComplete="email" value={form.email} onChange={set('email')} onBlur={blur('email')} aria-invalid={Boolean(fieldErr('email'))} aria-describedby="err-email" />
              {fieldErr('email') && <p id="err-email" className="mt-1 text-sm text-pin">{errors.email}</p>}
            </div>
            <div className="sm:col-span-2">
              <label htmlFor="notes" className="label">
                Special requests <span className="font-normal text-ink/50">(optional)</span>
              </label>
              <textarea id="notes" rows={3} maxLength={1000} className="field resize-y" placeholder="Arrival time, meals, celebrations…" value={form.notes} onChange={set('notes')} />
            </div>
            {/* honeypot - hidden from people, filled by bots */}
            <div className="hidden" aria-hidden>
              <label htmlFor="website">Website</label>
              <input id="website" tabIndex={-1} autoComplete="off" value={form.website} onChange={set('website')} />
            </div>
          </div>
        </Step>

        <Step n={4} title="How you’d like to pay" done={datesDone && detailsDone}>
          <div className="grid gap-4 sm:grid-cols-2">
            {[
              { id: 'upi', icon: MessageCircle, title: 'Pay via WhatsApp', text: 'We share the UPI payment details on WhatsApp. GPay, PhonePe, Paytm - zero fees.' },
              { id: 'razorpay', icon: CreditCard, title: 'Pay online', text: 'UPI, cards or netbanking via Razorpay secure checkout.' }
            ]
              .filter((m) => payments[m.id]?.enabled)
              .map((m) => (
                <label key={m.id} className={`relative flex cursor-pointer gap-4 rounded-3xl border-2 bg-white p-5 transition ${method === m.id ? 'border-lime shadow-glow' : 'border-transparent shadow-sm hover:border-forest/20'}`}>
                  <input type="radio" name="method" value={m.id} checked={method === m.id} onChange={() => setMethod(m.id)} className="sr-only" />
                  <span className={`grid h-12 w-12 shrink-0 place-items-center rounded-2xl transition ${method === m.id ? 'bg-lime text-forest' : 'bg-cream text-forest'}`}>
                    <m.icon size={22} />
                  </span>
                  <span>
                    <span className="block font-semibold text-forest">{m.title}</span>
                    <span className="text-sm text-ink/60">{m.text}</span>
                  </span>
                </label>
              ))}
            {config && !Object.values(payments).some((p) => p.enabled) && (
              <p className="rounded-2xl bg-cream p-4 text-sm text-ink/70 sm:col-span-2">We’ll contact you with payment details after you send your request.</p>
            )}
          </div>
          <p className="mt-4 flex items-start gap-2 text-sm text-ink/60">
            <ShieldCheck size={18} className="mt-0.5 shrink-0 text-lime-700" />
            {whatsappFlow
              ? `You pay a ${config?.booking.advancePercent ?? 30}% advance to confirm - we share the payment details on WhatsApp and confirm once it arrives. The balance is paid at the property.`
              : `You pay a ${config?.booking.advancePercent ?? 30}% advance on the next screen to confirm. The balance is paid at the property. We never see or store your card details.`}
          </p>
        </Step>
      </div>

      <aside className="lg:sticky lg:top-28 lg:self-start">
        <Summary tent={tent} dates={dates} guests={guests} config={config} quote={quote} />
        <AnimatePresence>
          {serverError && (
            <motion.p role="alert" initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="mt-4 rounded-2xl bg-pin/10 p-4 text-sm text-pin">
              {serverError}
            </motion.p>
          )}
        </AnimatePresence>
        <motion.button
          whileTap={{ scale: 0.97 }}
          type="submit"
          disabled={submitting}
          aria-describedby="book-hint"
          className={`btn mt-4 w-full py-4 text-base ${whatsappFlow ? 'bg-[#25D366] text-white shadow-[0_10px_30px_-10px_rgba(37,211,102,0.9)] hover:bg-[#1fb457]' : 'bg-lime text-forest hover:bg-lime-300'} ${canSubmit ? '' : 'opacity-80'}`}
        >
          {submitting ? <Spinner /> : whatsappFlow ? <MessageCircle size={18} /> : <CalendarDays size={18} />}
          {submitting ? 'Sending request…' : `${whatsappFlow ? 'Book on WhatsApp' : 'Request booking'}${quote ? ` · ${inr(quote.total)}` : ''}`}
          {!submitting && <ArrowRight size={18} />}
        </motion.button>
        <p id="book-hint" className="mt-2 text-center text-xs text-ink/50">
          {missing ? `${missing} to continue` : whatsappFlow ? 'Your dates are held and WhatsApp opens with your booking details. We’ll share the payment details there.' : 'Your dates are held while you pay the advance online.'}
        </p>
      </aside>
    </form>
  );
}

function Contact() {
  const items = [
    ...BUSINESS.phones.map((p) => ({ icon: Phone, label: `Call ${p.name}`, value: p.number, href: `tel:+91${p.number}` })),
    { icon: MessageCircle, label: 'WhatsApp', value: BUSINESS.whatsappDisplay, href: whatsappUrl(), ext: true },
    { icon: Mail, label: 'Email', value: BUSINESS.email, href: `mailto:${BUSINESS.email}` },
    { icon: Instagram, label: 'Instagram', value: BUSINESS.instagramHandle, href: BUSINESS.instagram, ext: true }
  ];
  return (
    <section id="contact" className="scroll-mt-24 bg-forest py-24 pb-36 text-cream">
      <div className="container-x grid gap-10 lg:grid-cols-2">
        <div>
          <span className="eyebrow">Contact us</span>
          <h2 className="mt-2 text-5xl leading-[0.95] sm:text-7xl">Find us by the river</h2>
          <p className="mt-4 flex items-start gap-2 text-lg text-cream/80">
            <MapPin className="mt-1 shrink-0 text-pin" /> {BUSINESS.address}
          </p>
          <Stagger className="mt-8 grid gap-3 sm:grid-cols-2">
            {items.map((c) => (
              <motion.a
                variants={item}
                key={c.label}
                href={c.href}
                {...(c.ext ? { target: '_blank', rel: 'noopener noreferrer' } : {})}
                className="group flex items-center gap-4 rounded-2xl bg-cream/5 p-4 ring-1 ring-cream/10 transition hover:bg-cream/10 hover:ring-lime/40"
              >
                <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-lime text-forest transition group-hover:rotate-6">
                  <c.icon size={20} />
                </span>
                <span className="min-w-0">
                  <span className="block text-xs tracking-wider text-cream/50 uppercase">{c.label}</span>
                  <span className="block truncate font-semibold">{c.value}</span>
                </span>
              </motion.a>
            ))}
            <motion.a variants={item} href={BUSINESS.airbnb} target="_blank" rel="noopener noreferrer" className="group flex items-center gap-4 rounded-2xl bg-cream/5 p-4 ring-1 ring-cream/10 transition hover:bg-cream/10 hover:ring-lime/40">
              <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-[#FF385C] font-bold text-white transition group-hover:rotate-6">A</span>
              <span>
                <span className="block text-xs tracking-wider text-cream/50 uppercase">Airbnb</span>
                <span className="block font-semibold">Also book on Airbnb</span>
              </span>
            </motion.a>
          </Stagger>
        </div>
        <Reveal className="overflow-hidden rounded-[2rem] ring-1 ring-cream/15">
          <iframe
            title="Map: Cliff Camps, Old Hatchery, Barot - Lohardi Road"
            src={BUSINESS.mapEmbed}
            className="h-[420px] w-full lg:h-full lg:min-h-[480px]"
            loading="lazy"
            referrerPolicy="no-referrer-when-downgrade"
            allowFullScreen
          />
        </Reveal>
      </div>
    </section>
  );
}

export default function Book() {
  return (
    <>
      <Seo
        title="Book & Contact"
        path="/book"
        description="Book a riverside Swiss tent at Cliff Camps, Barot. Live availability, instant price, UPI or online advance. Call 8219850117 or WhatsApp us."
      />
      <PageHero eyebrow="Book & Contact" title="Book your riverside tent" intro="Live availability, instant pricing and a small advance to confirm. Prefer to talk? Call or WhatsApp us any time." photo={PHOTOS.winterCamp}>
        <div className="mt-8 flex flex-wrap gap-3">
          <a href="#booking" className="btn-primary">Start booking</a>
          <a href="#contact" className="btn-ghost">Contact & map</a>
        </div>
      </PageHero>
      <div id="booking" className="container-x scroll-mt-24 py-20">
        <BookingForm />
      </div>
      <Contact />
    </>
  );
}
