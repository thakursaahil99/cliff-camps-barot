import { useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { motion, useReducedMotion, useScroll, useTransform } from 'framer-motion';
import { ArrowRight, BedDouble, ChevronDown, Instagram, Mountain, Pause, Play, UtensilsCrossed } from 'lucide-react';
import { BUSINESS, PHOTOS, VIDEO, VIDEOS, whatsappUrl } from '../lib/site.js';
import { useMediaQuery } from '../lib/hooks.js';
import { Img, Logo, SectionHeading, Seo } from '../components/ui.jsx';
import { Magnetic, Marquee, Reveal, RiverWaves, SplitText, Stagger, TiltCard, item } from '../components/motion.jsx';
import Snowfall from '../components/Snowfall.jsx';
import Reel from '../components/Reel.jsx';

function RotatingBadge({ size = 132 }) {
  const reduce = useReducedMotion();
  return (
    <div className="relative grid place-items-center" style={{ width: size, height: size }}>
      <motion.svg viewBox="0 0 100 100" className="absolute inset-0" animate={reduce ? undefined : { rotate: 360 }} transition={{ duration: 22, repeat: Infinity, ease: 'linear' }} aria-hidden>
        <defs>
          <path id="badge-circle" d="M50,50 m-41,0 a41,41 0 1,1 82,0 a41,41 0 1,1 -82,0" />
        </defs>
        <text className="fill-cream font-sans text-[8.2px] font-semibold tracking-[0.32em] uppercase">
          <textPath href="#badge-circle">Explore the nature • Riverside bliss •</textPath>
        </text>
      </motion.svg>
      <Logo size={size * 0.56} className="relative shadow-xl" style={{ width: size * 0.56, height: size * 0.56 }} />
    </div>
  );
}

function VideoCard() {
  const ref = useRef(null);
  const [playing, setPlaying] = useState(true);
  const toggle = () => {
    const v = ref.current;
    if (!v) return;
    if (v.paused) { v.play(); setPlaying(true); } else { v.pause(); setPlaying(false); }
  };
  return (
    <TiltCard max={8} className="rounded-[2.2rem]">
      <div className="relative w-[250px] overflow-hidden rounded-[2.2rem] border-[6px] border-forest-950/80 bg-forest-950 shadow-[0_40px_80px_-20px_rgba(0,0,0,0.7)] xl:w-[280px]">
        <video ref={ref} className="aspect-[9/16] w-full object-cover" src={VIDEO.src} poster={VIDEO.poster} autoPlay muted loop playsInline preload="metadata" aria-label="Short video tour of Cliff Camps, Barot" />
        <div className="absolute inset-x-0 top-0 flex items-center justify-between bg-gradient-to-b from-black/60 to-transparent p-4">
          <span className="flex items-center gap-2 text-xs font-semibold text-cream">
            <span className="h-2 w-2 animate-pulse rounded-full bg-pin" /> Camp tour
          </span>
          <button type="button" onClick={toggle} aria-label={playing ? 'Pause video' : 'Play video'} className="grid h-8 w-8 place-items-center rounded-full bg-cream/20 text-cream backdrop-blur hover:bg-cream/30">
            {playing ? <Pause size={14} /> : <Play size={14} />}
          </button>
        </div>
      </div>
    </TiltCard>
  );
}

function Hero() {
  const ref = useRef(null);
  const isDesktop = useMediaQuery('(min-width: 768px)');
  const { scrollYProgress } = useScroll({ target: ref, offset: ['start start', 'end start'] });
  const bgY = useTransform(scrollYProgress, [0, 1], ['0%', '25%']);
  const contentY = useTransform(scrollYProgress, [0, 1], ['0%', '40%']);
  const fade = useTransform(scrollYProgress, [0, 0.7], [1, 0]);

  return (
    <section ref={ref} className="grain relative isolate flex min-h-[100svh] items-end overflow-hidden bg-forest text-cream md:items-center">
      <motion.div style={{ y: bgY }} className="absolute inset-0 -z-20">
        {isDesktop ? (
          <motion.div initial={{ scale: 1.25 }} animate={{ scale: 1.05 }} transition={{ duration: 2.8, ease: [0.16, 1, 0.3, 1] }} className="h-full w-full">
            <Img photo={PHOTOS.riversideWide} priority sizes="100vw" alt="" className="h-full w-full animate-[float_18s_ease-in-out_infinite] object-cover [--float-rot:0.4deg]" />
          </motion.div>
        ) : (
          // taller than the screen and bottom-anchored: crops the text burned into the top of the clip
          <video className="absolute bottom-0 h-[122%] w-full object-cover object-bottom" src={VIDEO.src} poster={VIDEO.poster} autoPlay muted loop playsInline preload="metadata" aria-hidden />
        )}
      </motion.div>
      <div className="absolute inset-0 -z-10 bg-gradient-to-t from-forest via-forest/55 to-forest/30 md:bg-gradient-to-r md:from-forest/95 md:via-forest/60 md:to-forest/10" />
      <Snowfall className="-z-10" />

      <motion.div style={{ y: contentY, opacity: fade }} className="container-x relative grid items-center gap-10 pt-32 pb-28 md:pb-24 lg:grid-cols-[1.4fr_1fr]">
        <div>
          <motion.p initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3, duration: 0.8 }} className="eyebrow">
            {BUSINESS.tagline}
          </motion.p>
          <h1 className="mt-3 text-[clamp(3.6rem,11vw,9rem)] leading-[0.85]">
            <SplitText text="Experience" delay={0.4} className="block" />
            <SplitText text="Riverside Bliss" delay={0.75} className="block text-gradient-sun" />
          </h1>
          <motion.p initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 1.2, duration: 0.9 }} className="mt-6 max-w-xl text-lg leading-relaxed text-cream/85 sm:text-xl">
            {BUSINESS.intro}
          </motion.p>
          <motion.div initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 1.4, duration: 0.9 }} className="mt-8 flex flex-wrap items-center gap-3">
            <Magnetic>
              <Link to="/book" className="btn-primary group px-8 py-4 text-base">
                <span className="shimmer absolute inset-0" aria-hidden />
                <span className="relative">Book Now</span>
                <ArrowRight size={18} className="relative transition group-hover:translate-x-1" />
              </Link>
            </Magnetic>
            <Link to="/stay" className="btn-ghost px-7 py-4 text-base">See the tents</Link>
          </motion.div>
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 1.7, duration: 1 }} className="mt-10 flex items-center gap-5">
            <RotatingBadge size={112} />
            <p className="font-script text-3xl leading-tight text-lime sm:text-4xl">
              Explore
              <br />
              the Nature
            </p>
          </motion.div>
        </div>

        <motion.div initial={{ opacity: 0, y: 60, rotate: 6 }} animate={{ opacity: 1, y: 0, rotate: 3 }} transition={{ delay: 1, duration: 1.2, ease: [0.16, 1, 0.3, 1] }} className="hidden justify-self-center lg:block">
          <div className="animate-float [--float-rot:2deg]">
            <VideoCard />
          </div>
        </motion.div>
      </motion.div>

      <motion.a
        href="#intro"
        aria-label="Scroll to learn more"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1, y: [0, 10, 0] }}
        transition={{ opacity: { delay: 2 }, y: { repeat: Infinity, duration: 2, ease: 'easeInOut' } }}
        className="absolute bottom-20 left-1/2 hidden -translate-x-1/2 flex-col items-center gap-1 text-xs tracking-[0.3em] text-cream/70 uppercase md:flex"
      >
        Scroll <ChevronDown size={18} />
      </motion.a>
      <RiverWaves className="absolute inset-x-0 bottom-0" colors={['#2A9DB5', '#7CB342', '#F5F1E3']} />
    </section>
  );
}

