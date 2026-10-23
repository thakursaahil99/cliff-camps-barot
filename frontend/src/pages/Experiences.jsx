import { useLayoutEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { motion, useScroll, useTransform } from 'framer-motion';
import { ArrowRight, Fish, Footprints, Landmark, Mountain, PawPrint, Snowflake, TrainFront, Trees, UtensilsCrossed, Waves } from 'lucide-react';
import { PHOTOS, whatsappUrl } from '../lib/site.js';
import { useMediaQuery } from '../lib/hooks.js';
import { Img, PageHero, SectionHeading, Seo } from '../components/ui.jsx';
import { Reveal } from '../components/motion.jsx';

const STORIES = [
  {
    id: 'river',
    icon: Waves,
    eyebrow: 'Riverside camping',
    title: 'The constant white noise of the river',
    text: 'Our tents sit right by the water at the Old Hatchery on the Barot - Lohardi road. Let the river be your soundtrack - from your first chai to the last star at night.',
    photos: [PHOTOS.riversideWide, PHOTOS.pond]
  },
  {
    id: 'goats',
    icon: PawPrint,
    eyebrow: 'Lovely views',
    title: 'Wild goats come grazing often',
    text: 'Riverside camping with great views within walking distance. Keep your camera close - wild goats often wander down the slopes to graze near the camp.',
    photos: [PHOTOS.meadow, PHOTOS.valleyView]
  },
  {
    id: 'snow',
    icon: Snowflake,
    eyebrow: 'Snow not far away',
    title: 'Views of white snow peaks',
    text: 'Pine-covered hills rise straight from the river, and white snow peaks are not far away. Clear mornings in the Barot valley are something else.',
    photos: [PHOTOS.valley, PHOTOS.tentsRow]
  },
  {
    id: 'food',
    icon: Fish,
    eyebrow: 'Great food',
    title: 'Trout treat by our in-house chef',
    text: 'Delicious food cooked by our in-house chef at the Cliff Camp Food Hub. The house speciality: whole trout, grilled and served with fresh salad - Barot is known for its trout.',
    photos: [PHOTOS.trout, PHOTOS.foodHub]
  }
];

function Story({ s, index }) {
  const ref = useRef(null);
  const { scrollYProgress } = useScroll({ target: ref, offset: ['start end', 'end start'] });
  const y1 = useTransform(scrollYProgress, [0, 1], ['8%', '-8%']);
  const y2 = useTransform(scrollYProgress, [0, 1], ['30%', '-30%']);
  const rot = useTransform(scrollYProgress, [0, 1], [index % 2 ? -8 : 8, index % 2 ? 4 : -4]);
  const flip = index % 2 === 1;
  return (
    <section id={s.id} ref={ref} className="scroll-mt-24 py-16 sm:py-24">
      <div className={`container-x grid items-center gap-12 lg:grid-cols-2 lg:gap-20 ${flip ? 'lg:[&>*:first-child]:order-2' : ''}`}>
        <div className="relative mx-auto w-full max-w-xl">
          <motion.div style={{ y: y1 }} className="overflow-hidden rounded-[2.5rem] shadow-[0_40px_80px_-40px_rgba(11,42,30,0.6)]">
            <Img photo={s.photos[0]} sizes="(min-width: 1024px) 45vw, 100vw" className="aspect-[4/3] w-full object-cover" />
          </motion.div>
          <motion.div style={{ y: y2, rotate: rot }} className={`absolute -bottom-10 w-36 overflow-hidden rounded-3xl border-[5px] border-cream shadow-2xl sm:w-48 ${flip ? '-left-4 sm:-left-10' : '-right-4 sm:-right-10'}`}>
            <Img photo={s.photos[1]} sizes="200px" className="aspect-[3/4] w-full object-cover" />
          </motion.div>
        </div>
        <Reveal x={flip ? -40 : 40} y={0}>
          <span className="mb-5 grid h-14 w-14 place-items-center rounded-2xl bg-forest text-lime shadow-lg">
            <s.icon size={24} />
          </span>
          <span className="eyebrow">{s.eyebrow}</span>
          <h2 className="mt-2 text-5xl leading-[0.95] text-forest sm:text-6xl">{s.title}</h2>
          <p className="mt-5 max-w-lg text-lg leading-relaxed text-ink/75">{s.text}</p>
          {s.id === 'food' && (
            <a href={whatsappUrl('Hi Cliff Camps! I would like to ask about meals and the trout treat.')} target="_blank" rel="noopener noreferrer" className="btn-sun mt-7">
              <UtensilsCrossed size={16} /> Ask about meals
            </a>
          )}
        </Reveal>
      </div>
    </section>
  );
}

// Well-known places around Barot. Kept general on purpose - ask the camp for routes and timings.
const NEARBY = [
  { icon: Waves, name: 'Uhl River', text: 'The river that runs past the camp - clear mountain water, boulders and the sound you fall asleep to.' },
  { icon: Fish, name: 'Trout country', text: 'Barot is known for its trout. The camp sits at the Old Hatchery - and the in-house chef makes the most of it.' },
  { icon: Landmark, name: 'Barot reservoir', text: 'The reservoir built for the historic Shanan hydel project, one of the oldest in the region, is a short way down the valley.' },
  { icon: Trees, name: 'Nargu Wildlife Sanctuary', text: 'Forested slopes across the Uhl, home to Himalayan birds and wildlife - a quiet place for nature walks.' },
  { icon: Mountain, name: 'Lohardi village', text: 'Follow the river road upstream to Lohardi for village life, terraced fields and more mountain views.' },
  { icon: TrainFront, name: 'The haulage line', text: 'The old haulage rail line built for the hydel project climbs from Jogindernagar towards Barot - a slice of local history.' },
  { icon: Footprints, name: 'Treks & trails', text: 'Barot is a base for Himalayan treks towards the Bara Bhangal region and high passes. Ask us before you set out.' }
];

function Nearby() {
  const target = useRef(null);
  const track = useRef(null);
  const [distance, setDistance] = useState(0);
  const isDesktop = useMediaQuery('(min-width: 1024px)');
  const { scrollYProgress } = useScroll({ target });
  const x = useTransform(scrollYProgress, [0, 1], [0, -distance]);

  useLayoutEffect(() => {
    const measure = () => track.current && setDistance(Math.max(0, track.current.scrollWidth - window.innerWidth + 48));
    measure();
    window.addEventListener('resize', measure);
    return () => window.removeEventListener('resize', measure);
  }, [isDesktop]);

  const cards = NEARBY.map((n, i) => (
    <article key={n.name} className="relative flex w-[78vw] max-w-[360px] shrink-0 snap-center flex-col rounded-[2rem] bg-cream p-7 text-forest shadow-xl sm:w-[340px] lg:h-[380px]">
      <span className="font-display text-7xl text-forest/10">0{i + 1}</span>
      <span className="mt-2 grid h-12 w-12 place-items-center rounded-2xl bg-lime text-forest"><n.icon size={22} /></span>
      <h3 className="mt-5 text-4xl">{n.name}</h3>
      <p className="mt-2 text-ink/75">{n.text}</p>
    </article>
  ));

  if (!isDesktop) {
    return (
      <section className="bg-forest py-24 text-cream">
        <div className="container-x mb-10">
          <SectionHeading align="left" dark eyebrow="Around the camp" title="Nearby Barot attractions" className="!mx-0" />
        </div>
        <div className="flex snap-x snap-mandatory gap-4 overflow-x-auto px-4 pb-6 [scrollbar-width:none]">{cards}</div>
      </section>
    );
  }

  return (
    <section ref={target} className="relative bg-forest text-cream" style={{ height: `calc(100vh + ${distance}px)` }}>
      <div className="sticky top-0 flex h-screen flex-col justify-center overflow-hidden">
        <div className="container-x mb-10 flex items-end justify-between">
          <SectionHeading align="left" dark eyebrow="Around the camp" title="Nearby Barot attractions" className="!mx-0" />
          <p className="max-w-xs text-sm text-cream/60">Keep scrolling to explore the valley. Ask us for routes and the best time to go.</p>
        </div>
        <motion.div ref={track} style={{ x }} className="flex gap-6 pl-[max(1.5rem,calc((100vw-80rem)/2+2rem))]">
          {cards}
          <div className="w-8 shrink-0" />
        </motion.div>
      </div>
    </section>
  );
}

export default function Experiences() {
  return (
    <>
      <Seo
        title="Experiences & Food"
        path="/experiences"
        description="Riverside camping, wild goats, snow views and a trout treat by our in-house chef at Barot, Himachal Pradesh - plus nearby Barot attractions."
      />
      <PageHero eyebrow="Experiences & Food" title="River, snow, goats & trout" intro="Everything we love about Barot, a few steps from your tent." photo={PHOTOS.valley} />
      <div className="py-10">
        {STORIES.map((s, i) => <Story key={s.id} s={s} index={i} />)}
      </div>
      <Nearby />
      <section className="py-24 pb-36">
        <Reveal className="container-x text-center">
          <span className="eyebrow">Ready when you are</span>
          <h2 className="mx-auto mt-2 max-w-3xl text-5xl leading-[0.95] text-forest sm:text-7xl">Come for the river. Stay for the trout.</h2>
          <Link to="/book" className="btn-primary mt-8 px-9 py-4 text-base">
            Book your tent <ArrowRight size={18} />
          </Link>
        </Reveal>
      </section>
    </>
  );
}
