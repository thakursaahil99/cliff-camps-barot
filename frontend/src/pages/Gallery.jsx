import { useCallback, useEffect, useRef, useState } from 'react';
import { AnimatePresence, LayoutGroup, motion } from 'framer-motion';
import { ChevronLeft, ChevronRight, Expand, X } from 'lucide-react';
import { BUSINESS, GALLERY, PHOTOS } from '../lib/site.js';
import { Img, PageHero, Seo } from '../components/ui.jsx';

const FILTERS = ['All', 'Camp', 'Tents', 'Food', 'Valley'];

function Lightbox({ photos, index, onClose, onNav }) {
  const photo = photos[index];
  const closeRef = useRef(null);
  const [dir, setDir] = useState(0);

  const go = useCallback((d) => {
    setDir(d);
    onNav((index + d + photos.length) % photos.length);
  }, [index, photos.length, onNav]);

  useEffect(() => {
    const prevFocus = document.activeElement;
    closeRef.current?.focus();
    document.body.style.overflow = 'hidden';
    const onKey = (e) => {
      if (e.key === 'Escape') onClose();
      if (e.key === 'ArrowRight') go(1);
      if (e.key === 'ArrowLeft') go(-1);
    };
    window.addEventListener('keydown', onKey);
    return () => {
      window.removeEventListener('keydown', onKey);
      document.body.style.overflow = '';
      prevFocus?.focus?.();
    };
  }, [go, onClose]);

  return (
    <motion.div
      role="dialog"
      aria-modal="true"
      aria-label={`Photo ${index + 1} of ${photos.length}`}
      className="fixed inset-0 z-[90] flex flex-col bg-forest-950/95 backdrop-blur-md"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      onClick={onClose}
    >
      <div className="flex items-center justify-between p-4 text-cream" onClick={(e) => e.stopPropagation()}>
        <span className="font-display text-2xl tracking-wider">
          {String(index + 1).padStart(2, '0')} <span className="text-cream/40">/ {String(photos.length).padStart(2, '0')}</span>
        </span>
        <button ref={closeRef} type="button" onClick={onClose} aria-label="Close" className="grid h-12 w-12 place-items-center rounded-full bg-cream/10 hover:bg-cream/20">
          <X />
        </button>
      </div>

      <div className="relative flex flex-1 items-center justify-center overflow-hidden px-4" onClick={(e) => e.stopPropagation()}>
        <AnimatePresence initial={false} custom={dir} mode="popLayout">
          <motion.img
            key={photo.src}
            layoutId={dir === 0 ? `photo-${photo.src}` : undefined}
            src={photo.src}
            srcSet={photo.srcSet}
            sizes="90vw"
            alt={photo.alt}
            custom={dir}
            initial={dir === 0 ? false : { x: dir * 300, opacity: 0, scale: 0.9 }}
            animate={{ x: 0, opacity: 1, scale: 1 }}
            exit={{ x: dir * -300, opacity: 0, scale: 0.9 }}
            transition={{ type: 'spring', stiffness: 260, damping: 30 }}
            drag="x"
            dragConstraints={{ left: 0, right: 0 }}
            dragElastic={0.6}
            onDragEnd={(_, info) => {
              if (info.offset.x < -80) go(1);
              else if (info.offset.x > 80) go(-1);
            }}
            className="max-h-[75vh] max-w-full cursor-grab rounded-2xl object-contain shadow-2xl active:cursor-grabbing"
          />
        </AnimatePresence>
        <button type="button" onClick={() => go(-1)} aria-label="Previous photo" className="absolute left-3 grid h-12 w-12 place-items-center rounded-full bg-cream/10 text-cream hover:bg-cream/25 sm:left-6">
          <ChevronLeft />
        </button>
        <button type="button" onClick={() => go(1)} aria-label="Next photo" className="absolute right-3 grid h-12 w-12 place-items-center rounded-full bg-cream/10 text-cream hover:bg-cream/25 sm:right-6">
          <ChevronRight />
        </button>
      </div>

      <p className="mx-auto max-w-2xl p-5 text-center text-sm text-cream/80" onClick={(e) => e.stopPropagation()}>
        {photo.alt}
      </p>
    </motion.div>
  );
}

