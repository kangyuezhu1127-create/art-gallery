import { useState, useEffect, useRef } from 'react';
import { supabase } from '../lib/supabase';

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
    if (!loading && imageURL) {
      const t = setTimeout(() => setVisible(true), 60);
      return () => clearTimeout(t);
    }
  }, [loading, imageURL]);

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

        {error && (
          <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center',
            justifyContent: 'center', flexDirection: 'column', gap: '1rem' }}>
            <p style={{ color: '#844', fontSize: '0.78rem' }}>{error}</p>
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