/** Words light up one by one as the paragraph scrolls through the viewport. */
function ScrollText({ text }) {
  const ref = useRef(null);
  const { scrollYProgress } = useScroll({ target: ref, offset: ['start 0.85', 'end 0.4'] });
  const words = text.split(' ');
  return (
    <p ref={ref} className="flex flex-wrap justify-center gap-x-[0.28em] font-display text-[clamp(2.4rem,6vw,5.2rem)] leading-[1] text-forest" aria-label={text}>
      {words.map((w, i) => (
        <Word key={i} progress={scrollYProgress} range={[i / words.length, (i + 1) / words.length]}>
          {w}
        </Word>
      ))}
    </p>
  );
}
function Word({ children, progress, range }) {
  const opacity = useTransform(progress, range, [0.12, 1]);
  const y = useTransform(progress, range, [12, 0]);
  return (
    <motion.span aria-hidden style={{ opacity, y }} className="inline-block">
      {children}
    </motion.span>
  );
}

const HIGHLIGHTS = [
  { icon: BedDouble, title: 'Comfortable Tents', text: 'Our Swiss tents ensure great comfort.', photo: PHOTOS.tentInterior, to: '/stay', accent: 'from-teal/80' },
  { icon: Mountain, title: 'Lovely Views', text: 'Riverside camping with great views within walking distance. Wild goats come grazing often.', photo: PHOTOS.riverside, to: '/experiences', accent: 'from-lime/80' },
  { icon: UtensilsCrossed, title: 'Great Food', text: 'Delicious food cooked by our in-house chef. Trout Treat!', photo: PHOTOS.trout, to: '/experiences#food', accent: 'from-sun/80' }
];

