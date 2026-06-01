/**
 * Traditional Chinese papercut SVG decorations.
 *
 * All cuts use a single bold silhouette with negative-space details,
 * styled after classic 剪纸 (jiǎn zhǐ) — bold contours, symmetrical motifs,
 * thick outer frame.
 *
 * Each component accepts:
 *   color: stroke/fill color (default 'currentColor' so parent's text color
 *          drives it — pass 'papercut' / 'ink' classes on parent)
 *   size:  px size of the square viewBox (default 96)
 *   className: extra classes
 *
 * Use cases:
 *   - Floating background decoration (combine with animate-floaty)
 *   - Section divider / corner ornament
 *   - Empty-state hero
 *   - Cursor-follow accent
 */

const Wrap = ({ size = 96, className = '', style, children, ariaLabel, ...rest }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 100 100"
    fill="currentColor"
    xmlns="http://www.w3.org/2000/svg"
    aria-label={ariaLabel}
    className={className}
    style={style}
    {...rest}
  >
    {children}
  </svg>
);

/* ── 蝴蝶 Butterfly ── */
export const Butterfly = (props) => (
  <Wrap ariaLabel="butterfly papercut" {...props}>
    <path d="M50 28
             C 38 12, 18 10, 12 24
             C 6 36, 18 46, 32 44
             C 22 50, 14 60, 18 72
             C 24 84, 40 78, 50 64
             C 60 78, 76 84, 82 72
             C 86 60, 78 50, 68 44
             C 82 46, 94 36, 88 24
             C 82 10, 62 12, 50 28 Z
             M50 28 L50 76" />
    <circle cx="50" cy="32" r="2" fill="white" />
    <circle cx="26" cy="30" r="2" fill="white" />
    <circle cx="74" cy="30" r="2" fill="white" />
    <circle cx="26" cy="58" r="3" fill="white" />
    <circle cx="74" cy="58" r="3" fill="white" />
    <circle cx="50" cy="48" r="1.5" fill="white" />
    <circle cx="50" cy="58" r="1.5" fill="white" />
  </Wrap>
);

/* ── 牡丹 Peony ── */
export const Peony = (props) => (
  <Wrap ariaLabel="peony papercut" {...props}>
    <circle cx="50" cy="50" r="38" />
    <circle cx="50" cy="50" r="10" fill="white" />
    {/* petal cutouts */}
    {[0, 60, 120, 180, 240, 300].map((deg) => (
      <ellipse
        key={deg}
        cx="50"
        cy="26"
        rx="6"
        ry="11"
        fill="white"
        transform={`rotate(${deg} 50 50)`}
      />
    ))}
    {/* small inner dots */}
    {[30, 90, 150, 210, 270, 330].map((deg) => (
      <circle
        key={deg}
        cx="50"
        cy="38"
        r="2"
        fill="white"
        transform={`rotate(${deg} 50 50)`}
      />
    ))}
    {/* center */}
    <circle cx="50" cy="50" r="3" fill="currentColor" />
  </Wrap>
);

/* ── 喜鹊 Magpie (登枝) ── */
export const Magpie = (props) => (
  <Wrap ariaLabel="magpie papercut" {...props}>
    {/* branch */}
    <path d="M5 78 Q 30 70, 55 74 T 95 70" stroke="currentColor" strokeWidth="2.5" fill="none" />
    {/* small leaves */}
    <ellipse cx="22" cy="72" rx="3" ry="1.5" transform="rotate(-30 22 72)" />
    <ellipse cx="70" cy="70" rx="3" ry="1.5" transform="rotate(20 70 70)" />
    {/* body */}
    <path d="M48 30
             C 35 30, 30 40, 32 50
             C 33 58, 40 64, 48 64
             L 60 70
             L 64 64
             C 72 62, 78 54, 76 44
             C 74 34, 64 28, 52 30
             Z" />
    {/* tail */}
    <path d="M64 60 L 86 56 L 82 64 L 88 66 L 80 72 Z" />
    {/* eye negative */}
    <circle cx="42" cy="42" r="2" fill="white" />
    {/* wing detail */}
    <path d="M48 46 Q 56 50, 60 58" stroke="white" strokeWidth="2" fill="none" />
  </Wrap>
);

