import { useEffect, useRef, useState } from 'react';

/**
 * EnvelopeReveal — scroll-driven letter envelope (bidirectional).
 *
 * Behaviour:
 *  - Section is 160vh tall with a sticky 100vh inner stage.
 *  - useScrollProgress hook computes a 0→1 progress from the section's
 *    position relative to the viewport.
 *  - As user scrolls DOWN through the section, progress increases →
 *    flap opens, letter rises.
 *  - As user scrolls UP, progress decreases → flap closes, letter sinks.
 *  - Naturally bidirectional: scrubbing back and forth reveals/re-hides.
 *
 * Visual structure (back-to-front):
 *   1. Envelope back body (rounded rect)
 *   2. Letter card (clipped to envelope bounds via overflow:hidden)
 *   3. Front face — rounded rect with V notch at top
 *   4. Top flap — triangle hinged at envelope top
 *        front face : down-triangle (matches V notch when closed)
 *        back face  : UP-triangle (clipPath inverted) so when the flap
 *                     tips open we see an up-pointing triangle.
 */

function useScrollProgress(ref) {
  const [p, setP] = useState(0);
  useEffect(() => {
    if (!ref.current) return;
    let raf = 0;
    const update = () => {
      raf = 0;
      const el = ref.current;
      if (!el) return;
      const rect = el.getBoundingClientRect();
      const vh = window.innerHeight;
      // Begin the animation EARLY — while the envelope is still sliding
      // into view (section top ~halfway down the viewport), not only once
      // it becomes sticky. `start` is how far above the sticky point we
      // begin scrubbing.
      const start = vh * 0.5;
      const total = start + (rect.height - vh);
      const scrolled = start - rect.top;
      const v = total > 0 ? scrolled / total : 0;
      setP(Math.max(0, Math.min(1, v)));
    };
    const onScroll = () => {
      if (!raf) raf = requestAnimationFrame(update);
    };
    update();
    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', update);
    return () => {
      window.removeEventListener('scroll', onScroll);
      window.removeEventListener('resize', update);
      if (raf) cancelAnimationFrame(raf);
    };
  }, [ref]);
  return p;
}

// Envelope sizing
// - Desktop (wide viewports): caps at 620px × 400px (vw values hit caps)
// - Mobile (narrow viewports): roughly fills available width with a taller
//   aspect, giving the letter card enough room for the body text to wrap
//   in just a couple of lines instead of overflowing under the front face.
const ENV_W = 'min(88vw, 620px)';
const ENV_H = 'min(60vw, 400px)';

const COLOR = {
  shell:       '#EAE2D2',
  shellShade:  '#DBD0BC',
  flapBack:    '#C9BE9F',
  card:        '#ffffff',
  ink:         '#1a1a1a',
};

const NOTCH_PEAK = 80;   // % — V notch apex (deeper = more letter visible)
const FLAP_HEIGHT = 80;  // % — matches notch so closed flap covers V perfectly

