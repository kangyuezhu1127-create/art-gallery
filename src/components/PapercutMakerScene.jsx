/*
 * PapercutMakerScene — full-screen Contra-Labs-style "classical figure
 * at work" block, using real cut-out materials:
 *
 *   /maker/woman.png    — Dunhuang-style Tang/Song woman (bg removed)
 *   /maker/scissors.png — tasselled Chinese scissors (bg removed)
 *   /maker/phoenix.png  — red phoenix papercut (holes transparent)
 *
 * Motion (pure CSS, no JS per-frame work):
 *   - her eyelids BLINK (skin-toned lids over the eyes, Contra-style
 *     face micro-animation) + an occasional slow half-lid
 *   - scissors in her lowered hand snip gently
 *   - the phoenix papercut she raises sways as if just cut free
 *   - red paper scraps flutter down from the blades
 *   - whole figure breathes almost imperceptibly
 *
 * Stage overlays use % coordinates of a fixed-aspect stage (724:1288)
 * so they track the woman image at every viewport size.
 */

/*
 * Interaction design (one connected action, not three props):
 *   her lowered hand HOLDS the scissors → the blades bite the upper-left
 *   edge of the phoenix she is cutting → scraps fall exactly from that
 *   blade-paper contact point (~63%, 60% of stage).
 */
const CONTACT = { x: 63, y: 59 };  // blade ↔ paper contact, % of stage
const SCRAPS = [
  { left: CONTACT.x - 2, top: CONTACT.y + 1, delay: 0,   dur: 3.4 },
  { left: CONTACT.x + 3, top: CONTACT.y + 3, delay: 1.1, dur: 3.8 },
  { left: CONTACT.x - 4, top: CONTACT.y + 4, delay: 2.0, dur: 3.1 },
  { left: CONTACT.x + 6, top: CONTACT.y + 2, delay: 2.7, dur: 4.2 },
  { left: CONTACT.x,     top: CONTACT.y + 5, delay: 0.6, dur: 3.6 },
];

