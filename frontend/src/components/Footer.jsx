import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ArrowUpRight, Instagram, Mail, MapPin, MessageCircle, Phone } from 'lucide-react';
import { BUSINESS, NAV, whatsappUrl } from '../lib/site.js';
import { Logo } from './ui.jsx';
import { Marquee, RiverWaves } from './motion.jsx';

export default function Footer() {
  return (
    <footer className="relative bg-forest text-cream">
      <RiverWaves className="-mt-16 sm:-mt-24" colors={['#2A9DB5', '#7CB342', '#0B2A1E']} />

      <div className="border-y border-cream/10 py-6">
        <Marquee duration={30}>
          {['Explore the Nature', 'Riverside Bliss', 'Swiss Tents', 'Trout Treat', 'Barot Valley', 'Snow Views'].map((w) => (
            <span key={w} className="flex items-center gap-4 font-display text-4xl tracking-wider whitespace-nowrap text-cream/90 sm:text-6xl">
              {w}
              <span className="text-2xl text-lime sm:text-4xl" aria-hidden>✦</span>
            </span>
          ))}
        </Marquee>
      </div>

      <div className="container-x grid gap-12 py-16 md:grid-cols-2 lg:grid-cols-4">
        <div className="space-y-4">
          <div className="flex items-center gap-3">
            <motion.div whileHover={{ rotate: 360 }} transition={{ duration: 1.2, ease: 'easeInOut' }}>
              <Logo size={80} className="h-20 w-20 ring-2 ring-cream/20" />
            </motion.div>
            <div className="leading-tight">
              <p className="font-display text-3xl tracking-wider">Cliff Camps</p>
              <p className="font-script text-xl text-lime">Barot</p>
            </div>
          </div>
          <p className="font-script text-2xl text-sun">{BUSINESS.motto}</p>
          <p className="max-w-xs text-sm leading-relaxed text-cream/70">{BUSINESS.tagline}. {BUSINESS.intro}</p>
        </div>

        <div>
          <h2 className="mb-4 font-sans text-xs font-semibold tracking-[0.25em] text-cream/50 uppercase">Explore</h2>
          <ul className="space-y-2">
            {NAV.map((n) => (
              <li key={n.to}>
                <Link to={n.to} className="group inline-flex items-center gap-1 text-cream/85 transition hover:text-lime">
                  {n.label}
                  <ArrowUpRight size={14} className="opacity-0 transition group-hover:translate-x-0.5 group-hover:opacity-100" />
                </Link>
              </li>
            ))}
          </ul>
        </div>

        <div>
          <h2 className="mb-4 font-sans text-xs font-semibold tracking-[0.25em] text-cream/50 uppercase">Contact</h2>
          <ul className="space-y-3 text-sm">
            {BUSINESS.phones.map((p) => (
              <li key={p.number}>
                <a href={`tel:+91${p.number}`} className="flex items-center gap-3 text-cream/85 hover:text-lime">
                  <Phone size={16} className="text-lime" /> {p.number} <span className="text-cream/50">({p.name})</span>
                </a>
              </li>
            ))}
            <li>
              <a href={whatsappUrl()} target="_blank" rel="noopener noreferrer" className="flex items-center gap-3 text-cream/85 hover:text-lime">
                <MessageCircle size={16} className="text-lime" /> WhatsApp {BUSINESS.whatsappDisplay}
              </a>
            </li>
            <li>
              <a href={`mailto:${BUSINESS.email}`} className="flex items-center gap-3 break-all text-cream/85 hover:text-lime">
                <Mail size={16} className="shrink-0 text-lime" /> {BUSINESS.email}
              </a>
            </li>
            <li>
              <a href={BUSINESS.mapLink} target="_blank" rel="noopener noreferrer" className="flex items-start gap-3 text-cream/85 hover:text-lime">
                <MapPin size={16} className="mt-0.5 shrink-0 text-pin" /> {BUSINESS.address}
              </a>
            </li>
          </ul>
        </div>

        <div className="space-y-4">
          <h2 className="mb-4 font-sans text-xs font-semibold tracking-[0.25em] text-cream/50 uppercase">Follow & book</h2>
          <a href={BUSINESS.instagram} target="_blank" rel="noopener noreferrer" className="group flex items-center gap-3 rounded-2xl bg-cream/5 p-3 ring-1 ring-cream/10 transition hover:bg-cream/10">
            <span className="grid h-10 w-10 place-items-center rounded-xl bg-gradient-to-br from-[#f58529] via-[#dd2a7b] to-[#8134af]">
              <Instagram size={20} />
            </span>
            <span className="text-sm">
              <span className="block font-semibold">Instagram</span>
              <span className="text-cream/60">{BUSINESS.instagramHandle}</span>
            </span>
          </a>
          <a href={BUSINESS.airbnb} target="_blank" rel="noopener noreferrer" className="group flex items-center gap-3 rounded-2xl bg-cream/5 p-3 ring-1 ring-cream/10 transition hover:bg-cream/10">
            <span className="grid h-10 w-10 place-items-center rounded-xl bg-[#FF385C] font-bold">A</span>
            <span className="text-sm">
              <span className="block font-semibold">Also on Airbnb</span>
              <span className="text-cream/60">View listing & guest reviews</span>
            </span>
          </a>
        </div>
      </div>

      <div className="border-t border-cream/10">
        <div className="container-x flex flex-col items-center justify-between gap-2 py-6 text-xs text-cream/50 sm:flex-row">
          <p>© {new Date().getFullYear()} Cliff Camps, Barot. All rights reserved.</p>
          <p>Riverside camping · Barot, Himachal Pradesh</p>
        </div>
      </div>
    </footer>
  );
}