export default function EnvelopeReveal({ lang = 'en' }) {
  const sectionRef = useRef(null);
  const progress   = useScrollProgress(sectionRef);

  // Timeline split: flap opens first (slowly, with resistance), letter follows.
  // easeOutCubic decelerates near full open so the "big open" is slower.
  const easeOut = (t) => 1 - Math.pow(1 - t, 3);
  // envelope slides in SEALED (heart clasp visible) for the first ~14%,
  // then the flap opens slowly (eased), then the letter rises.
  const flapRaw    = Math.min(1, Math.max(0, (progress - 0.14) / 0.5));   // opens 14% → 64%
  const flapOpen   = easeOut(flapRaw);
  const letterRise = Math.max(0, Math.min(1, (progress - 0.40) / 0.52));  // letter rises 40% → 92%

  // Flap rotation: stops at -160° so it stays close to the envelope
  const flapAngle = -160 * flapOpen;

  // Letter Y range: starts only slightly lowered so the paper is already
  // visible tucked inside the envelope from the very start (no "empty
  // envelope" moment), then rises fully out as letterRise → 1.
  const letterY = 18 - letterRise * 165;

  const isEn = lang === 'en';

  return (
    <section
      ref={sectionRef}
      className="relative bg-paper"
      style={{ height: '190vh' }}
    >
      <div className="sticky top-0 h-screen flex flex-col items-center justify-center px-4 overflow-hidden">
        {/* Eyebrow */}
        <p
          className="absolute top-[14vh] left-1/2 -translate-x-1/2 font-editorial text-[#404040] tracking-[0.32em] uppercase text-xs sm:text-sm text-center"
        >
          {isEn ? 'A letter to the makers' : '致 · 创作者的一封信'}
        </p>

        {/* Stage */}
        <div style={{ perspective: '1800px' }}>
          <div
            className="relative"
            style={{
              width: ENV_W,
              height: ENV_H,
              transformStyle: 'preserve-3d',
            }}
          >
            {/* ── 1. Back body (deepest) ── */}
            <div
              className="absolute inset-0 rounded-[6px]"
              style={{
                background: COLOR.shell,
                boxShadow:
                  '0 30px 60px -16px rgba(0,0,0,0.18), 0 8px 16px -6px rgba(0,0,0,0.10)',
              }}
            />

            {/*
              ── 2. Letter pocket ──
              clip-path lets the letter extend ABOVE the envelope freely
              (so as it rises out, the part sticking above the envelope
              is visible against the page background), while still
              clipping any part that would otherwise droop BELOW the
              envelope's bottom edge.
            */}
            <div
              className="absolute inset-0 rounded-[6px]"
              style={{
                zIndex: 2,
                clipPath: 'inset(-9999px 0 0 0)',
              }}
            >
              <div
                style={{
                  position: 'absolute',
                  left: '12%',
                  right: '12%',
                  top: '2%',
                  bottom: '14%',
                  background: COLOR.card,
                  borderRadius: '3px',
                  boxShadow:
                    '0 8px 18px -4px rgba(0,0,0,0.14), 0 2px 4px rgba(0,0,0,0.06)',
                  transform: `translateY(${letterY}%)`,
                  transition: 'transform 0.35s cubic-bezier(0.22, 1, 0.36, 1)',
                  padding: 'clamp(0.8rem, 1.6vw, 1.3rem)',
                  paddingBottom: 'clamp(0.6rem, 1.2vw, 1rem)',
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'flex-start',
                }}
              >
                <p
                  className="font-editorial text-[#9c6e72] mb-2"
                  style={{ fontSize: 'clamp(0.55rem, 0.85vw, 0.78rem)', letterSpacing: '0.18em' }}
                >
                  {isEn ? 'Dear maker,' : '致每一位手艺人：'}
                </p>

                <p
                  className="font-editorial text-ink leading-[1.45]"
                  style={{
                    fontSize: 'clamp(0.7rem, 1vw, 0.92rem)',
                    fontWeight: 500,
                    letterSpacing: '-0.005em',
                  }}
                >
                  {isEn ? (
                    <>
                      An invitation — to those who fold, who cut, who hold a steady blade against thin paper.
                      <br /><br />
                      <span style={{ color: '#555' }}>
                        Here, every work is given depth, weight, and the room to be seen.
                      </span>
                    </>
                  ) : (
                    <>
                      这是写给所有把传统中国纸艺留在生活里的人。
                      <br /><br />
                      <span style={{ color: '#555' }}>
                        在这里，每一件作品都将获得深度、重量，
                        以及被看见的空间。
                      </span>
                    </>
                  )}
                </p>

                {/* Signature — gap pushes it slightly down on the card */}
                <div className="text-left mt-5">
                  <p
                    className="font-editorial text-ink/65"
                    style={{ fontSize: 'clamp(0.52rem, 0.78vw, 0.7rem)', letterSpacing: '0.02em' }}
                  >
                    {isEn ? 'Sincerely,' : '此致，'}
                  </p>
                  <p
                    className="font-editorial text-ink mt-0.5"
                    style={{
                      fontSize: 'clamp(0.78rem, 1.05vw, 1rem)',
                      fontWeight: 700,
                      letterSpacing: '0.08em',
                    }}
                  >
                    Judyii
                  </p>
                </div>
              </div>
            </div>

            {/* ── 3. Front face with V notch on top ── */}
            <div
              className="absolute inset-0 rounded-[6px]"
              style={{
                background: COLOR.shellShade,
                clipPath: `polygon(0 0, 50% ${NOTCH_PEAK}%, 100% 0, 100% 100%, 0 100%)`,
                zIndex: 3,
                boxShadow: 'inset 0 -10px 28px -10px rgba(0,0,0,0.12)',
              }}
            />

            {/* Inner shadow accent along the V edge */}
            <div
              className="absolute inset-0 rounded-[6px] pointer-events-none"
              style={{
                background:
                  'linear-gradient(to bottom, rgba(0,0,0,0.06), rgba(0,0,0,0) 35%)',
                clipPath: `polygon(0 0, 50% ${NOTCH_PEAK}%, 100% 0, 100% 100%, 0 100%)`,
                zIndex: 4,
              }}
            />

            {/* ── 4. Top flap — pivots open ── */}
            <div
              className="absolute inset-x-0 top-0"
              style={{
                height: `${FLAP_HEIGHT}%`,
                transformOrigin: 'top center',
                transform: `rotateX(${flapAngle}deg)`,
                transition: 'transform 0.35s cubic-bezier(0.22, 1, 0.36, 1)',
                transformStyle: 'preserve-3d',
                zIndex: 5,
              }}
            >
              {/* FRONT face — DOWN triangle (point at bottom = V apex) */}
              <div
                className="absolute inset-0"
                style={{
                  background: COLOR.shell,
                  clipPath: 'polygon(0 0, 50% 100%, 100% 0)',
                  backfaceVisibility: 'hidden',
                  boxShadow: '0 1px 3px rgba(0,0,0,0.06)',
                  borderTopLeftRadius: '6px',
                  borderTopRightRadius: '6px',
                }}
              />
              {/* BACK face — UP triangle (clipPath inverted) so when the flap
                  tips open we see a triangle pointing UP, like an envelope
                  flap folded behind. */}
              <div
                className="absolute inset-0"
                style={{
                  background: COLOR.flapBack,
                  clipPath: 'polygon(0 100%, 50% 0, 100% 100%)',
                  transform: 'rotateX(180deg)',
                  backfaceVisibility: 'hidden',
                }}
              />

              {/* Pink heart wax-seal clasped at the flap point (closure) */}
              <div
                className="absolute left-1/2"
                style={{
                  bottom: 0,
                  transform: 'translate(-50%, 45%)',
                  width: 'clamp(26px, 5vw, 38px)',
                  filter: 'drop-shadow(0 3px 5px rgba(150,60,80,0.35))',
                  zIndex: 2,
                }}
              >
                <svg viewBox="0 0 32 30" width="100%" height="100%" aria-hidden="true">
                  <path
                    d="M16 28C16 28 2 19.5 2 10.2 2 5.4 5.7 2 9.9 2c2.7 0 5 1.5 6.1 3.7C17.1 3.5 19.4 2 22.1 2 26.3 2 30 5.4 30 10.2 30 19.5 16 28 16 28Z"
                    fill="#e58aa0"
                    stroke="#d06e88"
                    strokeWidth="1.4"
                    strokeLinejoin="round"
                  />
                  <path d="M11 9.5c1.4-1.6 3.4-1.4 4.6.2" fill="none" stroke="rgba(255,255,255,0.6)" strokeWidth="1.4" strokeLinecap="round" />
                </svg>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
