import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ArrowRight, Compass } from 'lucide-react';
import { Seo } from '../components/ui.jsx';
import { RiverWaves } from '../components/motion.jsx';
import Snowfall from '../components/Snowfall.jsx';

export default function NotFound() {
  return (
    <section className="grain relative isolate flex min-h-[90svh] flex-col items-center justify-center overflow-hidden bg-forest px-4 pt-28 pb-40 text-center text-cream">
      <Seo title="Page not found" noindex />
      <Snowfall className="-z-10" />
      <motion.div animate={{ rotate: [0, 20, -15, 10, 0] }} transition={{ duration: 3, repeat: Infinity, repeatDelay: 1 }} className="mb-6 text-lime">
        <Compass size={64} strokeWidth={1.5} />
      </motion.div>
      <motion.h1 initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }} transition={{ type: 'spring', stiffness: 120 }} className="text-[clamp(7rem,25vw,14rem)] leading-none text-gradient-sun">
        404
      </motion.h1>
      <p className="font-script text-3xl text-lime">Looks like you wandered off the trail</p>
      <p className="mt-3 max-w-md text-cream/70">This page drifted downstream. Let’s get you back to the river.</p>
      <div className="mt-8 flex flex-wrap justify-center gap-3">
        <Link to="/" className="btn-primary">Back to camp <ArrowRight size={16} /></Link>
        <Link to="/book" className="btn-ghost">Book a tent</Link>
      </div>
      <RiverWaves className="absolute inset-x-0 bottom-0" colors={['#2A9DB5', '#7CB342', '#F5F1E3']} />
    </section>
  );
}
