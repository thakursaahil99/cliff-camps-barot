import { useEffect, useRef, useState } from 'react';
import { Link, NavLink, useLocation } from 'react-router-dom';
import { AnimatePresence, motion, useMotionValueEvent, useScroll } from 'framer-motion';
import { Instagram, MessageCircle, Phone } from 'lucide-react';
import { BUSINESS, NAV, whatsappUrl } from '../lib/site.js';
import { Logo } from './ui.jsx';
import { Magnetic } from './motion.jsx';

export default function Navbar() {
  const [open, setOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [hidden, setHidden] = useState(false);
  const { scrollY } = useScroll();
  const { pathname } = useLocation();
  const menuRef = useRef(null);
  const toggleRef = useRef(null);

  useMotionValueEvent(scrollY, 'change', (y) => {
    const prev = scrollY.getPrevious() ?? 0;
    setScrolled(y > 40);
    // hide on fast scroll down, show on scroll up
    setHidden(y > 400 && y > prev + 4 && !open);
    if (y < prev - 4) setHidden(false);
  });

  useEffect(() => setOpen(false), [pathname]);

  useEffect(() => {
    if (!open) return;
    document.body.style.overflow = 'hidden';
    const first = menuRef.current?.querySelector('a');
    first?.focus();
    const onKey = (e) => {
      if (e.key === 'Escape') {
        setOpen(false);
        toggleRef.current?.focus();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => {
      document.body.style.overflow = '';
      window.removeEventListener('keydown', onKey);
    };
  }, [open]);

  return (
    <>
      <motion.header
        animate={{ y: hidden ? '-110%' : '0%' }}
        transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
        className="fixed inset-x-0 top-0 z-50 px-3 pt-3 sm:px-5 sm:pt-4"
      >
        <nav
          aria-label="Main"
          className={`mx-auto flex max-w-7xl items-center justify-between gap-4 rounded-full px-3 py-2 transition-all duration-500 sm:px-4 ${
            scrolled || open ? 'bg-forest/85 shadow-[0_10px_40px_-15px_rgba(0,0,0,0.6)] ring-1 ring-cream/10 backdrop-blur-xl' : 'bg-transparent'
          }`}
        >
          <Link to="/" className="group flex items-center gap-3 rounded-full pr-2" aria-label="Cliff Camps, Barot - home">
            <motion.span whileHover={{ rotate: -12, scale: 1.08 }} transition={{ type: 'spring', stiffness: 300, damping: 12 }} className="block">
              <Logo size={48} className="h-11 w-11 shadow-lg ring-2 ring-cream/20 sm:h-12 sm:w-12" />
            </motion.span>
            <span className="hidden leading-none text-cream sm:block">
              <span className="block font-display text-2xl tracking-wider">Cliff Camps</span>
              <span className="block font-script text-base text-lime">Barot</span>
            </span>
          </Link>

          <ul className="hidden items-center gap-1 lg:flex">
            {NAV.map((n) => (
              <li key={n.to}>
                <NavLink to={n.to} end={n.to === '/'} className="relative block rounded-full px-4 py-2 text-sm font-medium text-cream/85 transition hover:text-cream">
                  {({ isActive }) => (
                    <>
                      {isActive && (
                        <motion.span layoutId="nav-pill" className="absolute inset-0 -z-0 rounded-full bg-cream/12 ring-1 ring-cream/20" transition={{ type: 'spring', stiffness: 380, damping: 30 }} />
                      )}
                      <span className={`relative ${isActive ? 'text-cream' : ''}`}>{n.label}</span>
                    </>
                  )}
                </NavLink>
              </li>
            ))}
          </ul>

          <div className="flex items-center gap-2">
            <Magnetic className="hidden sm:inline-block">
              <Link to="/book" className="btn-primary px-5 py-2.5">
                Book Now
              </Link>
            </Magnetic>
            <button
              ref={toggleRef}
              type="button"
              onClick={() => setOpen((o) => !o)}
              aria-expanded={open}
              aria-controls="mobile-menu"
              aria-label={open ? 'Close menu' : 'Open menu'}
              className="relative z-[60] grid h-12 w-12 place-items-center rounded-full bg-cream/10 ring-1 ring-cream/20 backdrop-blur lg:hidden"
            >
              <span className="sr-only">Menu</span>
              {[0, 1, 2].map((i) => (
                <motion.span
                  key={i}
                  className="absolute h-0.5 w-5 rounded bg-cream"
                  animate={
                    open
                      ? { rotate: i === 1 ? 0 : i === 0 ? 45 : -45, y: 0, opacity: i === 1 ? 0 : 1 }
                      : { rotate: 0, y: (i - 1) * 6, opacity: 1 }
                  }
                  transition={{ duration: 0.3 }}
                />
              ))}
            </button>
          </div>
        </nav>
      </motion.header>

      <AnimatePresence>
        {open && (
          <motion.div
            id="mobile-menu"
            ref={menuRef}
            role="dialog"
            aria-modal="true"
            aria-label="Menu"
            initial={{ clipPath: 'circle(0% at calc(100% - 44px) 44px)' }}
            animate={{ clipPath: 'circle(150% at calc(100% - 44px) 44px)' }}
            exit={{ clipPath: 'circle(0% at calc(100% - 44px) 44px)' }}
            transition={{ duration: 0.7, ease: [0.76, 0, 0.24, 1] }}
            className="grain fixed inset-0 z-40 flex flex-col overflow-y-auto bg-forest px-6 pt-28 pb-10 text-cream lg:hidden"
          >
            <motion.ul initial="hidden" animate="show" variants={{ show: { transition: { staggerChildren: 0.07, delayChildren: 0.25 } } }} className="flex flex-col gap-1">
              {NAV.map((n, i) => (
                <motion.li key={n.to} variants={{ hidden: { opacity: 0, x: 40 }, show: { opacity: 1, x: 0, transition: { duration: 0.6, ease: [0.16, 1, 0.3, 1] } } }}>
                  <NavLink
                    to={n.to}
                    end={n.to === '/'}
                    className={({ isActive }) => `flex items-baseline gap-4 py-2 font-display text-5xl tracking-wide transition ${isActive ? 'text-lime' : 'text-cream hover:text-lime'}`}
                  >
                    <span className="font-sans text-xs text-cream/40">0{i + 1}</span>
                    {n.label}
                  </NavLink>
                </motion.li>
              ))}
            </motion.ul>
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.6 }} className="mt-auto space-y-4 pt-10">
              <Link to="/book" className="btn-primary w-full py-4 text-base">Book your tent</Link>
              <div className="grid grid-cols-3 gap-2 text-sm">
                <a href={`tel:+91${BUSINESS.phones[0].number}`} className="flex flex-col items-center gap-1 rounded-2xl bg-cream/5 py-3 ring-1 ring-cream/10"><Phone size={18} /> Call</a>
                <a href={whatsappUrl()} target="_blank" rel="noopener noreferrer" className="flex flex-col items-center gap-1 rounded-2xl bg-cream/5 py-3 ring-1 ring-cream/10"><MessageCircle size={18} /> WhatsApp</a>
                <a href={BUSINESS.instagram} target="_blank" rel="noopener noreferrer" className="flex flex-col items-center gap-1 rounded-2xl bg-cream/5 py-3 ring-1 ring-cream/10"><Instagram size={18} /> Instagram</a>
              </div>
              <p className="text-center font-script text-xl text-lime">{BUSINESS.motto}</p>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
