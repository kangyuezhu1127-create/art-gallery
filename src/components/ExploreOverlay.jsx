import { useState, useEffect, useRef, useCallback } from 'react';
import { supabase } from '../lib/supabase';

/* ─── Inline SVG paths (same library as SymbolPanel) ─── */
const SYMBOL_PATHS = {
  peony:   ['M50,18 C62,18 74,28 70,42 C66,56 55,64 50,67 C45,64 34,56 30,42 C26,28 38,18 50,18 Z','M50,28 C58,26 67,33 64,44 C61,55 54,60 50,62 C46,60 39,55 36,44 C33,33 42,26 50,28 Z','M50,40 C53,38 57,41 56,46 C55,51 52,53 50,54 C48,53 45,51 44,46 C43,41 47,38 50,40 Z'],
  vine:    ['M10,88 C18,72 28,62 44,54 C60,46 72,38 82,22 C86,15 88,10 86,6','M44,54 C40,44 34,36 30,26 C28,20 33,16 38,22 C41,26 42,32 44,38','M72,38 C78,34 84,28 84,20 C84,14 78,12 74,18'],
  opera:   ['M35,22 Q50,12 65,22 Q74,36 72,55 Q70,70 62,76 Q50,82 38,76 Q30,70 28,55 Q26,36 35,22 Z','M38,40 Q45,33 53,37','M62,40 Q55,33 47,37','M43,62 Q50,68 57,62','M50,45 L50,55'],
  dragon:  ['M8,72 C16,52 28,50 40,44 C52,38 58,42 68,32 C76,22 84,20 92,14','M40,44 L36,54 L44,52 M36,54 L34,62','M32,36 L28,24 M38,34 L36,22','M68,32 L72,22 C73,17 78,16 78,22'],
  phoenix: ['M50,78 C46,62 42,52 46,40 C50,30 54,24 50,16','M46,40 C36,36 24,40 16,32 C12,27 14,20 20,22','M54,40 C64,36 76,40 84,32 C88,27 86,20 80,22','M50,78 C44,84 38,88 32,94 M50,78 C50,86 50,92 50,98 M50,78 C56,84 62,88 68,94'],
  bamboo:  ['M40,92 L40,8','M60,92 L60,8','M40,74 Q50,70 60,74','M40,56 Q50,60 60,56','M40,38 Q50,34 60,38','M40,20 Q50,24 60,20','M60,38 C68,32 78,28 82,20','M40,56 C32,50 22,46 18,38'],
  lotus:   ['M50,88 L50,52','M50,52 C42,44 38,34 42,26 C46,18 50,20 50,26','M50,52 C58,44 62,34 58,26 C54,18 50,20 50,26','M50,52 C38,48 28,44 26,34 C24,26 30,24 36,30','M50,52 C62,48 72,44 74,34 C76,26 70,24 64,30','M44,32 Q50,26 56,32 Q56,40 50,44 Q44,40 44,32 Z'],
  crane:   ['M50,68 C48,56 46,46 50,36','M50,36 C52,28 54,20 50,14 C48,10 44,10 42,14','M50,46 C40,42 28,44 18,36 C12,32 12,26 18,28','M50,46 C60,42 72,44 82,36 C88,32 88,26 82,28','M46,68 L44,86 L40,92 M46,68 L42,74 M54,68 L56,86 L60,92 M54,68 L58,74'],
  cloud:   ['M14,56 C16,43 26,38 34,43 C36,33 46,28 54,34 C58,25 68,22 75,28 C80,22 88,22 90,30 C96,32 98,44 92,48 C90,56 82,58 76,54 C72,60 62,62 56,57 C52,62 42,64 36,59 C30,64 18,62 14,56 Z'],
  fish:    ['M22,50 C28,32 44,24 60,28 C74,32 84,40 84,50 C84,60 74,68 60,72 C44,76 28,68 22,50 Z','M22,50 L10,40 L6,50 L10,60 Z','M66,42 C68,42 68,44 66,44 C64,44 64,42 66,42 Z','M45,30 C48,26 54,26 57,30 C54,34 48,34 45,30 Z'],
  plum:    ['M50,22 Q54,12 58,22 Q68,22 62,30 Q66,40 56,38 Q50,44 44,38 Q34,40 38,30 Q32,22 42,22 Q46,12 50,22 Z','M50,30 C52,28 54,30 54,32 C54,36 52,38 50,38 C48,38 46,36 46,32 C46,30 48,28 50,30 Z'],
  fan:     ['M50,82 L18,28 Q50,8 82,28 Z','M50,82 L22,32','M50,82 L30,18','M50,82 L40,12','M50,82 L60,12','M50,82 L70,18','M50,82 L78,32'],
  lantern: ['M38,18 L62,18 L64,28 L36,28 Z','M36,28 C28,34 26,48 28,60 C30,70 36,76 40,78 L60,78 C64,76 70,70 72,60 C74,48 72,34 64,28 Z','M40,78 L60,78 L58,86 L42,86 Z','M50,86 L50,98 M46,92 L44,98 M54,92 L56,98','M33,46 L67,46','M31,56 L69,56','M33,66 L67,66'],
  koi:     ['M18,50 C24,30 40,22 56,26 C70,30 80,40 80,50 C80,60 70,70 56,74 C40,78 24,70 18,50 Z','M18,50 L6,40 L4,50 L6,60 Z','M62,28 C64,22 70,20 72,26 C70,30 64,30 62,28 Z','M44,26 C47,22 53,22 56,26 C53,30 47,30 44,26 Z','M68,44 C70,42 72,44 70,46 C68,46 66,44 68,44 Z'],
  default: ['M50,16 C62,16 74,26 74,40 C74,58 62,70 50,76 C38,70 26,58 26,40 C26,26 38,16 50,16 Z','M50,26 C60,26 68,33 68,44 C68,58 60,67 50,72 C40,67 32,58 32,44 C32,33 40,26 50,26 Z'],
};