export default function Gallery() {
  const [filter, setFilter] = useState('All');
  const [open, setOpen] = useState(null);
  const photos = filter === 'All' ? GALLERY : GALLERY.filter((p) => p.category === filter);

  return (
    <>
      <Seo title="Gallery" path="/gallery" description="Photos of Cliff Camps, Barot - Swiss tents, the riverside camp, the Barot valley and the trout treat from our kitchen." />
      <PageHero eyebrow="Gallery" title="A look around the camp" intro="Real photos from Cliff Camps - the tents, the river, the valley and the kitchen." photo={PHOTOS.pond} />

      <section className="py-16 pb-36 sm:py-20 sm:pb-40">
        <div className="container-x">
          <LayoutGroup>
            <div role="toolbar" aria-label="Filter photos" className="mb-10 flex flex-wrap justify-center gap-2">
              {FILTERS.map((f) => (
                <button
                  key={f}
                  type="button"
                  aria-pressed={filter === f}
                  onClick={() => setFilter(f)}
                  className={`relative rounded-full px-5 py-2.5 text-sm font-semibold transition ${filter === f ? 'text-cream' : 'text-forest hover:bg-forest/5'}`}
                >
                  {filter === f && <motion.span layoutId="filter-pill" className="absolute inset-0 rounded-full bg-forest" transition={{ type: 'spring', stiffness: 400, damping: 32 }} />}
                  <span className="relative">{f}</span>
                </button>
              ))}
            </div>

            <motion.div layout className="columns-2 gap-3 sm:gap-4 md:columns-3 lg:columns-4">
              <AnimatePresence mode="popLayout">
                {photos.map((p, i) => (
                  <motion.button
                    layout
                    key={p.src}
                    type="button"
                    onClick={() => setOpen(i)}
                    initial={{ opacity: 0, scale: 0.85, y: 30 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.85 }}
                    transition={{ duration: 0.5, delay: i * 0.03, ease: [0.16, 1, 0.3, 1] }}
                    className="group relative mb-3 block w-full break-inside-avoid overflow-hidden rounded-2xl bg-forest/10 sm:mb-4 sm:rounded-3xl"
                    aria-label={`Open photo: ${p.alt}`}
                  >
                    <motion.div layoutId={`photo-${p.src}`}>
                      <Img photo={p} sizes="(min-width: 1024px) 25vw, (min-width: 768px) 33vw, 50vw" className="w-full transition duration-700 group-hover:scale-105" />
                    </motion.div>
                    <span className="absolute inset-0 flex items-end bg-gradient-to-t from-forest/80 via-transparent to-transparent p-4 opacity-0 transition duration-500 group-hover:opacity-100 group-focus-visible:opacity-100">
                      <span className="flex w-full items-center justify-between text-left text-xs text-cream">
                        <span className="rounded-full bg-cream/20 px-2.5 py-1 font-semibold backdrop-blur">{p.category}</span>
                        <Expand size={18} />
                      </span>
                    </span>
                  </motion.button>
                ))}
              </AnimatePresence>
            </motion.div>
          </LayoutGroup>

          <p className="mt-12 text-center text-ink/70">
            More reels and photos on Instagram:{' '}
            <a href={BUSINESS.instagram} target="_blank" rel="noopener noreferrer" className="link">
              {BUSINESS.instagramHandle}
            </a>
          </p>
        </div>
      </section>

      <AnimatePresence>{open !== null && <Lightbox photos={photos} index={open} onClose={() => setOpen(null)} onNav={setOpen} />}</AnimatePresence>
    </>
  );
}
