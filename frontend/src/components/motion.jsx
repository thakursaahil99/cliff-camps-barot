import { useRef } from 'react';
import { motion, useMotionTemplate, useMotionValue, useReducedMotion, useSpring, useTransform } from 'framer-motion';

const EASE = [0.16, 1, 0.3, 1];

/** Fades + slides children in when scrolled into view. */
export function Reveal({ children, delay = 0, y = 32, x = 0, className, as = 'div', once = true, amount = 0.25, ...rest }) {
  const Tag = motion[as];
  return (
    <Tag
      className={className}
      initial={{ opacity: 0, y, x, filter: 'blur(6px)' }}
      whileInView={{ opacity: 1, y: 0, x: 0, filter: 'blur(0px)' }}
      viewport={{ once, amount }}
      transition={{ duration: 0.9, delay, ease: EASE }}
      {...rest}
    >
      {children}
    </Tag>
  );
}

/** Staggers direct <motion.*> children using the `item` variants below. */
export function Stagger({ children, className, stagger = 0.12, delay = 0, amount = 0.2, as = 'div' }) {
  const Tag = motion[as];
  return (
    <Tag
      className={className}
      initial="hidden"
      whileInView="show"
      viewport={{ once: true, amount }}
      variants={{ hidden: {}, show: { transition: { staggerChildren: stagger, delayChildren: delay } } }}
    >
      {children}
    </Tag>
  );
}

export const item = {
  hidden: { opacity: 0, y: 40, scale: 0.96 },
  show: { opacity: 1, y: 0, scale: 1, transition: { duration: 0.8, ease: EASE } }
};

/** Letter-by-letter rise for big display headings. Screen readers get the plain text. */
export function SplitText({ text, className, delay = 0, stagger = 0.035, as = 'span' }) {
  const Tag = motion[as];
  const words = text.split(' ');
  let i = 0;
  return (
    <Tag className={className} aria-label={text} initial="hidden" animate="show">
      {words.map((word, wi) => (
        <span key={wi} aria-hidden="true" className="inline-block whitespace-nowrap">
          {[...word].map((ch) => {
            const idx = i++;
            return (
              <span key={idx} className="inline-block overflow-hidden pb-[0.08em] align-bottom">
                <motion.span
                  className="inline-block"
                  variants={{
                    hidden: { y: '110%', rotate: 8, opacity: 0 },
                    show: { y: '0%', rotate: 0, opacity: 1, transition: { duration: 0.9, delay: delay + idx * stagger, ease: EASE } }
                  }}
                >
                  {ch}
                </motion.span>
              </span>
            );
          })}
          {wi < words.length - 1 && <span className="inline-block">&nbsp;</span>}
        </span>
      ))}
    </Tag>
  );
}

/** Element drifts toward the cursor while hovered (desktop only, disabled for reduced motion). */
export function Magnetic({ children, strength = 0.35, className }) {
  const ref = useRef(null);
  const reduce = useReducedMotion();
  const x = useSpring(0, { stiffness: 200, damping: 15, mass: 0.4 });
  const y = useSpring(0, { stiffness: 200, damping: 15, mass: 0.4 });
  const onMove = (e) => {
    if (reduce || e.pointerType !== 'mouse') return;
    const r = ref.current.getBoundingClientRect();
    x.set((e.clientX - (r.left + r.width / 2)) * strength);
    y.set((e.clientY - (r.top + r.height / 2)) * strength);
  };
  const reset = () => { x.set(0); y.set(0); };
  return (
    <motion.div ref={ref} onPointerMove={onMove} onPointerLeave={reset} style={{ x, y }} className={className ?? 'inline-block'}>
      {children}
    </motion.div>
  );
}