export default function PapercutMakerScene({ lang = 'en' }) {
  const isEn = lang === 'en';

  return (
    <section className="pmk-section">
      {/* rice-paper grain */}
      <div className="pmk-grain" aria-hidden="true" />

      {/* ── copy — oversized serif, overlapping the figure (Contra style) ── */}
      <div className="pmk-copy">
        <p className="font-editorial tracking-[0.28em] uppercase" style={{ fontSize: '0.68rem', color: '#a08c58', marginBottom: '1.1rem' }}>
          {isEn ? 'The Craft · 手 艺' : '手 艺 · The Craft'}
        </p>
        <h2
          className={isEn ? 'font-editorial' : 'font-cn'}
          style={{
            fontSize: 'clamp(2.5rem, 5.8vw, 5.2rem)',
            lineHeight: 1.02,
            fontWeight: isEn ? 700 : 900,
            color: '#2a2118',
            marginBottom: '1.4rem',
            fontVariationSettings: isEn ? "'opsz' 144, 'SOFT' 0, 'WONK' 0" : undefined,
          }}
        >
          {isEn ? <>Hands remember<br />what screens forget.</> : <>指尖记得,<br />屏幕忘了的事。</>}
        </h2>
        <p className={isEn ? 'font-sansDisplay' : 'font-cn'} style={{ maxWidth: 420, lineHeight: 1.65, color: 'rgba(42,33,24,0.68)', fontSize: 'clamp(0.95rem, 1.2vw, 1.15rem)' }}>
          {isEn
            ? 'A thousand years of paper and blade — now given digital depth, one cut at a time.'
            : '一纸一剪一千年。如今,每一刀都在数字空间里获得纵深。'}
        </p>
        <p className="font-editorial italic" style={{ marginTop: '2rem', fontSize: '0.72rem', letterSpacing: '0.14em', color: 'rgba(42,33,24,0.45)' }}>
          {isEn ? 'paper · blade · phoenix — the same hands' : '纸 · 刀 · 凤 —— 同一双手'}
        </p>
      </div>

      {/* ── stage: fixed-aspect box matching woman.png (724 × 1288) ── */}
      <div className="pmk-stage">
        {/* work-in-progress: the phoenix being cut, at her working hand */}
        <img src="/maker/phoenix.png" alt="" draggable={false} className="pmk-phoenix" />
        {/* raw uncut sheet corner still attached at the blade contact */}
        <span className="pmk-rawsheet" aria-hidden="true" />

        {/* the maker */}
        <div className="pmk-woman-wrap">
          <img src="/maker/woman.png" alt={isEn ? 'A Tang-dynasty woman cutting papercuts' : '唐风女子剪纸'} draggable={false} className="pmk-woman" />

          {/* blinking eyelids — % of stage, tracked to her eyes */}
          <div className="pmk-lid pmk-lid-l" aria-hidden="true" />
          <div className="pmk-lid pmk-lid-r" aria-hidden="true" />
          {/* slow pensive half-lids */}
          <div className="pmk-halflid pmk-lid-l" aria-hidden="true" />
          <div className="pmk-halflid pmk-lid-r" aria-hidden="true" />
        </div>

        {/* scissors — snipping in her lowered hand */}
        <img src="/maker/scissors.png" alt="" draggable={false} className="pmk-scissors" />

        {/* falling scraps */}
        {SCRAPS.map((s, i) => (
          <span
            key={i}
            className="pmk-scrap"
            style={{ left: `${s.left}%`, top: `${s.top}%`, animationDelay: `${s.delay}s`, animationDuration: `${s.dur}s` }}
            aria-hidden="true"
          />
        ))}
      </div>

      <style>{`
        .pmk-section {
          position: relative;
          min-height: 100vh;
          background: #f2ece0;
          overflow: hidden;
          display: flex;
          align-items: center;
        }
        .pmk-grain {
          position: absolute; inset: 0; pointer-events: none;
          background-image: radial-gradient(circle at 1px 1px, rgba(90,70,45,0.05) 1px, transparent 0);
          background-size: 5px 5px; opacity: 0.6;
        }
        .pmk-copy {
          position: relative; z-index: 5;
          padding: 6vh 0 6vh 6vw;
          width: min(46vw, 620px);
        }
        .pmk-stage {
          position: absolute;
          right: 2vw; bottom: 0;
          height: 102vh;
          aspect-ratio: 712 / 1288;
          z-index: 2;
        }
        .pmk-woman-wrap {
          position: absolute; inset: 0;
          transform-origin: 50% 100%;
          animation: pmkBreathe 6.5s ease-in-out infinite;
          z-index: 2;
        }
        .pmk-woman { width: 100%; height: 100%; object-fit: contain; display: block;
          filter: drop-shadow(0 24px 40px rgba(60,40,20,0.22)); user-select: none; }

        /* ── eyelids: skin-toned lids that close over her eyes ── */
        .pmk-lid, .pmk-halflid {
          position: absolute;
          background: linear-gradient(to bottom, #e9cfba, #f2dfcb 70%);
          border-bottom: 1.5px solid rgba(58,38,26,0.75);
          border-radius: 0 0 50% 50%;
          transform: scaleY(0);
          transform-origin: top center;
          z-index: 3;
        }
        .pmk-lid-l { left: 45.7%; top: 19.9%; width: 3.7%; height: 1.15%; }
        .pmk-lid-r { left: 51.8%; top: 20.6%; width: 2.85%; height: 0.95%; }
        .pmk-lid     { animation: pmkBlink 4.6s ease-in-out infinite; }
        .pmk-lid-r.pmk-lid { animation-delay: 0.04s; }
        .pmk-halflid { animation: pmkHalfLid 11s ease-in-out infinite; opacity: 0.9; }

        /* ── scissors HELD in her lowered hand: loops at her fingers
           (origin 50% 80% = loops), blades rotated down-right so their
           tips bite the phoenix's upper-left edge at the CONTACT point ── */
        .pmk-scissors {
          position: absolute;
          left: 54%; top: 43%;
          width: 22%;
          transform-origin: 50% 80%;   /* pivot = the finger loops */
          animation: pmkSnip 1.6s ease-in-out infinite;
          filter: drop-shadow(0 10px 16px rgba(60,40,20,0.28));
          z-index: 4; user-select: none;
        }

        /* ── the phoenix being cut — small work-in-progress at her hand,
           its upper-left edge under the blades ── */
        .pmk-phoenix {
          position: absolute;
          left: 58%; top: 56%;
          width: 33%;
          transform-origin: 18% 8%;    /* pivots where it is held/cut */
          animation: pmkPhoenix 5.5s ease-in-out infinite;
          filter: drop-shadow(0 14px 22px rgba(160,30,40,0.3));
          z-index: 3; user-select: none;
        }

        /* raw uncut sheet corner at the contact point, tucked under */
        .pmk-rawsheet {
          position: absolute;
          left: 57%; top: 55.5%;
          width: 9%; aspect-ratio: 1;
          background: #c32433;
          clip-path: polygon(8% 0, 100% 14%, 84% 92%, 0 70%);
          transform: rotate(14deg);
          z-index: 2;
        }

        /* ── falling red scraps ── */
        .pmk-scrap {
          position: absolute; width: 13px; height: 13px;
          background: #d72638;
          clip-path: polygon(50% 0, 100% 38%, 78% 100%, 8% 82%);
          opacity: 0;
          animation: pmkFall 3.4s linear infinite;
          z-index: 3;
        }

        @keyframes pmkBreathe { 0%,100% { transform: rotate(0deg) translateY(0); } 50% { transform: rotate(0.35deg) translateY(-3px); } }
        @keyframes pmkBlink {
          0%, 43%   { transform: scaleY(0); }
          45.5%     { transform: scaleY(1); }
          48%       { transform: scaleY(1); }
          51%       { transform: scaleY(0); }
          100%      { transform: scaleY(0); }
        }
        @keyframes pmkHalfLid {
          0%, 62%   { transform: scaleY(0); }
          68%, 78%  { transform: scaleY(0.45); }
          84%, 100% { transform: scaleY(0); }
        }
        @keyframes pmkSnip {
          0%, 100% { transform: rotate(150deg); }
          45%      { transform: rotate(143deg) translateY(1px); }
        }
        /* the work trembles slightly with each cut, pivoting at the held corner */
        @keyframes pmkPhoenix {
          0%, 100% { transform: rotate(-0.8deg); }
          45%      { transform: rotate(1.2deg) translateY(1px); }
          60%      { transform: rotate(0.4deg); }
        }
        @keyframes pmkFall {
          0%   { opacity: 0; transform: translateY(0) rotate(0deg); }
          8%   { opacity: 1; }
          82%  { opacity: 0.85; }
          100% { opacity: 0; transform: translateY(26vh) rotate(150deg); }
        }

        /* ── mobile: stack copy above a centred stage ── */
        @media (max-width: 900px) {
          .pmk-section { flex-direction: column; align-items: flex-start; min-height: unset; padding-bottom: 4vh; }
          .pmk-copy  { width: auto; padding: 10vh 8vw 2vh; }
          .pmk-stage { position: relative; right: auto; bottom: auto; height: 72vh; margin: 0 auto; }
        }
        @media (prefers-reduced-motion: reduce) {
          .pmk-woman-wrap, .pmk-lid, .pmk-halflid, .pmk-scissors, .pmk-phoenix, .pmk-scrap { animation: none; }
          .pmk-scrap { opacity: 0; }
        }
      `}</style>
    </section>
  );
}
