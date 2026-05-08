import { useState, useRef } from 'react';

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const SUPABASE_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY;

const cache = new Map(); // artworkId → imageURL

export default function ReimaginePanel({ artwork }) {
  const [status,    setStatus]    = useState(() => cache.has(artwork.id) ? 'ready' : 'idle');
  const [imageURL,  setImageURL]  = useState(() => cache.get(artwork.id) ?? null);
  const [elapsed,   setElapsed]   = useState(0);
  const [errMsg,    setErrMsg]    = useState('');
  const [open,      setOpen]      = useState(false);
  const [imgLoaded, setImgLoaded] = useState(false);
  const tickRef = useRef(null);

  const generate = () => {
    if (status === 'loading') return;
    if (status === 'ready' && imageURL) { setOpen(true); return; }

    setStatus('loading');
    setElapsed(0);
    setErrMsg('');
    tickRef.current = setInterval(() => setElapsed(n => n + 1), 1000);

    fetch(`${SUPABASE_URL}/functions/v1/reimagine-artwork`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${SUPABASE_KEY}` },
      body: JSON.stringify({ imageURL: artwork.originalURL }),
      signal: AbortSignal.timeout(120_000),
    })
      .then(r => r.json())
      .then(data => {
        clearInterval(tickRef.current);
        if (data.error) throw new Error(data.error);
        cache.set(artwork.id, data.imageURL);
        setImageURL(data.imageURL);
        setStatus('ready');
        setOpen(true); // auto-open overlay when generation completes
      })
      .catch(e => {
        clearInterval(tickRef.current);
        setErrMsg(e.message ?? String(e));
        setStatus('error');
      });
  };

  /* ── Button label & style ── */
  const btnLabel = {
    idle:    '✨  AI Reimagine',
    loading: `✦  Reimagining… ${elapsed}s`,
    ready:   '✨  View Reimagined Scene',
    error:   '⚠  Failed — Retry',
  }[status];

  const btnStyle = {
    display: 'flex', alignItems: 'center', gap: '0.5rem',
    padding: '0.6rem 1.6rem',
    borderRadius: 99,
    border: '1px solid',
    fontSize: '0.7rem', letterSpacing: '0.14em',
    cursor: status === 'loading' ? 'default' : 'pointer',
    transition: 'all 0.3s',
    backdropFilter: 'blur(10px)',
    ...(status === 'idle' ? {
      background: 'rgba(255,220,80,0.10)',
      borderColor: 'rgba(255,220,80,0.4)',
      color: '#ffd84a',
    } : status === 'loading' ? {
      background: 'rgba(255,255,255,0.05)',
      borderColor: 'rgba(255,255,255,0.12)',
      color: '#777',
      animation: 'reimaginePulse 1.6s ease-in-out infinite',
    } : status === 'ready' ? {
      background: 'rgba(255,220,80,0.15)',
      borderColor: 'rgba(255,220,80,0.55)',
      color: '#ffd84a',
      boxShadow: '0 0 22px rgba(255,220,80,0.25)',
      animation: 'reimagineGlow 2.5s ease-in-out infinite',
    } : {
      background: 'rgba(200,60,60,0.08)',
      borderColor: 'rgba(200,60,60,0.3)',
      color: '#c05050',
    }),
  };

  return (
    <>
      <style>{`
        @keyframes reimagineGlow {
          0%,100% { box-shadow: 0 0 18px rgba(255,220,80,0.22); }
          50%      { box-shadow: 0 0 32px rgba(255,220,80,0.50); }
        }
        @keyframes reimaginePulse {
          0%,100% { opacity: 1; }
          50%      { opacity: 0.55; }
        }
        @keyframes reimagineSpin {
          to { transform: rotate(360deg); }
        }
      `}</style>

      {/* ── Main button — bottom centre ── */}
      <button onClick={generate} style={{
        ...btnStyle,
        position: 'absolute',
        bottom: '2.2rem',
        left: '50%',
        transform: 'translateX(-50%)',
        zIndex: 20,
      }}>
        {status === 'loading' && (
          <span style={{ width: 11, height: 11, borderRadius: '50%',
            border: '1.5px solid #666', borderTopColor: 'transparent',
            animation: 'reimagineSpin 0.85s linear infinite', flexShrink: 0 }} />
        )}
        {btnLabel}
      </button>

      {/* ── Fullscreen immersive overlay ── */}
      {open && imageURL && (
        <div
          onClick={(e) => e.target === e.currentTarget && setOpen(false)}
          style={{
            position: 'absolute', inset: 0, zIndex: 50,
            background: 'rgba(4,4,4,0.97)',
            backdropFilter: 'blur(14px)',
            display: 'flex', flexDirection: 'column',
            alignItems: 'center', justifyContent: 'center',
            padding: '4rem 2rem 2rem',
          }}
        >
          <button onClick={() => setOpen(false)} style={{
            position: 'absolute', top: '1rem', right: '1.2rem',
            background: 'none', border: '1px solid rgba(255,255,255,0.12)',
            borderRadius: '50%', width: 34, height: 34,
            color: '#555', cursor: 'pointer', fontSize: '0.85rem',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>✕</button>

          <div style={{ position: 'absolute', top: '1.1rem', left: '1.4rem',
            fontSize: '0.58rem', letterSpacing: '0.2em', color: '#3a3a3a' }}>
            ✨ AI REIMAGINE · {artwork.title}
          </div>

          <div style={{ maxWidth: 'min(86vw, 86vh)', maxHeight: 'min(86vw, 86vh)', position: 'relative' }}>
            {!imgLoaded && (
              <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <div style={{ width: 40, height: 40, borderRadius: '50%',
                  border: '2px solid #ffd84a', borderTopColor: 'transparent',
                  animation: 'reimagineSpin 1s linear infinite' }} />
              </div>
            )}
            <img
              src={imageURL}
              alt="AI reimagined"
              onLoad={() => setImgLoaded(true)}
              style={{
                width: '100%', height: '100%', objectFit: 'contain',
                borderRadius: 12,
                opacity: imgLoaded ? 1 : 0,
                transition: 'opacity 0.6s ease',
                boxShadow: '0 0 80px rgba(255,220,80,0.08)',
              }}
            />
          </div>

          <p style={{ marginTop: '1.2rem', fontSize: '0.68rem', color: '#444',
            letterSpacing: '0.1em', textAlign: 'center', maxWidth: 500, lineHeight: 1.6 }}>
            AI-generated real-world scene preserving the original composition
          </p>
        </div>
      )}
    </>
  );
}
