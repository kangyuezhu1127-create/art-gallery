import { useState, useRef, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';

/* ─── SVG path libraries for each symbol type ─── */
const SYMBOL_PATHS = {
  peony: [
    'M50,18 C62,18 74,28 70,42 C66,56 55,64 50,67 C45,64 34,56 30,42 C26,28 38,18 50,18 Z',
    'M50,28 C58,26 67,33 64,44 C61,55 54,60 50,62 C46,60 39,55 36,44 C33,33 42,26 50,28 Z',
    'M50,40 C53,38 57,41 56,46 C55,51 52,53 50,54 C48,53 45,51 44,46 C43,41 47,38 50,40 Z',
  ],
  vine: [
    'M10,88 C18,72 28,62 44,54 C60,46 72,38 82,22 C86,15 88,10 86,6',
    'M44,54 C40,44 34,36 30,26 C28,20 33,16 38,22 C41,26 42,32 44,38',
    'M72,38 C78,34 84,28 84,20 C84,14 78,12 74,18',
  ],
  opera: [
    'M35,22 Q50,12 65,22 Q74,36 72,55 Q70,70 62,76 Q50,82 38,76 Q30,70 28,55 Q26,36 35,22 Z',
    'M38,40 Q45,33 53,37',
    'M62,40 Q55,33 47,37',
    'M43,62 Q50,68 57,62',
    'M50,45 L50,55',
  ],
  dragon: [
    'M8,72 C16,52 28,50 40,44 C52,38 58,42 68,32 C76,22 84,20 92,14',
    'M40,44 L36,54 L44,52 M36,54 L34,62',
    'M32,36 L28,24 M38,34 L36,22',
    'M68,32 L72,22 C73,17 78,16 78,22',
  ],
  phoenix: [
    'M50,78 C46,62 42,52 46,40 C50,30 54,24 50,16',
    'M46,40 C36,36 24,40 16,32 C12,27 14,20 20,22',
    'M54,40 C64,36 76,40 84,32 C88,27 86,20 80,22',
    'M50,78 C44,84 38,88 32,94 M50,78 C50,86 50,92 50,98 M50,78 C56,84 62,88 68,94',
  ],
  bamboo: [
    'M40,92 L40,8', 'M60,92 L60,8',
    'M40,74 Q50,70 60,74', 'M40,56 Q50,60 60,56',
    'M40,38 Q50,34 60,38', 'M40,20 Q50,24 60,20',
    'M60,38 C68,32 78,28 82,20',
    'M40,56 C32,50 22,46 18,38',
  ],
  lotus: [
    'M50,88 L50,52',
    'M50,52 C42,44 38,34 42,26 C46,18 50,20 50,26',
    'M50,52 C58,44 62,34 58,26 C54,18 50,20 50,26',
    'M50,52 C38,48 28,44 26,34 C24,26 30,24 36,30',
    'M50,52 C62,48 72,44 74,34 C76,26 70,24 64,30',
    'M44,32 Q50,26 56,32 Q56,40 50,44 Q44,40 44,32 Z',
  ],
  crane: [
    'M50,68 C48,56 46,46 50,36',
    'M50,36 C52,28 54,20 50,14 C48,10 44,10 42,14',
    'M50,46 C40,42 28,44 18,36 C12,32 12,26 18,28',
    'M50,46 C60,42 72,44 82,36 C88,32 88,26 82,28',
    'M46,68 L44,86 L40,92 M46,68 L42,74 M54,68 L56,86 L60,92 M54,68 L58,74',
    'M50,14 L48,10 L44,12 L46,16',
  ],
  cloud: [
    'M14,56 C16,43 26,38 34,43 C36,33 46,28 54,34 C58,25 68,22 75,28 C80,22 88,22 90,30 C96,32 98,44 92,48 C90,56 82,58 76,54 C72,60 62,62 56,57 C52,62 42,64 36,59 C30,64 18,62 14,56 Z',
  ],
  fish: [
    'M22,50 C28,32 44,24 60,28 C74,32 84,40 84,50 C84,60 74,68 60,72 C44,76 28,68 22,50 Z',
    'M22,50 L10,40 L6,50 L10,60 Z',
    'M66,42 C68,42 68,44 66,44 C64,44 64,42 66,42 Z',
    'M45,30 C48,26 54,26 57,30 C54,34 48,34 45,30 Z',
  ],
  plum: [
    'M50,22 Q54,12 58,22 Q68,22 62,30 Q66,40 56,38 Q50,44 44,38 Q34,40 38,30 Q32,22 42,22 Q46,12 50,22 Z',
    'M50,30 C52,28 54,30 54,32 C54,36 52,38 50,38 C48,38 46,36 46,32 C46,30 48,28 50,30 Z',
  ],
  fan: [
    'M50,82 L18,28 Q50,8 82,28 Z',
    'M50,82 L22,32', 'M50,82 L30,18', 'M50,82 L40,12',
    'M50,82 L60,12', 'M50,82 L70,18', 'M50,82 L78,32',
  ],
  lantern: [
    'M38,18 L62,18 L64,28 L36,28 Z',
    'M36,28 C28,34 26,48 28,60 C30,70 36,76 40,78 L60,78 C64,76 70,70 72,60 C74,48 72,34 64,28 Z',
    'M40,78 L60,78 L58,86 L42,86 Z',
    'M50,86 L50,98 M46,92 L44,98 M54,92 L56,98',
    'M33,46 L67,46', 'M31,56 L69,56', 'M33,66 L67,66',
  ],
  koi: [
    'M18,50 C24,30 40,22 56,26 C70,30 80,40 80,50 C80,60 70,70 56,74 C40,78 24,70 18,50 Z',
    'M18,50 L6,40 L4,50 L6,60 Z',
    'M62,28 C64,22 70,20 72,26 C70,30 64,30 62,28 Z',
    'M44,26 C47,22 53,22 56,26 C53,30 47,30 44,26 Z',
    'M68,44 C70,42 72,44 70,46 C68,46 66,44 68,44 Z',
  ],
  default: [
    'M50,16 C62,16 74,26 74,40 C74,58 62,70 50,76 C38,70 26,58 26,40 C26,26 38,16 50,16 Z',
    'M50,26 C60,26 68,33 68,44 C68,58 60,67 50,72 C40,67 32,58 32,44 C32,33 40,26 50,26 Z',
  ],
};

/* ─── Animated SVG symbol ─── */
function SymbolSVG({ type, color, active }) {
  const paths = SYMBOL_PATHS[type] ?? SYMBOL_PATHS.default;
  const refs  = useRef([]);

  useEffect(() => {
    if (!active) return;
    refs.current.forEach((el) => {
      if (!el) return;
      const len = el.getTotalLength?.() ?? 300;
      el.style.strokeDasharray  = len;
      el.style.strokeDashoffset = len;
      // force reflow then trigger animation
      void el.getBoundingClientRect();
      el.style.transition = 'none';
    });
    // small tick to let browser paint the initial state
    requestAnimationFrame(() => {
      refs.current.forEach((el, i) => {
        if (!el) return;
        el.style.transition = `stroke-dashoffset ${0.9 + i * 0.35}s cubic-bezier(0.4,0,0.2,1) ${i * 0.28}s`;
        el.style.strokeDashoffset = '0';
      });
    });
  }, [active, type]);

  return (
    <svg
      viewBox="0 0 100 100"
      style={{ width: '100%', height: '100%', overflow: 'visible' }}
    >
      {paths.map((d, i) => (
        <path
          key={i}
          ref={(el) => { refs.current[i] = el; }}
          d={d}
          fill="none"
          stroke={color}
          strokeWidth={type === 'cloud' ? 1.8 : 2.2}
          strokeLinecap="round"
          strokeLinejoin="round"
          style={{ strokeDasharray: 300, strokeDashoffset: 300 }}
        />
      ))}
    </svg>
  );
}

/* ─── Individual symbol card ─── */
function SymbolCard({ symbol, index, visible }) {
  const [drawn, setDrawn] = useState(false);

  useEffect(() => {
    if (!visible) return;
    const t = setTimeout(() => setDrawn(true), index * 320);
    return () => clearTimeout(t);
  }, [visible, index]);

  return (
    <div
      style={{
        display: 'flex', gap: '1.1rem', alignItems: 'flex-start',
        padding: '1.25rem 1.4rem',
        borderBottom: '1px solid rgba(255,255,255,0.06)',
        opacity: drawn ? 1 : 0,
        transform: drawn ? 'translateY(0)' : 'translateY(14px)',
        transition: 'opacity 0.55s ease, transform 0.55s ease',
      }}
    >
      {/* SVG symbol */}
      <div style={{
        width: 88, height: 88, flexShrink: 0,
        background: 'rgba(255,255,255,0.03)',
        borderRadius: 10,
        border: `1px solid ${symbol.color}28`,
        padding: 8,
        boxShadow: `0 0 18px ${symbol.color}18`,
      }}>
        <SymbolSVG type={symbol.type} color={symbol.color || '#c8a455'} active={drawn} />
      </div>

      {/* Text */}
      <div style={{ flex: 1, minWidth: 0 }}>
        {/* index badge */}
        <span style={{
          fontSize: '0.6rem', letterSpacing: '0.16em', color: '#666',
          fontVariantNumeric: 'tabular-nums',
        }}>
          {String(index + 1).padStart(2, '0')}
        </span>

        <div style={{ display: 'flex', alignItems: 'baseline', gap: '0.55rem', marginTop: '0.15rem', marginBottom: '0.35rem' }}>
          <span style={{
            fontSize: '1.35rem', fontWeight: 300, color: symbol.color || '#c8a455',
            letterSpacing: '0.05em', lineHeight: 1,
            textShadow: `0 0 20px ${symbol.color}55`,
          }}>
            {symbol.name_zh}
          </span>
          <span style={{ fontSize: '0.72rem', color: '#666', letterSpacing: '0.1em' }}>
            {symbol.name_en}
          </span>
        </div>

        <p style={{
          fontSize: '0.76rem', color: '#9a9a9a', lineHeight: 1.7,
          margin: 0, letterSpacing: '0.02em',
        }}>
          {symbol.meaning_zh}
        </p>
      </div>
    </div>
  );
}

/* ─── Loading state ─── */
function LoadingState() {
  return (
    <div style={{ padding: '3rem 1.5rem', textAlign: 'center' }}>
      <div style={{
        width: 52, height: 52, margin: '0 auto 1.2rem',
        borderRadius: '50%',
        border: '1.5px solid #c8a455',
        boxShadow: '0 0 24px #c8a45530',
        animation: 'inkPulse 1.8s ease-in-out infinite',
      }} />
      <p style={{ fontSize: '0.72rem', color: '#666', letterSpacing: '0.18em' }}>
        解析传统文化符号...
      </p>
    </div>
  );
}

/* ─── Setup required state ─── */
function SetupRequired() {
  return (
    <div style={{ padding: '2rem 1.5rem', textAlign: 'center' }}>
      <p style={{ fontSize: '0.85rem', color: '#888', marginBottom: '1rem', lineHeight: 1.6 }}>
        需要配置 Anthropic API Key<br />才能启用 AI 文化符号解析
      </p>
      <div style={{
        background: 'rgba(200,164,85,0.08)',
        border: '1px solid rgba(200,164,85,0.2)',
        borderRadius: 10,
        padding: '1rem',
        textAlign: 'left',
        fontSize: '0.7rem',
        color: '#888',
        fontFamily: 'monospace',
        lineHeight: 2,
      }}>
        <div style={{ color: '#c8a455', marginBottom: '0.3rem', fontFamily: 'sans-serif', fontSize: '0.65rem', letterSpacing: '0.12em' }}>设置步骤</div>
        1. 前往 console.anthropic.com 获取 Key<br />
        2. supabase secrets set ANTHROPIC_API_KEY=sk-ant-...<br />
        3. supabase functions deploy analyze-symbols
      </div>
    </div>
  );
}

/* ─── Main panel ─── */
export default function SymbolPanel({ artwork }) {
  const [open,    setOpen]    = useState(false);
  const [loading, setLoading] = useState(false);
  const [symbols, setSymbols] = useState(null);
  const [error,   setError]   = useState('');
  const [needSetup, setNeedSetup] = useState(false);
  const lastAnalyzed = useRef(null);

  const analyze = useCallback(async () => {
    if (lastAnalyzed.current === artwork.id && (symbols || needSetup)) return;
    lastAnalyzed.current = artwork.id;
    setLoading(true);
    setError('');
    setSymbols(null);
    setNeedSetup(false);

    try {
      const { data, error: fnErr } = await supabase.functions.invoke('analyze-symbols', {
        body: { imageURL: artwork.originalURL },
      });

      if (fnErr) throw fnErr;
      if (data?.error === 'ANTHROPIC_API_KEY not configured') {
        setNeedSetup(true);
      } else if (data?.error) {
        throw new Error(data.error);
      } else {
        setSymbols(data?.symbols ?? []);
      }
    } catch (err) {
      const msg = err?.message || String(err);
      if (msg.includes('not configured') || msg.includes('503')) {
        setNeedSetup(true);
      } else {
        setError(msg);
      }
    } finally {
      setLoading(false);
    }
  }, [artwork.id, artwork.originalURL, symbols, needSetup]);

  const handleOpen = () => {
    setOpen(true);
    analyze();
  };

  return (
    <>
      {/* ── Trigger button ── */}
      <button
        onClick={open ? () => setOpen(false) : handleOpen}
        style={{
          position: 'absolute',
          bottom: '5.5rem',
          left: '50%',
          transform: 'translateX(-50%)',
          background: open
            ? 'rgba(200,164,85,0.18)'
            : 'rgba(200,164,85,0.10)',
          border: '1px solid rgba(200,164,85,0.35)',
          borderRadius: 99,
          color: '#c8a455',
          fontSize: '0.65rem',
          letterSpacing: '0.18em',
          padding: '0.42rem 1.1rem',
          cursor: 'pointer',
          backdropFilter: 'blur(8px)',
          transition: 'all 0.25s',
          display: 'flex',
          alignItems: 'center',
          gap: '0.45rem',
          zIndex: 20,
          boxShadow: open ? '0 0 20px rgba(200,164,85,0.25)' : 'none',
        }}
      >
        <span style={{ fontSize: '0.8rem' }}>{open ? '✕' : '☯'}</span>
        {open ? 'CLOSE' : '文化符号解析'}
      </button>

      {/* ── Panel ── */}
      <div style={{
        position: 'absolute',
        right: 0, top: 0, bottom: 0,
        width: 340,
        background: 'rgba(8,8,8,0.92)',
        backdropFilter: 'blur(20px)',
        borderLeft: '1px solid rgba(255,255,255,0.06)',
        transform: open ? 'translateX(0)' : 'translateX(100%)',
        transition: 'transform 0.42s cubic-bezier(0.22, 1, 0.36, 1)',
        zIndex: 30,
        display: 'flex',
        flexDirection: 'column',
        overflowY: 'auto',
      }}>
        {/* Panel header */}
        <div style={{
          padding: '1.2rem 1.4rem 1rem',
          borderBottom: '1px solid rgba(255,255,255,0.06)',
          flexShrink: 0,
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', marginBottom: '0.2rem' }}>
            <span style={{ color: '#c8a455', fontSize: '0.75rem' }}>☯</span>
            <h3 style={{ fontSize: '0.72rem', letterSpacing: '0.2em', color: '#ddd', margin: 0, fontWeight: 400 }}>
              传统文化符号
            </h3>
          </div>
          <p style={{ fontSize: '0.62rem', color: '#555', margin: 0, letterSpacing: '0.06em' }}>
            {artwork.title}
          </p>
        </div>

        {/* Content */}
        <div style={{ flex: 1 }}>
          {loading && <LoadingState />}

          {needSetup && <SetupRequired />}

          {error && !needSetup && (
            <div style={{ padding: '2rem 1.5rem', textAlign: 'center' }}>
              <p style={{ fontSize: '0.78rem', color: '#844', marginBottom: '1rem' }}>{error}</p>
              <button
                onClick={() => { lastAnalyzed.current = null; analyze(); }}
                style={{
                  background: 'none', border: '1px solid #555', borderRadius: 6,
                  color: '#888', fontSize: '0.68rem', padding: '0.4rem 0.9rem', cursor: 'pointer',
                }}
              >
                重试
              </button>
            </div>
          )}

          {symbols?.length === 0 && !loading && (
            <div style={{ padding: '2.5rem', textAlign: 'center', color: '#555', fontSize: '0.78rem' }}>
              未识别出传统文化符号
            </div>
          )}

          {symbols?.map((sym, i) => (
            <SymbolCard key={i} symbol={sym} index={i} visible={open} />
          ))}
        </div>

        {/* Footer */}
        {symbols?.length > 0 && (
          <div style={{
            padding: '0.9rem 1.4rem',
            borderTop: '1px solid rgba(255,255,255,0.05)',
            fontSize: '0.6rem', color: '#444', letterSpacing: '0.1em',
            flexShrink: 0,
          }}>
            AI 解析 · 仅供参考
          </div>
        )}
      </div>
    </>
  );
}