/* ── 团花 Round medallion (window flower) ── */
export const Medallion = (props) => (
  <Wrap ariaLabel="round medallion papercut" {...props}>
    <circle cx="50" cy="50" r="44" />
    {/* outer ring cutouts */}
    {Array.from({ length: 12 }).map((_, i) => (
      <circle
        key={i}
        cx="50"
        cy="14"
        r="2.5"
        fill="white"
        transform={`rotate(${i * 30} 50 50)`}
      />
    ))}
    {/* mid ring */}
    <circle cx="50" cy="50" r="30" fill="white" />
    <circle cx="50" cy="50" r="22" />
    {/* petal cutouts */}
    {[0, 45, 90, 135, 180, 225, 270, 315].map((deg) => (
      <path
        key={deg}
        d="M50 30 Q 53 40, 50 50 Q 47 40, 50 30 Z"
        fill="white"
        transform={`rotate(${deg} 50 50)`}
      />
    ))}
    <circle cx="50" cy="50" r="4" fill="white" />
  </Wrap>
);

/* ── 窗花 Window grid flower (geometric) ── */
export const WindowFlower = (props) => (
  <Wrap ariaLabel="window grid flower papercut" {...props}>
    {/* square frame */}
    <rect x="6" y="6" width="88" height="88" />
    <rect x="14" y="14" width="72" height="72" fill="white" />
    {/* inner diamond */}
    <path d="M50 18 L82 50 L50 82 L18 50 Z" />
    {/* center flower */}
    <circle cx="50" cy="50" r="14" fill="white" />
    {[0, 72, 144, 216, 288].map((deg) => (
      <ellipse
        key={deg}
        cx="50"
        cy="40"
        rx="3.5"
        ry="7"
        transform={`rotate(${deg} 50 50)`}
      />
    ))}
    <circle cx="50" cy="50" r="2.5" fill="white" />
  </Wrap>
);

/* ── 鱼 Fish (年年有余) ── */
export const Fish = (props) => (
  <Wrap ariaLabel="fish papercut" {...props}>
    <path d="M14 50
             Q 30 28, 60 32
             Q 80 36, 86 46
             L 96 38
             L 96 62
             L 86 54
             Q 80 64, 60 68
             Q 30 72, 14 50 Z" />
    {/* eye */}
    <circle cx="68" cy="44" r="3.5" fill="white" />
    <circle cx="68" cy="44" r="1.5" />
    {/* scales */}
    {[0, 1, 2].map((i) => (
      <g key={i}>
        <path d={`M${36 + i * 12} 44 Q ${42 + i * 12} 50 ${36 + i * 12} 56`} stroke="white" strokeWidth="2" fill="none" />
      </g>
    ))}
    {/* fin */}
    <path d="M48 32 Q 54 22, 60 32 Z" />
    <path d="M48 68 Q 54 78, 60 68 Z" />
  </Wrap>
);

/* ── 福 Fortune character (stylized) ── */
export const Fu = (props) => (
  <Wrap ariaLabel="fu character papercut" {...props}>
    <rect x="6" y="6" width="88" height="88" />
    <rect x="14" y="14" width="72" height="72" fill="white" />
    {/* corner cuts */}
    {[
      [14, 14], [80, 14], [14, 80], [80, 80],
    ].map(([x, y], i) => (
      <path key={i} d={`M${x} ${y} l 6 0 l 0 6 l -6 0 z`} />
    ))}
    {/* simplified 福 strokes */}
    <text
      x="50"
      y="68"
      textAnchor="middle"
      fontSize="56"
      fontWeight="900"
      fontFamily="'Noto Sans SC', serif"
    >
      福
    </text>
  </Wrap>
);

/* ── 剪刀 Scissors (for upload FAB) ── */
export const Scissors = (props) => (
  <Wrap ariaLabel="scissors" {...props}>
    <circle cx="28" cy="28" r="14" fill="none" stroke="currentColor" strokeWidth="4" />
    <circle cx="28" cy="72" r="14" fill="none" stroke="currentColor" strokeWidth="4" />
    <path d="M40 38 L 92 64" stroke="currentColor" strokeWidth="4" strokeLinecap="round" />
    <path d="M40 62 L 92 36" stroke="currentColor" strokeWidth="4" strokeLinecap="round" />
    <circle cx="72" cy="50" r="3" />
  </Wrap>
);

/* Export collection for randomized picks */
export const allCuts = [Butterfly, Peony, Magpie, Medallion, WindowFlower, Fish];