function BigSymbolSVG({ type, color, size = 240 }) {
  const paths = SYMBOL_PATHS[type] ?? SYMBOL_PATHS.default;
  const refs  = useRef([]);

  useEffect(() => {
    refs.current.forEach(el => {
      if (!el) return;
      const len = el.getTotalLength?.() ?? 400;
      el.style.strokeDasharray  = len;
      el.style.strokeDashoffset = len;
      void el.getBoundingClientRect();
    });
    requestAnimationFrame(() => {
      refs.current.forEach((el, i) => {
        if (!el) return;
        el.style.transition = `stroke-dashoffset ${1.2 + i * 0.4}s cubic-bezier(0.4,0,0.2,1) ${i * 0.35}s`;
        el.style.strokeDashoffset = '0';
      });
    });
  }, [type]);

  return (
    <svg viewBox="0 0 100 100" width={size} height={size} style={{ overflow: 'visible', filter: `drop-shadow(0 0 18px ${color}66)` }}>
      {paths.map((d, i) => (
        <path key={i} ref={el => { refs.current[i] = el; }} d={d}
          fill="none" stroke={color} strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round"
          style={{ strokeDasharray: 400, strokeDashoffset: 400 }} />
      ))}
    </svg>
  );
}

/* Generates one symbol image via edge function, caches in module-level map */
const imageCache = new Map();

async function fetchSymbolImage(symbol) {
  const key = `${symbol.name_zh}-${symbol.type}`;
  if (imageCache.has(key)) return imageCache.get(key);

  const { data, error } = await supabase.functions.invoke('generate-symbol-image', {
    body: { nameZh: symbol.name_zh, nameEn: symbol.name_en, type: symbol.type },
  });
  if (error || data?.error) throw new Error(error?.message || data?.error || 'Generation failed');
  imageCache.set(key, data.imageURL);
  return data.imageURL;
}

