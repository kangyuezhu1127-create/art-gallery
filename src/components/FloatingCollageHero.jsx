import { useEffect, useRef } from 'react';
import Button from './ui/Button';

/*
 * FloatingCollageHero — Contra-Labs-style floating collage, reimagined in
 * a Chinese (rice-paper / ink / vermilion-seal) aesthetic.
 *
 * Fragments are cut from three source materials placed in /public/collage/:
 *   - fan.png        (Cantonese export fan painting)
 *   - ink-tree.png   (blue ink blossom tree)
 *   - pink-city.png  (pink watercolour city)
 *
 * Each fragment drifts idly and reacts to the cursor with depth-based
 * parallax. mix-blend-multiply melts each artwork's pale paper background
 * into the page so they read as torn collage pieces, not boxed photos.
 *
 * To swap art: drop new files in /public/collage and update FRAGMENTS.
 */

const IMG = {
  fan:  '/collage/fan.png',
  tree: '/collage/ink-tree.png',
  city: '/collage/pink-city.png',
};

// x,y in %; size in vw; rot in deg; depth = parallax strength (0..1)
// pink-city is the full-bleed backdrop; fan + tree float on top of it.
const FRAGMENTS = [
  { img: IMG.fan,  x: 55, y: 52, size: 32, rot: -3, depth: 1.0, z: 5 },
  { img: IMG.tree, x: 80, y: 42, size: 15, rot: 8,  depth: 0.6, z: 3 },
  { img: IMG.fan,  x: 32, y: 12, size: 16, rot: 6,  depth: 0.45, z: 2 },
];