function Highlights() {
  return (
    <section id="intro" className="relative overflow-hidden py-24 sm:py-32">
      <div className="container-x">
        <Reveal className="mx-auto mb-6 text-center">
          <span className="eyebrow">Barot, Himachal Pradesh</span>
        </Reveal>
        <div className="mx-auto max-w-5xl">
          <ScrollText text="Lose yourself to nature with the constant white noise of the river and views of white snow not far away." />
        </div>

        <div className="mt-24">
          <SectionHeading eyebrow="Why guests love it" title="Riverside Camping in Swiss Tents" />
          <Stagger className="mt-14 grid gap-6 sm:grid-cols-2 lg:grid-cols-3" stagger={0.15}>
            {HIGHLIGHTS.map((h, i) => (
              <motion.div key={h.title} variants={item} className={i === 2 ? "sm:col-span-2 lg:col-span-1" : undefined}>
                <TiltCard className="h-full rounded-[2rem]">
                  <Link to={h.to} className="group relative flex h-[380px] flex-col justify-end overflow-hidden rounded-[2rem] bg-forest text-cream shadow-[0_30px_60px_-30px_rgba(11,42,30,0.7)] sm:h-[440px] lg:h-[480px]">
                    <Img photo={h.photo} sizes="(min-width: 768px) 33vw, 100vw" className="absolute inset-0 h-full w-full object-cover transition duration-[1.2s] ease-out group-hover:scale-110" />
                    <div className={`absolute inset-0 bg-gradient-to-t ${h.accent} via-forest/40 to-transparent opacity-0 transition duration-700 group-hover:opacity-100`} />
                    <div className="absolute inset-0 bg-gradient-to-t from-forest via-forest/50 to-transparent" />
                    <span className="absolute top-5 left-6 font-display text-7xl text-cream/25 transition group-hover:text-cream/50">0{i + 1}</span>
                    <div className="relative p-7" style={{ transform: 'translateZ(40px)' }}>
                      <span className="mb-4 grid h-12 w-12 place-items-center rounded-2xl bg-cream/15 ring-1 ring-cream/25 backdrop-blur transition group-hover:bg-lime group-hover:text-forest">
                        <h.icon size={22} />
                      </span>
                      <h3 className="text-4xl">{h.title}</h3>
                      <p className="mt-2 text-cream/85">{h.text}</p>
                      <span className="mt-4 inline-flex items-center gap-2 text-sm font-semibold text-lime">
                        Discover <ArrowRight size={16} className="transition group-hover:translate-x-1.5" />
                      </span>
                    </div>
                  </Link>
                </TiltCard>
              </motion.div>
            ))}
          </Stagger>
        </div>
      </div>
    </section>
  );
}

