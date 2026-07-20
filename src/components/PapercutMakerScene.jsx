/*
 * PapercutMakerScene — Contra-Labs-style "classical figure at work" hero
 * block, re-imagined as a Tang/Song dynasty woman cutting traditional
 * Chinese papercuts.
 *
 * The tension Contra Labs stages (oil-painting humans × pixelated
 * screens) is restaged here as: ink-wash classical maker × a papercut
 * that assembles PIXEL BY PIXEL on the wall beside her.
 *
 * All motion is pure SVG + CSS keyframes — no JS per-frame work:
 *   - scissors blades snip
 *   - her cutting arm rocks gently with each snip
 *   - red paper scraps flutter down
 *   - the finished window-flower builds up as pixel cells (digital echo)
 */

// 11×11 pixel plum-blossom / window-flower pattern (filled cells)
const PIXEL_CELLS = [
  [5, 0], [4, 1], [5, 1], [6, 1],
  [2, 2], [5, 2], [8, 2],
  [1, 3], [2, 3], [3, 3], [5, 3], [7, 3], [8, 3], [9, 3],
  [2, 4], [4, 4], [5, 4], [6, 4], [8, 4],
  [0, 5], [1, 5], [3, 5], [4, 5], [6, 5], [7, 5], [9, 5], [10, 5],
  [2, 6], [4, 6], [5, 6], [6, 6], [8, 6],
  [1, 7], [2, 7], [3, 7], [5, 7], [7, 7], [8, 7], [9, 7],
  [2, 8], [5, 8], [8, 8],
  [4, 9], [5, 9], [6, 9],
  [5, 10],
];

