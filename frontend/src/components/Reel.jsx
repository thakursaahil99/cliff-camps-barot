import { useEffect, useRef, useState } from 'react';
import { useReducedMotion } from 'framer-motion';
import { Pause, Play } from 'lucide-react';

/** Portrait camp video: muted, loops, plays only while on screen (saves mobile data), with a pause button. */
export default function Reel({ video, className = '', showLabel = true }) {
  const ref = useRef(null);
  const reduce = useReducedMotion();
  const [paused, setPaused] = useState(false);
  const [playing, setPlaying] = useState(false);

  useEffect(() => {
    const v = ref.current;
    if (!v || reduce || paused) return;
    const io = new IntersectionObserver(([e]) => {
      if (e.isIntersecting) v.play().catch(() => {});
      else v.pause();
    }, { threshold: 0.35 });
    io.observe(v);
    return () => io.disconnect();
  }, [reduce, paused]);

  const toggle = () => {
    const v = ref.current;
    if (!v) return;
    if (v.paused) { setPaused(false); v.play().catch(() => {}); } else { setPaused(true); v.pause(); }
  };

  return (
    <div className={`relative overflow-hidden rounded-[2rem] bg-forest-950 shadow-[0_40px_80px_-30px_rgba(11,42,30,0.75)] ${className}`}>
      <video
        ref={ref}
        className="aspect-[9/16] w-full object-cover"
        src={video.src}
        poster={video.poster}
        muted
        loop
        playsInline
        preload="none"
        aria-label={video.alt}
        onPlay={() => setPlaying(true)}
        onPause={() => setPlaying(false)}
      />
      <div className="absolute inset-x-0 top-0 flex items-center justify-between bg-gradient-to-b from-black/60 to-transparent p-4">
        {showLabel && (
          <span className="flex items-center gap-2 text-xs font-semibold text-cream">
            <span className={`h-2 w-2 rounded-full ${playing ? 'animate-pulse bg-pin' : 'bg-cream/60'}`} /> {video.label}
          </span>
        )}
        <button type="button" onClick={toggle} aria-label={playing ? `Pause video: ${video.label}` : `Play video: ${video.label}`} className="ml-auto grid h-9 w-9 place-items-center rounded-full bg-cream/20 text-cream backdrop-blur hover:bg-cream/30">
          {playing ? <Pause size={15} /> : <Play size={15} />}
        </button>
      </div>
    </div>
  );
}