function Winter() {
  const ref = useRef(null);
  const { scrollYProgress } = useScroll({ target: ref, offset: ['start end', 'end start'] });
  const yA = useTransform(scrollYProgress, [0, 1], ['10%', '-10%']);
  const yB = useTransform(scrollYProgress, [0, 1], ['24%', '-14%']);
  const yPhoto = useTransform(scrollYProgress, [0, 1], ['-6%', '6%']);
  return (
    <section ref={ref} className="grain relative isolate overflow-hidden bg-forest-950 py-24 text-cream sm:py-32">
      <Snowfall density={0.00025} className="-z-10" />
      <div aria-hidden className="absolute top-0 left-1/2 -z-10 h-[520px] w-[820px] -translate-x-1/2 rounded-full bg-teal/20 blur-[120px]" />
      <div className="container-x grid items-center gap-14 lg:grid-cols-[1fr_1.05fr] lg:gap-16">
        <div>
          <SectionHeading align="left" dark eyebrow="Winter at the camp" title="When snow falls on Barot" className="!mx-0">
            In winter the whole camp turns white - snow on the tents, the pines and the hills all around. Real moments from Cliff Camps, filmed at the camp.
          </SectionHeading>
          <Reveal delay={0.15} className="relative mt-10">
            <motion.div style={{ y: yPhoto }} className="overflow-hidden rounded-[2rem] shadow-2xl ring-1 ring-cream/10">
              <Img photo={PHOTOS.winterCamp} sizes="(min-width: 1024px) 45vw, 100vw" className="aspect-[4/3] w-full object-cover object-[50%_60%] transition duration-[1.5s] hover:scale-105" />
            </motion.div>
            <span className="absolute -top-4 -left-3 rotate-[-6deg] rounded-full bg-sun px-4 py-1.5 font-script text-xl text-forest shadow-lg">Snow day!</span>
          </Reveal>
          <Reveal delay={0.25} className="mt-10 flex flex-wrap gap-3">
            <Link to="/book" className="btn-primary">Book a winter stay <ArrowRight size={16} /></Link>
            <Link to="/gallery" className="btn-ghost">More winter photos</Link>
          </Reveal>
        </div>
        <div className="grid grid-cols-2 gap-4 sm:gap-6">
          <motion.div style={{ y: yA }}>
            <Reveal><Reel video={VIDEOS.winterNights} /></Reveal>
          </motion.div>
          <motion.div style={{ y: yB }} className="mt-16 sm:mt-24">
            <Reveal delay={0.15}><Reel video={VIDEOS.winterDay} /></Reveal>
          </motion.div>
        </div>
      </div>
    </section>
  );
}

function GalleryStrip() {
  const row1 = [PHOTOS.riverside, PHOTOS.winterTents, PHOTOS.foodHub, PHOTOS.blueTents, PHOTOS.winterBonfire, PHOTOS.pond, PHOTOS.yellowTent, PHOTOS.tentWindow, PHOTOS.lamp];
  const row2 = [PHOTOS.valley, PHOTOS.tentInterior, PHOTOS.winterChairs, PHOTOS.trout, PHOTOS.meadow, PHOTOS.winterDog, PHOTOS.buddha, PHOTOS.tentsRow, PHOTOS.valleyView];
  const tile = (p, i, wide) => (
    <Link key={i} to="/gallery" className={`group relative block shrink-0 overflow-hidden rounded-3xl ${wide ? 'h-56 w-80 sm:h-64 sm:w-96' : 'h-56 w-44 sm:h-64 sm:w-52'}`}>
      <Img photo={p} sizes="400px" className="h-full w-full object-cover transition duration-700 group-hover:scale-110" />
      <span className="absolute inset-0 bg-forest/0 transition group-hover:bg-forest/20" />
    </Link>
  );
  return (
    <section className="relative bg-forest py-24 text-cream sm:py-32">
      <div className="container-x mb-12 flex flex-col items-start justify-between gap-6 md:flex-row md:items-end">
        <SectionHeading align="left" dark eyebrow="Life at the camp" title="Moments by the river" className="!mx-0" />
        <Reveal>
          <Link to="/gallery" className="btn-ghost">
            Open gallery <ArrowRight size={16} />
          </Link>
        </Reveal>
      </div>
      <div className="space-y-4">
        <Marquee duration={55}>{row1.map((p, i) => tile(p, i, p.width > p.height))}</Marquee>
        <Marquee duration={65} reverse>{row2.map((p, i) => tile(p, i, p.width > p.height))}</Marquee>
      </div>
    </section>
  );
}