export default function PapercutMakerScene({ lang = 'en' }) {
  const isEn = lang === 'en';

  return (
    <section className="relative bg-paper overflow-hidden" style={{ padding: 'clamp(3rem, 8vw, 6.5rem) 6vw' }}>
      <div className="max-w-[1200px] mx-auto grid items-center gap-10 md:gap-16" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))' }}>

        {/* ── Copy (Contra-style oversized serif) ── */}
        <div>
          <p className="font-editorial tracking-[0.28em] uppercase text-[0.68rem] mb-5" style={{ color: '#a08c58' }}>
            {isEn ? 'The Craft · 手 艺' : '手 艺 · The Craft'}
          </p>
          <h2
            className={`${isEn ? 'font-editorial' : 'font-cn'} leading-[1.02] mb-6`}
            style={{
              fontSize: 'clamp(2.4rem, 5.5vw, 4.6rem)',
              fontWeight: isEn ? 700 : 900,
              color: '#2a2118',
              fontVariationSettings: isEn ? "'opsz' 144, 'SOFT' 0, 'WONK' 0" : undefined,
            }}
          >
            {isEn ? <>Hands remember<br />what screens forget.</> : <>指尖记得,<br />屏幕忘了的事。</>}
          </h2>
          <p className={`${isEn ? 'font-sansDisplay' : 'font-cn'} max-w-md leading-relaxed`} style={{ color: 'rgba(42,33,24,0.68)', fontSize: 'clamp(0.95rem, 1.25vw, 1.15rem)' }}>
            {isEn
              ? 'A thousand years of paper and blade — now given digital depth, one cut at a time.'
              : '一纸一剪一千年。如今,每一刀都在数字空间里获得纵深。'}
          </p>
        </div>

        {/* ── Animated scene ── */}
        <div className="pm-scene mx-auto w-full" style={{ maxWidth: 560 }}>
          <svg viewBox="0 0 900 640" width="100%" role="img" aria-label={isEn ? 'A Song-dynasty woman cutting a Chinese papercut' : '宋代女子剪纸动画'}>
            <defs>
              <linearGradient id="pmRobe" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0" stopColor="#efe6d3" />
                <stop offset="1" stopColor="#d9c9a8" />
              </linearGradient>
              <linearGradient id="pmSleeve" x1="0" y1="0" x2="1" y2="1">
                <stop offset="0" stopColor="#e6d9bd" />
                <stop offset="1" stopColor="#cbb888" />
              </linearGradient>
            </defs>

            {/* ground / low table */}
            <ellipse cx="330" cy="565" rx="270" ry="26" fill="#2a2118" opacity="0.06" />
            <rect x="480" y="430" width="300" height="16" rx="8" fill="#b89a6a" />
            <rect x="500" y="446" width="18" height="110" rx="6" fill="#a8895c" />
            <rect x="742" y="446" width="18" height="110" rx="6" fill="#a8895c" />

            {/* ── the maker (Song-dynasty woman, side profile, sway) ── */}
            <g className="pm-body">
              {/* seated robe */}
              <path d="M 300 250 C 250 268 214 330 206 420 C 200 486 228 540 330 552 C 428 560 470 528 462 462 C 456 402 420 300 372 262 C 348 244 322 242 300 250 Z" fill="url(#pmRobe)" stroke="#2a2118" strokeWidth="3" strokeOpacity="0.55" />
              {/* collar cross (交领) */}
              <path d="M 306 262 L 352 318 M 352 262 L 312 316" stroke="#b3452e" strokeWidth="5" strokeLinecap="round" opacity="0.85" fill="none" />
              {/* head */}
              <circle cx="330" cy="196" r="44" fill="#f6e7d6" stroke="#2a2118" strokeWidth="3" strokeOpacity="0.55" />
              {/* hair — swept bun */}
              <path d="M 286 186 C 284 148 310 128 336 130 C 366 132 382 156 376 184 C 396 178 404 158 398 142 C 420 154 420 186 402 198 C 396 202 384 204 374 202 C 360 210 340 212 322 206 C 304 200 290 196 286 186 Z" fill="#241c14" />
              <circle cx="398" cy="150" r="10" fill="#241c14" />
              {/* hairpin */}
              <line x1="376" y1="140" x2="416" y2="120" stroke="#c9a84c" strokeWidth="5" strokeLinecap="round" />
              <circle cx="418" cy="118" r="6" fill="#d72638" />
              {/* face profile hints */}
              <path d="M 366 188 q 8 6 2 14" stroke="#2a2118" strokeWidth="2.5" fill="none" strokeLinecap="round" opacity="0.7" />
              <path d="M 344 184 q 8 -4 14 0" stroke="#2a2118" strokeWidth="2.5" fill="none" strokeLinecap="round" opacity="0.65" />
              <circle cx="352" cy="196" r="2.4" fill="#2a2118" opacity="0.75" />
              <path d="M 352 212 q 6 3 11 0" stroke="#b3452e" strokeWidth="2.6" fill="none" strokeLinecap="round" />

              {/* left arm — holds the red paper up */}
              <path d="M 372 300 C 420 286 458 276 492 280" stroke="url(#pmSleeve)" strokeWidth="34" strokeLinecap="round" fill="none" />
              <circle cx="500" cy="282" r="12" fill="#f6e7d6" stroke="#2a2118" strokeWidth="2.4" strokeOpacity="0.5" />
            </g>

            {/* ── red paper sheet being cut ── */}
            <g className="pm-paper">
              <path d="M 492 232 L 604 210 L 626 330 L 512 356 Z" fill="#d72638" stroke="#a81c2b" strokeWidth="2.5" />
              {/* cut-in notch lines */}
              <path d="M 512 300 q 20 -10 34 2 M 528 262 q 16 -8 30 2" stroke="#f6e7d6" strokeWidth="3" fill="none" strokeLinecap="round" opacity="0.85" />
            </g>

            {/* ── cutting arm + scissors (rocks with each snip) ── */}
            <g className="pm-arm">
              <path d="M 360 330 C 400 344 440 348 470 338" stroke="url(#pmSleeve)" strokeWidth="34" strokeLinecap="round" fill="none" />
              <circle cx="476" cy="336" r="12" fill="#f6e7d6" stroke="#2a2118" strokeWidth="2.4" strokeOpacity="0.5" />
              {/* scissors — pivot at (498,330) */}
              <g className="pm-scissor-top">
                <path d="M 498 330 L 560 300" stroke="#57534e" strokeWidth="7" strokeLinecap="round" />
                <path d="M 556 302 L 566 297" stroke="#8a8683" strokeWidth="7" strokeLinecap="round" />
              </g>
              <g className="pm-scissor-bot">
                <path d="M 498 330 L 562 344" stroke="#57534e" strokeWidth="7" strokeLinecap="round" />
                <path d="M 558 343 L 568 346" stroke="#8a8683" strokeWidth="7" strokeLinecap="round" />
              </g>
              <circle cx="498" cy="330" r="6" fill="#c9a84c" />
              <circle cx="482" cy="322" r="9" fill="none" stroke="#57534e" strokeWidth="5" />
              <circle cx="484" cy="342" r="9" fill="none" stroke="#57534e" strokeWidth="5" />
            </g>

            {/* ── falling scraps ── */}
            {[0, 1, 2, 3].map((i) => (
              <path
                key={i}
                className={`pm-scrap pm-scrap-${i}`}
                d="M 0 0 L 16 4 L 10 16 L -2 12 Z"
                fill="#d72638"
                opacity="0"
                transform={`translate(${540 + i * 22}, ${360 + (i % 2) * 12})`}
              />
            ))}

            {/* ── pixel papercut assembling on the wall (digital echo) ── */}
            <g transform="translate(600, 60)">
              <rect x="-18" y="-18" width="256" height="256" rx="6" fill="#fffdf6" stroke="#c9b89a" strokeWidth="3" />
              {PIXEL_CELLS.map(([cx, cy], i) => (
                <rect
                  key={i}
                  className="pm-pixel"
                  x={cx * 20}
                  y={cy * 20}
                  width="19"
                  height="19"
                  fill="#d72638"
                  style={{ animationDelay: `${(i * 0.09) % 4}s` }}
                />
              ))}
            </g>
          </svg>

          {/* caption */}
          <p className="text-center font-editorial italic mt-3" style={{ fontSize: '0.72rem', letterSpacing: '0.14em', color: 'rgba(42,33,24,0.45)' }}>
            {isEn ? 'paper · blade · pixel — the same pattern' : '纸 · 刀 · 像素 —— 同一个纹样'}
          </p>
        </div>
      </div>

      <style>{`
        .pm-body   { transform-origin: 330px 420px; animation: pmSway 5.5s ease-in-out infinite; }
        .pm-paper  { transform-origin: 500px 282px; animation: pmPaper 2.4s ease-in-out infinite; }
        .pm-arm    { transform-origin: 380px 334px; animation: pmArm 1.2s ease-in-out infinite; }
        .pm-scissor-top { transform-origin: 498px 330px; animation: pmSnipT 1.2s ease-in-out infinite; }
        .pm-scissor-bot { transform-origin: 498px 330px; animation: pmSnipB 1.2s ease-in-out infinite; }
        .pm-pixel  { opacity: 0; animation: pmPixel 4s steps(1) infinite; }
        .pm-scrap-0 { animation: pmFall 3.2s linear infinite; }
        .pm-scrap-1 { animation: pmFall 3.2s linear 0.9s infinite; }
        .pm-scrap-2 { animation: pmFall 3.2s linear 1.7s infinite; }
        .pm-scrap-3 { animation: pmFall 3.2s linear 2.4s infinite; }

        @keyframes pmSway  { 0%,100% { transform: rotate(0deg); } 50% { transform: rotate(0.8deg); } }
        @keyframes pmPaper { 0%,100% { transform: rotate(0deg) translateY(0); } 50% { transform: rotate(-1.4deg) translateY(2px); } }
        @keyframes pmArm   { 0%,100% { transform: rotate(0deg); } 45% { transform: rotate(-2.6deg); } }
        @keyframes pmSnipT { 0%,100% { transform: rotate(0deg); } 45% { transform: rotate(9deg); } }
        @keyframes pmSnipB { 0%,100% { transform: rotate(0deg); } 45% { transform: rotate(-9deg); } }
        @keyframes pmPixel { 0% { opacity: 0; } 12% { opacity: 1; } 88% { opacity: 1; } 96% { opacity: 0; } 100% { opacity: 0; } }
        @keyframes pmFall {
          0%   { opacity: 0; transform: translate(var(--tx, 540px), 360px) rotate(0deg); }
          8%   { opacity: 1; }
          85%  { opacity: 0.9; }
          100% { opacity: 0; transform: translate(calc(var(--tx, 540px) - 30px), 540px) rotate(140deg); }
        }
        .pm-scrap-0 { --tx: 540px; }
        .pm-scrap-1 { --tx: 562px; }
        .pm-scrap-2 { --tx: 584px; }
        .pm-scrap-3 { --tx: 606px; }
        @media (prefers-reduced-motion: reduce) {
          .pm-body, .pm-paper, .pm-arm, .pm-scissor-top, .pm-scissor-bot, .pm-scrap, .pm-pixel { animation: none; }
          .pm-pixel, .pm-scrap { opacity: 1; }
        }
      `}</style>
    </section>
  );
}
