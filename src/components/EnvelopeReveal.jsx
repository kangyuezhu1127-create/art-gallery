import { useEffect, useRef, useState } from 'react';

/**
 * EnvelopeReveal — scroll-driven letter envelope.
 *
 * Behaviour:
 *  - Section is ~250vh tall so the user scrolls through a long window.
 *  - Inside, an 100vh sticky stage centers the envelope.
 *  - As the section scrolls past the viewport we compute progress 0→1:
 *      progress  0   → 0.5: top flap rotates open (rotateX 0 → -180deg)
 *      progress 0.4 → 1   : letter card slides up out of the envelope
 *
 * The letter card carries the site's mission statement.
 * Bilingual: copy comes from props.
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

const ENV_W = 'min(82vw, 920px)';
const ENV_H = 'min(54vw, 600px)';

const COLOR = {
  shell:        '#EAE2D2',  // envelope body / closed flap
  shellShadow:  '#D4C9B5',  // inner shadow tone
  flapBack:     '#D7CDB9',  // back of flap (darker, seen when open)
  card:         '#ffffff',
  ink:          '#1a1a1a',
};

export default function EnvelopeReveal({ lang = 'en' }) {
  const sectionRef = useRef(null);
  const progress   = useScrollProgress(sectionRef);

  // Split timeline
  const flapOpen   = Math.min(1, progress / 0.55);          // 0 → 1 while progress 0 → 0.55
  const letterRise = Math.max(0, (progress - 0.35) / 0.55); // 0 → 1 while progress 0.35 → 0.9

  const flapAngle  = -180 * flapOpen;                       // 0 (closed) → -180 (fully open backward)
  const letterY    = (1 - letterRise) * 55;                 // % offset down inside envelope

  const isEn = lang === 'en';

  return (
    <section
      ref={sectionRef}
      className="relative bg-paper"
      style={{ height: '260vh' }}
    >
      {/* Sticky stage centers the envelope */}
      <div className="sticky top-0 h-screen flex flex-col items-center justify-center px-4 overflow-hidden">
        {/* Section eyebrow */}
        <p
          className="absolute top-[14vh] left-1/2 -translate-x-1/2 font-editorial text-[#404040] tracking-[0.32em] uppercase text-xs sm:text-sm"
          style={{
            opacity: Math.max(0, 1 - progress * 1.8),
            transition: 'opacity 0.2s',
          }}
        >
          {isEn ? 'A letter to the makers' : '致 · 创作者的一封信'}
        </p>

        {/* Hint to scroll, fades out */}
        <p
          className="absolute bottom-[8vh] left-1/2 -translate-x-1/2 text-[0.65rem] tracking-[0.32em] uppercase text-ink/40"
          style={{ opacity: Math.max(0, 1 - progress * 4) }}
        >
          {isEn ? '↓ Scroll to open' : '↓ 向下滑动 · 拆开信封'}
        </p>

        {/* Envelope stage with perspective */}
        <div style={{ perspective: '2200px' }}>
          <div
            className="relative"
            style={{
              width: ENV_W,
              height: ENV_H,
              transformStyle: 'preserve-3d',
            }}
          >
            {/* ── 1. Envelope back body (deepest layer) ── */}
            <div
              className="absolute inset-0 rounded-[6px]"
              style={{
                background: COLOR.shell,
                boxShadow: '0 30px 60px -16px rgba(0,0,0,0.18), 0 8px 16px -6px rgba(0,0,0,0.10)',
              }}
            />

            {/* ── 2. Letter card (rises out as flap opens) ── */}
            <div
              className="absolute"
              style={{
                left: '5%',
                right: '5%',
                top: '6%',
                bottom: '6%',
                background: COLOR.card,
                borderRadius: '4px',
                boxShadow:
                  '0 14px 30px -8px rgba(0,0,0,0.18), 0 2px 6px rgba(0,0,0,0.08)',
                transform: `translateY(${letterY}%)`,
                transition: 'transform 0.05s linear',
                padding: 'clamp(1.5rem, 4vw, 3.2rem)',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between',
                zIndex: 2,
              }}
            >
              <div>
                <p
                  className="font-editorial text-[#9c6e72] mb-4"
                  style={{ fontSize: 'clamp(0.7rem, 1.1vw, 0.95rem)', letterSpacing: '0.18em' }}
                >
                  {isEn ? 'Dear maker,' : '致每一位手艺人：'}
                </p>

                <p
                  className="font-editorial text-ink leading-[1.45]"
                  style={{
                    fontSize: 'clamp(1.15rem, 1.9vw, 1.85rem)',
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
                        Here, every uploaded work is given a body — depth, weight,
                        and the room to be seen. May the old enter the new, and
                        may the quiet hands behind the cuts be unveiled.
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
                        让那些藏在剪痕背后的手，
                        被一一揭开。
                      </span>
                    </>
                  )}
                </p>
              </div>

              <div>
                <p
                  className="font-editorial text-ink/65"
                  style={{ fontSize: 'clamp(0.7rem, 1vw, 0.88rem)', letterSpacing: '0.02em' }}
                >
                  {isEn ? 'Sincerely,' : '此致，'}
                </p>
                <p
                  className="font-editorial text-ink mt-1"
                  style={{
                    fontSize: 'clamp(0.95rem, 1.4vw, 1.3rem)',
                    fontWeight: 700,
                    letterSpacing: '0.08em',
                  }}
                >
                  Unveilthearts
                </p>
              </div>
            </div>

            {/* ── 3. Left side flap (static decoration) ── */}
            <div
              className="absolute inset-y-0 left-0 w-1/2"
              style={{
                background: COLOR.shellShadow,
                clipPath: 'polygon(0 0, 100% 50%, 0 100%)',
                zIndex: 3,
              }}
            />
            {/* ── 4. Right side flap ── */}
            <div
              className="absolute inset-y-0 right-0 w-1/2"
              style={{
                background: COLOR.shellShadow,
                clipPath: 'polygon(100% 0, 0 50%, 100% 100%)',
                zIndex: 3,
              }}
            />
            {/* ── 5. Bottom flap ── */}
            <div
              className="absolute inset-x-0 bottom-0 h-1/2"
              style={{
                background: COLOR.shell,
                clipPath: 'polygon(0 100%, 50% 0, 100% 100%)',
                zIndex: 4,
                boxShadow: 'inset 0 -2px 8px rgba(0,0,0,0.06)',
              }}
            />

            {/* ── 6. Top flap — the one that opens ── */}
            <div
              className="absolute inset-x-0 top-0 h-1/2"
              style={{
                transformOrigin: 'top center',
                transform: `rotateX(${flapAngle}deg)`,
                transition: 'transform 0.05s linear',
                transformStyle: 'preserve-3d',
                zIndex: 5,
              }}
            >
              {/* Front side (visible when closed, hidden when open) */}
              <div
                className="absolute inset-0"
                style={{
                  background: COLOR.shell,
                  clipPath: 'polygon(0 0, 50% 100%, 100% 0)',
                  backfaceVisibility: 'hidden',
                  boxShadow: '0 2px 4px rgba(0,0,0,0.05)',
                }}
              />
              {/* Back side (visible when open) */}
              <div
                className="absolute inset-0"
                style={{
                  background: COLOR.flapBack,
                  clipPath: 'polygon(0 0, 50% 100%, 100% 0)',
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