/** 3D tilt toward the cursor with a moving light glare. */
export function TiltCard({ children, className, max = 10, glare = true }) {
  const ref = useRef(null);
  const reduce = useReducedMotion();
  const px = useMotionValue(0.5);
  const py = useMotionValue(0.5);
  const rx = useSpring(useTransform(py, [0, 1], [max, -max]), { stiffness: 150, damping: 18 });
  const ry = useSpring(useTransform(px, [0, 1], [-max, max]), { stiffness: 150, damping: 18 });
  const gx = useTransform(px, (v) => `${v * 100}%`);
  const gy = useTransform(py, (v) => `${v * 100}%`);
  const glareBg = useMotionTemplate`radial-gradient(circle at ${gx} ${gy}, rgba(255,255,255,0.35), transparent 55%)`;

  const onMove = (e) => {
    if (reduce || e.pointerType !== 'mouse') return;
    const r = ref.current.getBoundingClientRect();
    px.set((e.clientX - r.left) / r.width);
    py.set((e.clientY - r.top) / r.height);
  };
  const reset = () => { px.set(0.5); py.set(0.5); };

  return (
    <motion.div
      ref={ref}
      onPointerMove={onMove}
      onPointerLeave={reset}
      style={{ rotateX: rx, rotateY: ry, transformPerspective: 900, transformStyle: 'preserve-3d' }}
      className={`group relative ${className || ''}`}
    >
      {children}
      {glare && !reduce && (
        <motion.div aria-hidden className="pointer-events-none absolute inset-0 rounded-[inherit] opacity-0 transition-opacity duration-300 group-hover:opacity-100" style={{ background: glareBg }} />
      )}
    </motion.div>
  );
}

/** Animated layered river waves (SVG), used as section dividers. */
export function RiverWaves({ className = '', colors = ['#7CB342', '#2A9DB5', '#F5F1E3'], flip = false }) {
  const reduce = useReducedMotion();
  const paths = [
    // each path starts and ends at the same height so the two tiled copies join seamlessly
    'M0,64 C240,112 480,16 720,48 C960,80 1200,16 1440,64 L1440,160 L0,160 Z',
    'M0,96 C200,56 440,136 720,96 C1000,56 1240,136 1440,96 L1440,160 L0,160 Z',
    'M0,120 C260,96 520,150 760,124 C1000,98 1220,144 1440,120 L1440,160 L0,160 Z'
  ];
  return (
    <div className={`pointer-events-none h-16 w-full overflow-hidden sm:h-24 ${className.includes('absolute') ? '' : 'relative'} ${flip ? 'rotate-180' : ''} ${className}`} aria-hidden>
      {paths.map((d, i) => (
        <motion.svg
          key={i}
          viewBox="0 0 1440 160"
          preserveAspectRatio="none"
          className="absolute bottom-0 left-0 h-full w-[200%]"
          animate={reduce ? undefined : { x: i % 2 ? ['-50%', '0%'] : ['0%', '-50%'] }}
          transition={{ duration: 18 + i * 7, repeat: Infinity, ease: 'linear' }}
        >
          <path d={d} fill={colors[i]} opacity={i === 2 ? 1 : 0.35 + i * 0.2} transform="scale(0.5 1)" />
          <path d={d} fill={colors[i]} opacity={i === 2 ? 1 : 0.35 + i * 0.2} transform="translate(719 0) scale(0.5 1)" />
        </motion.svg>
      ))}
    </div>
  );
}

/** Infinite horizontal scroller. Content is duplicated for a seamless loop; pauses on hover. */
export function Marquee({ children, duration = 45, className = '', reverse = false }) {
  return (
    <div className={`group relative flex overflow-hidden [mask-image:linear-gradient(90deg,transparent,#000_8%,#000_92%,transparent)] ${className}`}>
      <div
        className="flex w-max animate-marquee gap-4 pr-4 group-hover:[animation-play-state:paused]"
        style={{ '--marquee-duration': `${duration}s`, animationDirection: reverse ? 'reverse' : 'normal' }}
      >
        {children}
        <div aria-hidden className="flex gap-4">{children}</div>
      </div>
    </div>
  );
}
