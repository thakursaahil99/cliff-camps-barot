import { useEffect, useRef } from 'react';
import { useReducedMotion } from 'framer-motion';

/** Light canvas snowfall - a nod to the snow peaks above Barot. Pauses when off-screen or tab hidden. */
export default function Snowfall({ density = 0.00012, className = '' }) {
  const ref = useRef(null);
  const reduce = useReducedMotion();

  useEffect(() => {
    if (reduce) return;
    const canvas = ref.current;
    const ctx = canvas.getContext('2d');
    let w, h, flakes, raf, visible = true;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);

    const resize = () => {
      w = canvas.offsetWidth;
      h = canvas.offsetHeight;
      canvas.width = w * dpr;
      canvas.height = h * dpr;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      const count = Math.min(140, Math.round(w * h * density));
      flakes = Array.from({ length: count }, () => ({
        x: Math.random() * w,
        y: Math.random() * h,
        r: Math.random() * 2.2 + 0.6,
        s: Math.random() * 0.6 + 0.25,
        d: Math.random() * Math.PI * 2,
        o: Math.random() * 0.5 + 0.35
      }));
    };

    const tick = () => {
      ctx.clearRect(0, 0, w, h);
      for (const f of flakes) {
        f.y += f.s;
        f.d += 0.01;
        f.x += Math.sin(f.d) * 0.35;
        if (f.y > h + 4) { f.y = -4; f.x = Math.random() * w; }
        ctx.beginPath();
        ctx.arc(f.x, f.y, f.r, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(245,241,227,${f.o})`;
        ctx.fill();
      }
      raf = visible && !document.hidden ? requestAnimationFrame(tick) : null;
    };

    const io = new IntersectionObserver(([e]) => {
      visible = e.isIntersecting;
      if (visible && !raf) raf = requestAnimationFrame(tick);
    });
    const onVis = () => { if (!document.hidden && visible && !raf) raf = requestAnimationFrame(tick); };

    resize();
    io.observe(canvas);
    window.addEventListener('resize', resize);
    document.addEventListener('visibilitychange', onVis);
    raf = requestAnimationFrame(tick);
    return () => {
      cancelAnimationFrame(raf);
      io.disconnect();
      window.removeEventListener('resize', resize);
      document.removeEventListener('visibilitychange', onVis);
    };
  }, [density, reduce]);

  return <canvas ref={ref} aria-hidden className={`pointer-events-none absolute inset-0 h-full w-full ${className}`} />;
}