function SocialProof() {
  const ref = useRef(null);
  const { scrollYProgress } = useScroll({ target: ref, offset: ['start end', 'end start'] });
  const y = useTransform(scrollYProgress, [0, 1], ['-15%', '15%']);
  return (
    <section ref={ref} className="relative isolate overflow-hidden py-28 text-cream sm:py-40">
      <motion.div style={{ y }} className="absolute inset-[-15%_0] -z-10">
        <Img photo={PHOTOS.riverside} sizes="100vw" alt="" className="h-full w-full object-cover object-[50%_40%]" />
      </motion.div>
      <div className="absolute inset-0 -z-10 bg-forest/75" />
      <div className="container-x grid items-center gap-10 lg:grid-cols-2">
        <SectionHeading align="left" dark eyebrow="Book with confidence" title="Hosted on Airbnb, loved on Instagram" className="!mx-0">
          Cliff Camps is also listed on Airbnb, where you can read reviews from past guests, and you can follow everyday life at the camp on Instagram. Booking direct here gets you the same tents with instant availability.
        </SectionHeading>
        <Stagger className="grid gap-4 sm:grid-cols-2">
          <motion.a variants={item} href={BUSINESS.airbnb} target="_blank" rel="noopener noreferrer" className="group rounded-3xl bg-cream p-6 text-forest shadow-2xl transition hover:-translate-y-1">
            <div className="flex items-center gap-3">
              <span className="grid h-12 w-12 place-items-center rounded-2xl bg-[#FF385C] text-xl font-bold text-white">A</span>
              <div>
                <p className="text-xs font-semibold tracking-widest text-forest/60 uppercase">Listed on</p>
                <p className="font-display text-3xl">Airbnb</p>
              </div>
            </div>
            <p className="mt-4 text-sm text-ink/70">Read guest reviews and ratings on our Airbnb listing.</p>
            <span className="mt-4 inline-flex items-center gap-2 text-sm font-semibold text-teal-700">
              Read reviews <ArrowRight size={16} className="transition group-hover:translate-x-1" />
            </span>
          </motion.a>
          <motion.a variants={item} href={BUSINESS.instagram} target="_blank" rel="noopener noreferrer" className="group rounded-3xl bg-gradient-to-br from-[#f58529] via-[#dd2a7b] to-[#8134af] p-6 text-white shadow-2xl transition hover:-translate-y-1">
            <div className="flex items-center gap-3">
              <span className="grid h-12 w-12 place-items-center rounded-2xl bg-white/20">
                <Instagram size={24} />
              </span>
              <div>
                <p className="text-xs font-semibold tracking-widest text-white/80 uppercase">Follow</p>
                <p className="font-display text-3xl">{BUSINESS.instagramHandle}</p>
              </div>
            </div>
            <p className="mt-4 text-sm text-white/85">Reels and photos from the riverside, the tents and the kitchen.</p>
            <span className="mt-4 inline-flex items-center gap-2 text-sm font-semibold">
              See us on Instagram <ArrowRight size={16} className="transition group-hover:translate-x-1" />
            </span>
          </motion.a>
        </Stagger>
      </div>
    </section>
  );
}

function FinalCta() {
  return (
    <section className="relative overflow-hidden py-24 pb-40 sm:py-32 sm:pb-48">
      <div className="container-x">
        <Reveal className="grain relative isolate overflow-hidden rounded-[2.5rem] bg-forest px-6 py-16 text-center text-cream sm:px-16 sm:py-24">
          <Snowfall density={0.0002} className="-z-10" />
          <motion.div aria-hidden className="absolute -top-24 -right-24 -z-10 h-72 w-72 rounded-full bg-lime/30 blur-3xl" animate={{ scale: [1, 1.2, 1] }} transition={{ duration: 8, repeat: Infinity }} />
          <motion.div aria-hidden className="absolute -bottom-24 -left-24 -z-10 h-72 w-72 rounded-full bg-teal/30 blur-3xl" animate={{ scale: [1.2, 1, 1.2] }} transition={{ duration: 8, repeat: Infinity }} />
          <Logo size={88} className="mx-auto mb-6 h-22 w-22 ring-4 ring-cream/10" />
          <h2 className="mx-auto max-w-3xl text-5xl leading-[0.95] sm:text-7xl">Your tent by the river is waiting</h2>
          <p className="mx-auto mt-5 max-w-xl text-cream/75">Pick your dates, see the price instantly and hold your tent with a small advance. Questions first? Message us on WhatsApp.</p>
          <div className="mt-9 flex flex-wrap justify-center gap-3">
            <Magnetic>
              <Link to="/book" className="btn-primary px-9 py-4 text-base">
                Check availability <ArrowRight size={18} />
              </Link>
            </Magnetic>
            <a href={whatsappUrl()} target="_blank" rel="noopener noreferrer" className="btn-ghost px-8 py-4 text-base">
              WhatsApp us
            </a>
          </div>
        </Reveal>
      </div>
    </section>
  );
}

export default function Home() {
  return (
    <>
      <Seo
        path="/"
        description="Riverside camping in Swiss tents at Barot, Himachal Pradesh. Fall asleep to the river, wake to snow views and wild goats, and enjoy a trout treat from our in-house chef. Book direct."
      />
      <Hero />
      <Highlights />
      <Winter />
      <GalleryStrip />
      <SocialProof />
      <FinalCta />
    </>
  );
}
