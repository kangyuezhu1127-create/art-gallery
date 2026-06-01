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
      const total = rect.height - window.innerHeight;
      const scrolled = -rect.top;
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

const ENV_W = 'min(62vw, 620px)';
const ENV_H = 'min(40vw, 400px)';

const COLOR = {
  shell:       '#EAE2D2',
  shellShade:  '#DBD0BC',
  flapBack:    '#C9BE9F',
  card:        '#ffffff',
  ink:         '#1a1a1a',
};

const NOTCH_PEAK = 72;   // % — V notch apex (deeper = more letter visible)
const FLAP_HEIGHT = 72;  // % — matches notch so closed flap covers V perfectly

export default function EnvelopeReveal({ lang = 'en' }) {
  const sectionRef = useRef(null);
  const progress   = useScrollProgress(sectionRef);

  // Timeline split: flap opens first, letter rises after.
  // Bounded against the section scroll, so reversing the scroll re-closes.
  const flapOpen   = Math.min(1, Math.max(0, progress / 0.55));
  const letterRise = Math.max(0, Math.min(1, (progress - 0.30) / 0.65));

  // Flap rotation: stops at -160° so it stays close to the envelope
  const flapAngle = -160 * flapOpen;

  // Letter Y: from 70% (hidden inside) to -22% (top sticks above the V)
  const letterY = 70 - letterRise * 92;

  const isEn = lang === 'en';

  return (
    <section
      ref={sectionRef}
      className="relative bg-paper"
      style={{ height: '160vh' }}
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

            {/* ── 2. Letter pocket (clips letter to envelope bounds) ── */}
            <div
              className="absolute inset-0 rounded-[6px] overflow-hidden"
              style={{ zIndex: 2 }}
            >
              <div
                style={{
                  position: 'absolute',
                  left: '6%',
                  right: '6%',
                  top: '6%',
                  bottom: '6%',
                  background: COLOR.card,
                  borderRadius: '3px',
                  boxShadow:
                    '0 8px 18px -4px rgba(0,0,0,0.14), 0 2px 4px rgba(0,0,0,0.06)',
                  transform: `translateY(${letterY}%)`,
                  transition: 'transform 0.05s linear',
                  padding: 'clamp(0.9rem, 2vw, 1.6rem)',
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'space-between',
                }}
              >
                <div>
                  <p
                    className="font-editorial text-[#9c6e72] mb-2"
                    style={{ fontSize: 'clamp(0.55rem, 0.85vw, 0.78rem)', letterSpacing: '0.18em' }}
                  >
                    {isEn ? 'Dear maker,' : '致每一位手艺人：'}
                  </p>

                  <p
                    className="font-editorial text-ink leading-[1.4]"
                    style={{
                      fontSize: 'clamp(0.72rem, 1.05vw, 0.98rem)',
                      fontWeight: 500,
                      letterSpacing: '-0.005em',
                    }}
                  >
                    {isEn ? (
                      <>
                        This gallery began as an invitation — to the keepers of
                        traditional Chinese paper craft, those who fold, who cut,
                        who hold a steady blade against thin paper.
                        <br /><br />
                        <span style={{ color: '#555' }}>
                          Here, every uploaded work is given a body — depth,
                          weight, and the room to be seen. May the old enter
                          the new, and the quiet hands behind the cuts be
                          unveiled.
                        </span>
                      </>
                    ) : (
                      <>
                        这是一封迟到的邀请信，写给所有
                        仍然把传统中国纸艺留在生活里的人。
                        <br /><br />
                        <span style={{ color: '#555' }}>
                          在这里，每一件被上传的作品都将获得一具身体——
                          深度、重量，以及被看见的空间。
                          愿古老进入新的语境，
                          让那些藏在剪痕背后的手，被一一揭开。
                        </span>
                      </>
                    )}
                  </p>
                </div>

                <div>
                  <p
                    className="font-editorial text-ink/65"
                    style={{ fontSize: 'clamp(0.52rem, 0.78vw, 0.7rem)', letterSpacing: '0.02em' }}
                  >
                    {isEn ? 'Sincerely,' : '此致，'}
                  </p>
                  <p
                    className="font-editorial text-ink mt-0.5"
                    style={{
                      fontSize: 'clamp(0.72rem, 1vw, 0.92rem)',
                      fontWeight: 700,
                      letterSpacing: '0.06em',
                    }}
                  >
                    Unveilthearts
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
                transition: 'transform 0.05s linear',
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
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