export default function FloatingCollageHero({ lang = 'en', copy }) {
  const layerRefs = useRef([]);
  const bgRef  = useRef(null);
  const target = useRef({ x: 0, y: 0 });
  const cur    = useRef({ x: 0, y: 0 });

  useEffect(() => {
    const onMove = (e) => {
      // -1 .. 1 relative to viewport centre
      target.current = {
        x: (e.clientX / window.innerWidth - 0.5) * 2,
        y: (e.clientY / window.innerHeight - 0.5) * 2,
      };
    };
    window.addEventListener('mousemove', onMove);

    let raf;
    const tick = () => {
      cur.current.x += (target.current.x - cur.current.x) * 0.06;
      cur.current.y += (target.current.y - cur.current.y) * 0.06;
      layerRefs.current.forEach((el, i) => {
        if (!el) return;
        const d = FRAGMENTS[i].depth;
        const tx = -cur.current.x * d * 28;
        const ty = -cur.current.y * d * 22;
        el.style.transform = `translate3d(${tx}px, ${ty}px, 0)`;
      });
      // backdrop drifts slowly in the opposite-ish direction for depth
      if (bgRef.current) {
        bgRef.current.style.transform =
          `scale(1.06) translate3d(${cur.current.x * 14}px, ${cur.current.y * 10}px, 0)`;
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => { window.removeEventListener('mousemove', onMove); cancelAnimationFrame(raf); };
  }, []);

  return (
    <section
      className="relative overflow-hidden -mt-20"
      style={{ height: '110vh', background: '#f2ece0' }}
    >
      {/* ── Pink-city backdrop (底图) — full-bleed, slow parallax ── */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <img
          ref={bgRef}
          src={IMG.city}
          alt=""
          draggable={false}
          onError={(e) => { e.currentTarget.style.visibility = 'hidden'; }}
          className="will-change-transform"
          style={{
            position: 'absolute', inset: 0,
            width: '100%', height: '100%',
            objectFit: 'cover', objectPosition: 'center top',
            mixBlendMode: 'multiply',
          }}
        />
      </div>

      {/* paper wash over the backdrop so the headline stays legible */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background:
            'linear-gradient(105deg, rgba(242,236,224,0.9) 0%, rgba(242,236,224,0.72) 34%, rgba(242,236,224,0.42) 60%, rgba(242,236,224,0.28) 100%)',
        }}
      />

      {/* rice-paper grain */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          backgroundImage:
            'radial-gradient(circle at 1px 1px, rgba(90,70,45,0.05) 1px, transparent 0)',
          backgroundSize: '5px 5px',
          opacity: 0.5,
        }}
      />

      {/* ── Floating collage fragments ── */}
      {FRAGMENTS.map((f, i) => (
        <div
          key={i}
          ref={(el) => (layerRefs.current[i] = el)}
          className="absolute will-change-transform"
          style={{
            left: `${f.x}%`,
            top: `${f.y}%`,
            width: `${f.size}vw`,
            zIndex: f.z,
          }}
        >
          <div
            className="collage-float"
            style={{ animationDelay: `${i * 0.7}s`, transform: `rotate(${f.rot}deg)` }}
          >
            <img
              src={f.img}
              alt=""
              draggable={false}
              onError={(e) => { e.currentTarget.style.visibility = 'hidden'; }}
              style={{
                width: '100%',
                height: 'auto',
                display: 'block',
                mixBlendMode: 'multiply',
                filter: 'drop-shadow(0 18px 30px rgba(60,40,20,0.18))',
                userSelect: 'none',
              }}
            />
          </div>
        </div>
      ))}

      {/* ── Headline overlay ── */}
      <div className="relative z-20 h-full flex flex-col justify-center px-[6vw] pointer-events-none">
        <div className="max-w-[1100px] pointer-events-auto">
          {/* vermilion seal + eyebrow */}
          <div className="flex items-center gap-3 mb-5">
            <span
              className="inline-flex items-center justify-center text-white font-cn"
              style={{
                width: 34, height: 34, borderRadius: 6, background: '#c1352e',
                fontSize: 13, fontWeight: 700, letterSpacing: '0.05em',
                boxShadow: '0 2px 8px rgba(193,53,46,0.35)',
              }}
            >
              揭
            </span>
            <p
              className={`${lang === 'zh' ? 'font-cn' : 'font-editorial'} tracking-[0.2em]`}
              style={{ fontSize: 'clamp(0.85rem, 1.3vw, 1.05rem)', color: '#6b5636', fontWeight: 600 }}
            >
              {copy.eyebrow}
            </p>
          </div>

          <h1
            className={`${lang === 'zh' ? 'font-cn' : 'font-editorial'} leading-[0.92] mb-6`}
            style={{
              fontSize: 'clamp(3.4rem, 9.5vw, 9.5rem)',
              fontWeight: lang === 'en' ? 700 : 900,
              color: '#2a2118',
              fontVariationSettings: lang === 'en' ? "'opsz' 144, 'SOFT' 0, 'WONK' 0" : undefined,
              letterSpacing: '-0.015em',
              textShadow: '0 2px 20px rgba(242,236,224,0.9)',
            }}
          >
            {copy.title}
          </h1>

          <p
            className={`${lang === 'zh' ? 'font-cn' : 'font-sansDisplay'} max-w-xl mb-10 leading-relaxed`}
            style={{ fontSize: 'clamp(1rem, 1.4vw, 1.25rem)', color: 'rgba(42,33,24,0.7)' }}
          >
            {copy.sub}
          </p>

          <div className="flex flex-wrap items-center gap-6">
            <Button to="/enter" variant="outline" size="lg">
              {copy.cta}
            </Button>
            <span className="text-[0.7rem] tracking-[0.18em] uppercase" style={{ color: 'rgba(42,33,24,0.5)' }}>
              {copy.caption}
            </span>
          </div>
        </div>
      </div>

      {/* fade into page bottom */}
      <div
        className="absolute inset-x-0 bottom-0 pointer-events-none"
        style={{ height: '22vh', background: 'linear-gradient(to bottom, rgba(242,236,224,0), #ffffff 92%)' }}
      />

      <style>{`
        @keyframes collageFloat {
          0%, 100% { transform: translateY(0); }
          50%      { transform: translateY(-14px); }
        }
        .collage-float { animation: collageFloat 7s ease-in-out infinite; }
        @media (prefers-reduced-motion: reduce) { .collage-float { animation: none; } }
      `}</style>
    </section>
  );
}