/* ─── Single symbol view ─── */
function SymbolView({ symbol, onPrev, onNext, hasPrev, hasNext, index, total }) {
  const [imageURL, setImageURL] = useState(imageCache.get(`${symbol.name_zh}-${symbol.type}`) ?? null);
  const [loading,  setLoading]  = useState(!imageURL);
  const [error,    setError]    = useState('');
  const [visible,  setVisible]  = useState(false);

  useEffect(() => {
    setVisible(false);
    setImageURL(imageCache.get(`${symbol.name_zh}-${symbol.type}`) ?? null);
    setError('');

    if (!imageCache.has(`${symbol.name_zh}-${symbol.type}`)) {
      setLoading(true);
      fetchSymbolImage(symbol)
        .then(url => { setImageURL(url); setLoading(false); })
        .catch(e  => { setError(e.message); setLoading(false); });
    } else {
      setLoading(false);
    }
  }, [symbol.name_zh, symbol.type]);

  useEffect(() => {
    if (!loading) {
      const t = setTimeout(() => setVisible(true), 60);
      return () => clearTimeout(t);
    }
  }, [loading]);

  return (
    <div style={{
      position: 'absolute', inset: 0,
      display: 'flex', flexDirection: 'column',
      alignItems: 'center', justifyContent: 'center',
      padding: '2rem',
    }}>
      {/* Counter */}
      <div style={{ fontSize: '0.6rem', letterSpacing: '0.2em', color: '#555', marginBottom: '1.5rem' }}>
        {String(index + 1).padStart(2, '0')} / {String(total).padStart(2, '0')}
      </div>

      {/* Image container */}
      <div style={{
        width: 'min(52vh, 52vw)', height: 'min(52vh, 52vw)',
        position: 'relative', marginBottom: '2rem',
      }}>
        {loading && (
          <div style={{
            position: 'absolute', inset: 0,
            display: 'flex', flexDirection: 'column',
            alignItems: 'center', justifyContent: 'center', gap: '1rem',
          }}>
            <div style={{
              width: 56, height: 56, borderRadius: '50%',
              border: `2px solid ${symbol.color || '#c8a455'}`,
              borderTopColor: 'transparent',
              animation: 'spin 1s linear infinite',
            }} />
            <p style={{ fontSize: '0.68rem', color: '#555', letterSpacing: '0.14em' }}>
              生成 {symbol.name_zh} 图像...
            </p>
          </div>
        )}

        {/* SVG fallback when image generation fails or no credits */}
        {(error || (!loading && !imageURL)) && (
          <div style={{
            position: 'absolute', inset: 0,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            opacity: visible ? 1 : 0,
            transition: 'opacity 0.65s ease',
          }}>
            <BigSymbolSVG type={symbol.type} color={symbol.color || '#c8a455'} size={Math.min(240, window.innerWidth * 0.4)} />
          </div>
        )}

        {imageURL && (
          <img
            src={imageURL}
            alt={symbol.name_zh}
            style={{
              width: '100%', height: '100%',
              objectFit: 'contain',
              borderRadius: 16,
              opacity: visible ? 1 : 0,
              transform: visible ? 'scale(1)' : 'scale(0.92)',
              transition: 'opacity 0.65s ease, transform 0.65s cubic-bezier(0.22,1,0.36,1)',
              boxShadow: `0 0 60px ${symbol.color || '#c8a455'}22, 0 0 120px ${symbol.color || '#c8a455'}10`,
            }}
          />
        )}
      </div>

      {/* Symbol identity */}
      <div style={{ textAlign: 'center', marginBottom: '1.2rem' }}>
        <div style={{ display: 'flex', alignItems: 'baseline', gap: '0.7rem',
          justifyContent: 'center', marginBottom: '0.5rem' }}>
          <span style={{
            fontSize: '2.2rem', fontWeight: 200,
            color: symbol.color || '#c8a455',
            letterSpacing: '0.08em',
            textShadow: `0 0 40px ${symbol.color || '#c8a455'}55`,
          }}>
            {symbol.name_zh}
          </span>
          <span style={{ fontSize: '0.85rem', color: '#555', letterSpacing: '0.1em' }}>
            {symbol.name_en}
          </span>
        </div>
        <p style={{
          fontSize: '0.82rem', color: '#888', lineHeight: 1.8,
          maxWidth: 420, margin: '0 auto', letterSpacing: '0.02em',
        }}>
          {symbol.meaning_zh}
        </p>
      </div>

      {/* Navigation */}
      <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
        <button
          onClick={onPrev} disabled={!hasPrev}
          style={{
            width: 44, height: 44, borderRadius: '50%',
            background: hasPrev ? 'rgba(255,255,255,0.08)' : 'transparent',
            border: `1px solid ${hasPrev ? 'rgba(255,255,255,0.15)' : 'rgba(255,255,255,0.05)'}`,
            color: hasPrev ? '#ccc' : '#333',
            cursor: hasPrev ? 'pointer' : 'default',
            fontSize: '1rem', display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}
        >←</button>

        {/* Dots */}
        <div style={{ display: 'flex', gap: '0.4rem' }}>
          {Array.from({ length: total }, (_, i) => (
            <div key={i} style={{
              width: i === index ? 18 : 6, height: 6, borderRadius: 3,
              background: i === index ? (symbol.color || '#c8a455') : 'rgba(255,255,255,0.15)',
              transition: 'all 0.3s ease',
            }} />
          ))}
        </div>

        <button
          onClick={onNext} disabled={!hasNext}
          style={{
            width: 44, height: 44, borderRadius: '50%',
            background: hasNext ? 'rgba(255,255,255,0.08)' : 'transparent',
            border: `1px solid ${hasNext ? 'rgba(255,255,255,0.15)' : 'rgba(255,255,255,0.05)'}`,
            color: hasNext ? '#ccc' : '#333',
            cursor: hasNext ? 'pointer' : 'default',
            fontSize: '1rem', display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}
        >→</button>
      </div>
    </div>
  );
}

/* ─── Main overlay ─── */
export default function ExploreOverlay({ symbols, startIndex, onClose }) {
  const [index,   setIndex]   = useState(startIndex ?? 0);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => setMounted(true), 30);
    return () => clearTimeout(t);
  }, []);

  // Pre-fetch adjacent symbols silently
  useEffect(() => {
    const next = symbols[index + 1];
    const prev = symbols[index - 1];
    if (next) fetchSymbolImage(next).catch(() => {});
    if (prev) fetchSymbolImage(prev).catch(() => {});
  }, [index, symbols]);

  const handleClose = () => { setMounted(false); setTimeout(onClose, 400); };

  return (
    <>
      {/* Spinner keyframe (inline) */}
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>

      {/* Full-screen overlay */}
      <div style={{
        position: 'absolute', inset: 0, zIndex: 40,
        background: 'rgba(4,4,4,0.96)',
        backdropFilter: 'blur(8px)',
        opacity: mounted ? 1 : 0,
        transition: 'opacity 0.4s ease',
      }}>
        {/* Close */}
        <button onClick={handleClose} style={{
          position: 'absolute', top: '1.2rem', right: '1.5rem', zIndex: 50,
          background: 'none', border: '1px solid rgba(255,255,255,0.12)',
          borderRadius: '50%', width: 36, height: 36,
          color: '#666', cursor: 'pointer', fontSize: '0.9rem',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>✕</button>

        {/* Header */}
        <div style={{
          position: 'absolute', top: '1.4rem', left: '1.5rem',
          fontSize: '0.6rem', letterSpacing: '0.2em', color: '#3a3a3a',
        }}>
          符号解析 · 返回作品
        </div>

        <SymbolView
          symbol={symbols[index]}
          index={index}
          total={symbols.length}
          hasPrev={index > 0}
          hasNext={index < symbols.length - 1}
          onPrev={() => setIndex(i => i - 1)}
          onNext={() => setIndex(i => i + 1)}
        />
      </div>
    </>
  );
}
