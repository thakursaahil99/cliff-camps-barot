import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { ArrowRight, CalendarDays, Check, CircleCheck, QrCode, Users, Wallet } from 'lucide-react';
import { PHOTOS } from '../lib/site.js';
import { useSiteConfig, useTents } from '../lib/hooks.js';
import { inr } from '../lib/format.js';
import { Img, PageHero, SectionHeading, Seo, Spinner } from '../components/ui.jsx';
import { Magnetic, Reveal, Stagger, TiltCard, item } from '../components/motion.jsx';

function TentImages({ images, name }) {
  const [i, setI] = useState(0);
  useEffect(() => {
    if (images.length < 2) return;
    const t = setInterval(() => setI((x) => (x + 1) % images.length), 4200);
    return () => clearInterval(t);
  }, [images.length]);
  return (
    <div className="relative aspect-[4/3] overflow-hidden bg-forest">
      <AnimatePresence initial={false}>
        <motion.img
          key={images[i]}
          src={images[i]}
          alt={`${name} - photo ${i + 1} of ${images.length}`}
          loading="lazy"
          decoding="async"
          initial={{ opacity: 0, scale: 1.12 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 1.2, ease: [0.16, 1, 0.3, 1] }}
          className="absolute inset-0 h-full w-full object-cover"
        />
      </AnimatePresence>
      {images.length > 1 && (
        <div className="absolute bottom-4 left-1/2 flex -translate-x-1/2 gap-1.5">
          {images.map((src, k) => (
            <button
              key={src}
              type="button"
              aria-label={`Show photo ${k + 1}`}
              onClick={() => setI(k)}
              className={`h-1.5 rounded-full transition-all duration-500 ${k === i ? 'w-6 bg-cream' : 'w-1.5 bg-cream/50'}`}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function TentCard({ tent, index }) {
  return (
    <motion.article variants={item} className="h-full">
      <TiltCard max={5} className="h-full rounded-[2rem]">
        <div className="card flex h-full flex-col overflow-hidden">
          <div className="relative">
            <TentImages images={tent.images?.length ? tent.images : [PHOTOS.tentInterior.src]} name={tent.name} />
            <span className="absolute top-4 left-4 rounded-full bg-forest/80 px-3 py-1 font-display text-lg tracking-wider text-cream backdrop-blur">Tent 0{index + 1}</span>
            <span className="absolute top-4 right-4 rounded-full bg-sun px-4 py-1.5 text-sm font-bold text-forest shadow-lg">
              {inr(tent.price_per_night)}<span className="font-medium"> / night</span>
            </span>
          </div>
          <div className="flex flex-1 flex-col p-7">
            <h3 className="text-4xl text-forest">{tent.name}</h3>
            <div className="mt-2 flex flex-wrap gap-4 text-sm text-ink/70">
              <span className="inline-flex items-center gap-1.5"><Users size={16} className="text-teal-700" /> Up to {tent.capacity} guests</span>
            </div>
            <p className="mt-4 leading-relaxed text-ink/75">{tent.description}</p>
            {tent.amenities?.length > 0 && (
              <ul className="mt-5 grid gap-2 sm:grid-cols-2">
                {tent.amenities.map((a) => (
                  <li key={a} className="flex items-start gap-2 text-sm text-ink/80">
                    <Check size={16} className="mt-0.5 shrink-0 text-lime-700" /> {a}
                  </li>
                ))}
              </ul>
            )}
            <div className="mt-auto pt-7">
              <Magnetic className="block">
                <Link to={`/book?tent=${tent.id}`} className="btn-primary group w-full py-4">
                  <CalendarDays size={18} /> Check availability
                  <ArrowRight size={16} className="transition group-hover:translate-x-1" />
                </Link>
              </Magnetic>
            </div>
          </div>
        </div>
      </TiltCard>
    </motion.article>
  );
}

const STEPS = [
  { icon: CalendarDays, title: 'Pick your dates', text: 'Choose your tent and dates - booked nights are greyed out, so what you see is really free.' },
  { icon: Wallet, title: 'See the price instantly', text: 'Nights × rate, shown live before you send anything.' },
  { icon: QrCode, title: 'Pay a small advance', text: 'Hold your tent with an advance by UPI (GPay, PhonePe, Paytm) or online.' },
  { icon: CircleCheck, title: 'Get confirmed', text: 'We confirm by email with your receipt. The balance can be paid at the camp.' }
];

export default function Stay() {
  const { tents, error } = useTents();
  const config = useSiteConfig();
  const advance = config?.booking.advancePercent ?? 30;

  return (
    <>
      <Seo
        title="Swiss Tents & Stay"
        path="/stay"
        description="Comfortable Swiss tents by the river at Barot, Himachal Pradesh. See tent types, capacity, amenities and price per night, and check live availability."
      />
      <PageHero eyebrow="Tents & Stay" title="Comfortable Swiss tents by the river" intro="Our Swiss tents ensure great comfort - fall asleep to the white noise of the river and wake up to the Barot valley." photo={PHOTOS.tentInterior} />

      <section className="py-24 sm:py-28">
        <div className="container-x">
          <SectionHeading eyebrow="Choose your tent" title="Tent types & prices">
            Prices are per tent, per night. Pick a tent to see live availability.
          </SectionHeading>

          {!tents && (
            <div className="mt-16 flex justify-center text-forest" role="status">
              <Spinner className="h-8 w-8" /> <span className="sr-only">Loading tents</span>
            </div>
          )}
          {error && (
            <p className="mx-auto mt-12 max-w-lg rounded-2xl bg-pin/10 p-4 text-center text-pin">
              Couldn’t load tents right now. Please call or WhatsApp us to book.
            </p>
          )}
          {tents && tents.length > 0 && (
            <Stagger className={`mt-14 grid gap-8 ${tents.length > 1 ? 'md:grid-cols-2' : 'mx-auto max-w-2xl'}`}>
              {tents.map((t, i) => <TentCard key={t.id} tent={t} index={i} />)}
            </Stagger>
          )}
        </div>
      </section>

      <section className="relative overflow-hidden bg-cream-200/60 py-24 sm:py-28">
        <div className="container-x grid items-center gap-14 lg:grid-cols-2">
          <Reveal x={-40} y={0} className="relative">
            <div className="relative overflow-hidden rounded-[2.5rem] shadow-2xl">
              <Img photo={PHOTOS.riverside} sizes="(min-width: 1024px) 50vw, 100vw" className="aspect-[4/5] w-full object-cover" />
            </div>
            <motion.div
              initial={{ opacity: 0, scale: 0.6, rotate: -12 }}
              whileInView={{ opacity: 1, scale: 1, rotate: -6 }}
              viewport={{ once: true }}
              transition={{ delay: 0.4, type: 'spring', stiffness: 120 }}
              className="absolute -right-3 -bottom-8 w-44 overflow-hidden rounded-3xl border-4 border-cream shadow-xl sm:-right-8 sm:w-56"
            >
              <Img photo={PHOTOS.tentWindow} sizes="224px" className="aspect-[3/4] w-full object-cover" />
            </motion.div>
          </Reveal>
          <div>
            <SectionHeading align="left" eyebrow="Simple & secure" title="How booking works" className="!mx-0" />
            <ol className="mt-10 space-y-6">
              {STEPS.map((s, i) => (
                <Reveal as="li" key={s.title} delay={i * 0.1} className="flex gap-5">
                  <span className="relative grid h-14 w-14 shrink-0 place-items-center rounded-2xl bg-forest text-lime shadow-lg">
                    <s.icon size={22} />
                    <span className="absolute -top-2 -right-2 grid h-6 w-6 place-items-center rounded-full bg-sun text-xs font-bold text-forest">{i + 1}</span>
                  </span>
                  <div>
                    <h3 className="text-3xl text-forest">{s.title}</h3>
                    <p className="text-ink/70">{i === 2 ? `Hold your tent with a ${advance}% advance by UPI (GPay, PhonePe, Paytm) or online.` : s.text}</p>
                  </div>
                </Reveal>
              ))}
            </ol>
            <Reveal delay={0.4} className="mt-10">
              <Link to="/book" className="btn-dark">
                Start booking <ArrowRight size={16} />
              </Link>
            </Reveal>
          </div>
        </div>
      </section>
      <div className="h-24" />
    </>
  );
}
