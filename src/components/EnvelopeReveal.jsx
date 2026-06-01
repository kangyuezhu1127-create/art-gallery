import { useEffect, useRef, useState } from 'react';

/**
 * EnvelopeReveal — scroll-driven letter envelope.
 *
 * Structure (drawn back-to-front, z-index ascending):
 *   1. Envelope back body (solid rounded rect) — the "shell" you see
 *      behind everything.
 *   2. Inside-clip wrapper (overflow:hidden, same bounds as body) —
 *      letter card lives in here so it can NEVER appear below or beside
 *      the envelope.
 *   3. Front face — a rectangle with a V-notch cut at the top. The
 *      letter peeks through the notch as it rises.
 *   4. Top flap — a triangle whose hinge is the envelope's top edge.
 *      Rotates from 0 (closed, masking the V notch) to ~-155° (open,
 *      tipping backwards but staying near the envelope so the whole
 *      shape still reads as ONE object).
 *
 * Timeline driven by section scroll progress (0 → 1):
 *   flap opens   over progress 0   → 0.55
 *   letter rises over progress 0.40 → 0.95
 *
 * Initial state: flap closed and flat, letter fully inside the
 * pocket (no visible paper anywhere).
 */

function useScrollProgress(ref) {
  const [p, setP] = useState(0);
  useEffect(() => {
    if (!ref.current) return;
    const update = () => {
      const rect = ref.current.getBoundingClientRect();
      const total = rect.height - window.innerHeight;
      const scrolled = -rect.top;
      const v = total > 0 ? scrolled / total : 0;
      setP(Math.max(0, Math.min(1, v)));
    };
    update();
    window.addEventListener('scroll', update, { passive: true });
    window.addEventListener('resize', update);
    return () => {
      window.removeEventListener('scroll', update);
      window.removeEventListener('resize', update);
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

// V notch geometry — front face cuts down from top at 50% across,
// peak at 58% of envelope height (so the opening is a shallow V).
const NOTCH_PEAK = 58; // %
const FLAP_HEIGHT = 60; // % — top flap covers the V notch when closed

export default function EnvelopeReveal({ lang = 'en' }) {
  const sectionRef = useRef(null);
  const progress   = useScrollProgress(sectionRef);

  const flapOpen   = Math.min(1, progress / 0.55);
  const letterRise = Math.max(0, Math.min(1, (progress - 0.40) / 0.55));

  // Cap rotation at -155° so flap stays visually attached
  const flapAngle  = -155 * flapOpen;

  // letterRise 0 → letter fully tucked inside (bottom at envelope bottom,
  //              top below the notch peak so nothing peeks).
  // letterRise 1 → letter top emerges above the notch.
  const letterY = (1 - letterRise) * 70;  // % of card height shifted down

  const isEn = lang === 'en';

  return (
    <section
      ref={sectionRef}
      className="relative bg-paper"
      style={{ height: '240vh' }}
    >
      <div className="sticky top-0 h-screen flex flex-col items-center justify-center px-4 overflow-hidden">
        <p
          className="absolute top-[14vh] left-1/2 -translate-x-1/2 font-editorial text-[#404040] tracking-[0.32em] uppercase text-xs sm:text-sm"
          style={{
            opacity: Math.max(0, 1 - progress * 1.8),
            transition: 'opacity 0.2s',
          }}
        >
          {isEn ? 'A letter to the makers' : '致 · 创作者的一封信'}
        </p>

        <p
          className="absolute bottom-[8vh] left-1/2 -translate-x-1/2 text-[0.65rem] tracking-[0.32em] uppercase text-ink/40"
          style={{ opacity: Math.max(0, 1 - progress * 4) }}
        >
          {isEn ? '↓ Scroll to open' : '↓ 向下滑动 · 拆开信封'}
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
            {/* ── 1. Back body of envelope (deepest) ── */}
            <div
              className="absolute inset-0 rounded-[6px]"
              style={{
                background: COLOR.shell,
                boxShadow:
                  '0 30px 60px -16px rgba(0,0,0,0.18), 0 8px 16px -6px rgba(0,0,0,0.10)',
              }}
            />

            {/* ── 2. Inside pocket (overflow-hidden clips letter to envelope) ── */}
            <div
              className="absolute inset-0 rounded-[6px] overflow-hidden"
              style={{ zIndex: 2 }}
            >
              {/* Letter card */}
              <div
                style={{
                  position: 'absolute',
                  left: '6%',
                  right: '6%',
                  top: '8%',
                  bottom: '8%',
                  background: COLOR.card,
                  borderRadius: '3px',
                  boxShadow:
                    '0 8px 18px -4px rgba(0,0,0,0.14), 0 2px 4px rgba(0,0,0,0.06)',
                  transform: `translateY(${letterY}%)`,
                  transition: 'transform 0.05s linear',
                  padding: 'clamp(1rem, 2.2vw, 1.8rem)',
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'space-between',
                }}
              >
                <div>
                  <p
                    className="font-editorial text-[#9c6e72] mb-3"
                    style={{ fontSize: 'clamp(0.55rem, 0.85vw, 0.78rem)', letterSpacing: '0.18em' }}
                  >
                    {isEn ? 'Dear maker,' : '致每一位手艺人：'}
                  </p>

                  <p
                    className="font-editorial text-ink leading-[1.45]"
                    style={{
                      fontSize: 'clamp(0.78rem, 1.15vw, 1.05rem)',
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
                    style={{ fontSize: 'clamp(0.55rem, 0.8vw, 0.72rem)', letterSpacing: '0.02em' }}
                  >
                    {isEn ? 'Sincerely,' : '此致，'}
                  </p>
                  <p
                    className="font-editorial text-ink mt-0.5"
                    style={{
                      fontSize: 'clamp(0.75rem, 1.05vw, 0.95rem)',
                      fontWeight: 700,
                      letterSpacing: '0.06em',
                    }}
                  >
                    Unveilthearts
                  </p>
                </div>
              </div>
            </div>

            {/* ── 3. Front face of envelope (covers most of body, V notch on top) ── */}
            <div
              className="absolute inset-0 rounded-[6px]"
              style={{
                background: COLOR.shellShade,
                clipPath: `polygon(0 0, 50% ${NOTCH_PEAK}%, 100% 0, 100% 100%, 0 100%)`,
                zIndex: 3,
                boxShadow: 'inset 0 -10px 28px -10px rgba(0,0,0,0.12)',
              }}
            />

            {/* Subtle horizontal seam line just below the V — the bottom of the pocket flap */}
            <div
              className="absolute inset-x-0 rounded-[6px]"
              style={{
                top: `${NOTCH_PEAK}%`,
                height: '1px',
                background: 'rgba(0,0,0,0.06)',
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
              {/* Front face of flap — visible when closed */}
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
              {/* Back of flap — visible when open */}
              <div
                className="absolute inset-0"
                style={{
                  background: COLOR.flapBack,
                  clipPath: 'polygon(0 0, 50% 100%, 100% 0)',
                  transform: 'rotateX(180deg)',
                  backfaceVisibility: 'hidden',
                  borderTopLeftRadius: '6px',
                  borderTopRightRadius: '6px',
                }}
              />
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
