import { Suspense, useEffect, useState } from 'react';
import { useLocation, useOutlet } from 'react-router-dom';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import Navbar from './Navbar.jsx';
import Footer from './Footer.jsx';
import { Logo, ScrollProgress, Spinner } from './ui.jsx';
import { Phone } from 'lucide-react';
import { BUSINESS, whatsappUrl } from '../lib/site.js';

const fabTip = 'pointer-events-none absolute hidden rounded-full bg-forest px-3 py-1.5 text-xs font-medium whitespace-nowrap text-cream opacity-0 shadow-lg transition group-hover:opacity-100 group-focus-visible:opacity-100 sm:block';

/** One-tap contact buttons on every page: call in the bottom-left corner, WhatsApp in the bottom-right. */
function ContactButtons() {
  return (
    <>
      <CallButton />
      <WhatsAppButton />
    </>
  );
}

function CallButton() {
  const phone = BUSINESS.phones[0];
  return (
      <motion.a
        href={`tel:+91${phone.number}`}
        aria-label={`Call ${phone.name} at Cliff Camps: ${phone.number}`}
        initial={{ scale: 0, rotate: 90 }}
        animate={{ scale: 1, rotate: 0 }}
        transition={{ delay: 1.8, type: 'spring', stiffness: 260, damping: 18 }}
        whileHover={{ scale: 1.1 }}
        whileTap={{ scale: 0.92 }}
        className="group fixed bottom-4 left-4 z-40 grid h-14 w-14 place-items-center rounded-full bg-sun text-forest shadow-[0_12px_30px_-8px_rgba(245,166,35,0.85)] sm:bottom-6 sm:left-6 sm:h-16 sm:w-16"
      >
        <span className="absolute inset-0 animate-ping-slow rounded-full bg-sun opacity-40" aria-hidden />
        <motion.span animate={{ rotate: [0, -14, 12, -10, 8, 0] }} transition={{ duration: 0.9, repeat: Infinity, repeatDelay: 3.2 }} className="relative grid place-items-center">
          <Phone size={26} strokeWidth={2.4} />
        </motion.span>
        <span className={`${fabTip} left-full ml-3`}>Call {phone.name} · {phone.number}</span>
      </motion.a>
  );
}

function WhatsAppButton() {
  return (
    <motion.a
      href={whatsappUrl()}
      target="_blank"
      rel="noopener noreferrer"
      aria-label="Chat with Cliff Camps on WhatsApp"
      initial={{ scale: 0, rotate: -90 }}
      animate={{ scale: 1, rotate: 0 }}
      transition={{ delay: 1.6, type: 'spring', stiffness: 260, damping: 18 }}
      whileHover={{ scale: 1.1 }}
      whileTap={{ scale: 0.92 }}
      className="group fixed right-4 bottom-4 z-40 grid h-14 w-14 place-items-center rounded-full bg-[#25D366] text-white shadow-[0_12px_30px_-8px_rgba(37,211,102,0.8)] sm:right-6 sm:bottom-6 sm:h-16 sm:w-16"
    >
      <span className="absolute inset-0 animate-ping-slow rounded-full bg-[#25D366] opacity-40" aria-hidden />
      <svg viewBox="0 0 32 32" className="relative h-7 w-7 sm:h-8 sm:w-8" fill="currentColor" aria-hidden>
        <path d="M16.02 3C8.84 3 3 8.83 3 16c0 2.3.6 4.53 1.75 6.5L3 29l6.68-1.74A12.95 12.95 0 0 0 16.02 29C23.2 29 29 23.17 29 16S23.2 3 16.02 3Zm0 23.6c-2.03 0-4.02-.55-5.75-1.6l-.41-.24-3.96 1.03 1.06-3.86-.27-.4A10.56 10.56 0 0 1 5.4 16c0-5.85 4.77-10.6 10.62-10.6 5.84 0 10.58 4.75 10.58 10.6 0 5.85-4.74 10.6-10.58 10.6Zm5.8-7.94c-.32-.16-1.88-.93-2.17-1.03-.29-.11-.5-.16-.71.16-.21.32-.82 1.03-1 1.24-.19.21-.37.24-.69.08-.32-.16-1.34-.49-2.55-1.57-.94-.84-1.58-1.88-1.77-2.2-.18-.32-.02-.49.14-.65.15-.14.32-.37.48-.56.16-.18.21-.32.32-.53.1-.21.05-.4-.03-.56-.08-.16-.71-1.72-.98-2.35-.26-.62-.52-.53-.71-.54h-.61c-.21 0-.56.08-.85.4-.29.32-1.11 1.09-1.11 2.65 0 1.56 1.14 3.07 1.3 3.28.16.21 2.24 3.42 5.43 4.8.76.33 1.35.52 1.81.67.76.24 1.45.2 2 .12.61-.09 1.88-.77 2.14-1.51.27-.74.27-1.38.19-1.51-.08-.13-.29-.21-.61-.37Z" />
      </svg>
      <span className={`${fabTip} right-full mr-3`}>WhatsApp · {BUSINESS.whatsappDisplay}</span>
    </motion.a>
  );
}

