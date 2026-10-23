import { Helmet } from 'react-helmet-async';
import { motion, useScroll, useSpring } from 'framer-motion';
import { SITE_URL } from '../lib/site.js';
import { STATUS_LABEL, STATUS_TONE } from '../lib/format.js';
import { Reveal } from './motion.jsx';

/** Responsive, lazy-loaded WebP image. */
export function Img({ photo, sizes = '100vw', className = '', priority = false, alt, ...rest }) {
  return (
    <img
      src={photo.src}
      srcSet={photo.srcSet}
      sizes={sizes}
      width={photo.width}
      height={photo.height}
      alt={alt ?? photo.alt}
      loading={priority ? 'eager' : 'lazy'}
      decoding={priority ? 'sync' : 'async'}
      fetchPriority={priority ? 'high' : 'auto'}
      className={className}
      {...rest}
    />
  );
}

export function Logo({ size = 48, className = '', ...rest }) {
  return (
    <picture>
      <source srcSet="/logo.webp" type="image/webp" />
      <img src="/logo.png" width={size} height={size} alt="Cliff Camps, Barot logo" className={`rounded-full ${className}`} {...rest} />
    </picture>
  );
}

export function Seo({ title, description, path = '/', image = '/og-image.jpg', noindex = false }) {
  const full = title ? `${title} | Cliff Camps, Barot` : 'Cliff Camps, Barot | Riverside Camping in Swiss Tents';
  const url = `${SITE_URL}${path}`;
  return (
    <Helmet>
      <title>{full}</title>
      {description && <meta name="description" content={description} />}
      <link rel="canonical" href={url} />
      <meta property="og:title" content={full} />
      {description && <meta property="og:description" content={description} />}
      <meta property="og:url" content={url} />
      <meta property="og:image" content={`${SITE_URL}${image}`} />
      {noindex && <meta name="robots" content="noindex, nofollow" />}
    </Helmet>
  );
}

export function SectionHeading({ eyebrow, title, children, align = 'center', dark = false, className = '' }) {
  const alignCls = align === 'center' ? 'mx-auto text-center items-center' : 'items-start';
  return (
    <Reveal className={`flex max-w-3xl flex-col gap-3 ${alignCls} ${className}`}>
      {eyebrow && <span className="eyebrow">{eyebrow}</span>}
      <h2 className={`text-5xl leading-[0.95] sm:text-6xl lg:text-7xl ${dark ? 'text-cream' : 'text-forest'}`}>{title}</h2>
      {children && <p className={`max-w-2xl text-base leading-relaxed sm:text-lg ${dark ? 'text-cream/75' : 'text-ink/70'}`}>{children}</p>}
    </Reveal>
  );
}

export function ScrollProgress() {
  const { scrollYProgress } = useScroll();
  const scaleX = useSpring(scrollYProgress, { stiffness: 120, damping: 25, restDelta: 0.001 });
  return <motion.div aria-hidden style={{ scaleX }} className="fixed inset-x-0 top-0 z-[70] h-1 origin-left bg-gradient-to-r from-lime via-sun to-teal" />;
}

export function StatusPill({ value, className = '' }) {
  return (
    <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ring-1 ring-inset ${STATUS_TONE[value] || 'bg-forest/5 text-forest'} ${className}`}>
      {STATUS_LABEL[value] || value}
    </span>
  );
}

export function Spinner({ className = 'h-5 w-5' }) {
  return (
    <svg className={`animate-spin ${className}`} viewBox="0 0 24 24" fill="none" aria-hidden>
      <circle cx="12" cy="12" r="10" stroke="currentColor" strokeOpacity="0.25" strokeWidth="3" />
      <path d="M22 12a10 10 0 0 0-10-10" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
    </svg>
  );
}

/** Page header band for inner pages. */
export function PageHero({ eyebrow, title, intro, photo, children }) {
  return (
    <section className="grain relative isolate overflow-hidden bg-forest pt-32 pb-24 text-cream sm:pt-40 sm:pb-32">
      {photo && (
        <motion.div initial={{ scale: 1.15, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={{ duration: 1.6, ease: [0.16, 1, 0.3, 1] }} className="absolute inset-0 -z-10">
          <Img photo={photo} priority className="h-full w-full object-cover opacity-40" />
          <div className="absolute inset-0 bg-gradient-to-b from-forest/70 via-forest/60 to-forest" />
        </motion.div>
      )}
      <div className="container-x relative">
        <motion.span initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.2, duration: 0.8 }} className="eyebrow block">
          {eyebrow}
        </motion.span>
        <motion.h1
          initial={{ opacity: 0, y: 40 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3, duration: 1, ease: [0.16, 1, 0.3, 1] }}
          className="mt-2 max-w-4xl text-6xl leading-[0.9] sm:text-7xl lg:text-8xl"
        >
          {title}
        </motion.h1>
        {intro && (
          <motion.p initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.55, duration: 0.9 }} className="mt-6 max-w-2xl text-lg leading-relaxed text-cream/80">
            {intro}
          </motion.p>
        )}
        {children}
      </div>
    </section>
  );
}