/** Brand intro: logo spins in, motto writes, curtain lifts. Once per browser session. */
function IntroLoader() {
  const reduce = useReducedMotion();
  const [show, setShow] = useState(() => {
    try {
      return !sessionStorage.getItem('cc_intro');
    } catch {
      return true;
    }
  });
  useEffect(() => {
    if (!show) return;
    try { sessionStorage.setItem('cc_intro', '1'); } catch { /* ignore */ }
    const t = setTimeout(() => setShow(false), reduce ? 300 : 1700);
    return () => clearTimeout(t);
  }, [show, reduce]);

  return (
    <AnimatePresence>
      {show && (
        <motion.div
          key="intro"
          aria-hidden
          className="fixed inset-0 z-[100] grid place-items-center bg-forest"
          exit={{ clipPath: 'inset(0 0 100% 0)' }}
          initial={{ clipPath: 'inset(0 0 0% 0)' }}
          transition={{ duration: 0.9, ease: [0.76, 0, 0.24, 1] }}
        >
          <div className="flex flex-col items-center gap-5">
            <motion.div initial={{ scale: 0.4, rotate: -180, opacity: 0 }} animate={{ scale: 1, rotate: 0, opacity: 1 }} transition={{ duration: 1, ease: [0.16, 1, 0.3, 1] }}>
              <Logo size={128} className="h-32 w-32 shadow-[0_0_80px_rgba(124,179,66,0.45)]" />
            </motion.div>
            <motion.p
              initial={{ clipPath: 'inset(0 100% 0 0)' }}
              animate={{ clipPath: 'inset(0 0% 0 0)' }}
              transition={{ delay: 0.5, duration: 0.9, ease: 'easeInOut' }}
              className="font-script text-3xl text-lime"
            >
              Explore the Nature
            </motion.p>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

export default function Layout() {
  const location = useLocation();
  // Freeze the outgoing page so it doesn't re-render as the new one while animating out
  const outlet = useOutlet();

  return (
    <>
      <a href="#main" className="sr-only z-[80] rounded-full bg-sun px-4 py-2 font-semibold text-forest focus:not-sr-only focus:fixed focus:top-4 focus:left-4">
        Skip to content
      </a>
      <IntroLoader />
      <ScrollProgress />
      <Navbar />
      <AnimatePresence mode="wait" onExitComplete={() => window.scrollTo({ top: 0, behavior: 'instant' })}>
        <motion.main
          id="main"
          key={location.pathname}
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -16 }}
          transition={{ duration: 0.45, ease: [0.16, 1, 0.3, 1] }}
        >
          <Suspense fallback={<div className="grid min-h-[100svh] place-items-center bg-forest text-lime" role="status"><Spinner className="h-10 w-10" /></div>}>{outlet}</Suspense>
        </motion.main>
      </AnimatePresence>
      <Footer />
      <ContactButtons />
    </>
  );
}
