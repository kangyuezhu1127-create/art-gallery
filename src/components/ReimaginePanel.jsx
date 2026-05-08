import { useState, useEffect, useRef } from 'react';

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const SUPABASE_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY;

const cache = new Map(); // artworkId → imageURL

export default function ReimaginePanel({ artwork }) {
  const [status,   setStatus]   = useState('idle');   // idle | loading | ready | error
  const [imageURL, setImageURL] = useState(cache.get(artwork.id) ?? null);
  const [elapsed,  setElapsed]  = useState(0);
  const [errMsg,   setErrMsg]   = useState('');
  const [open,     setOpen]     = useState(false);
  const [imgLoaded,setImgLoaded]= useState(false);
  const tickRef   = useRef(null);
  const startedId = useRef(null);

  /* Auto-start generation when artwork changes */
  useEffect(() => {
    if (cache.has(artwork.id)) {
      setImageURL(cache.get(artwork.id));
      setStatus('ready');
      return;
    }
    if (startedId.current === artwork.id) return;
    startedId.current = artwork.id;
    setStatus('loading');
    setElapsed(0);
    setImgLoaded(false);

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
      })
      .catch(e => {
        clearInterval(tickRef.current);
        setErrMsg(e.message ?? String(e));
        setStatus('error');
      });

    return () => clearInterval(tickRef.current);
  }, [artwork.id, artwork.originalURL]);

  /* ── Trigger button styles ── */
  const btnStyle = {
    display: 'flex', alignItems: 'center', gap: '0.4rem',
    padding: '0.38rem 0.9rem',
    borderRadius: 99,
    border: '1px solid',
    fontSize: '0.65rem', letterSpacing: '0.12em',
    cursor: status === 'loading' ? 'default' : 'pointer',
    transition: 'all 0.3s',
    backdropFilter: 'blur(8px)',
    ...(status === 'ready' ? {
      background: 'rgba(255,220,80,0.12)',
      borderColor: 'rgba(255,220,80,0.5)',
      color: '#ffd84a',
      boxShadow: '0 0 16px rgba(255,220,80,0.2)',
      animation: 'reimagineGlow 2.5s ease-in-out infinite',
    } : status === 'loading' ? {
      background: 'rgba(255,255,255,0.05)',
      borderColor: 'rgba(255,255,255,0.15)',
      color: '#888',
    } : status === 'error' ? {
      background: 'rgba(200,60,60,0.08)',
      borderColor: 'rgba(200,60,60,0.3)',
      color: '#c05050',
    } : {
      background: 'rgba(255,255,255,0.05)',
      borderColor: 'rgba(255,255,255,0.15)',
      color: '#777',
    }),
  };

  return (
    <>
      <style>{`
        @keyframes reimagineGlow {
          0%,100% { box-shadow: 0 0 16px rgba(255,220,80,0.2); }
          50%      { box-shadow: 0 0 28px rgba(255,220,80,0.45); }
        }
        @keyframes reimagineSpin {
          to { transform: rotate(360deg); }
        }
      `}</style>

      {/* ── Trigger button (top-right of viewer) ── */}
      <button
        onClick={() => status === 'ready' && setOpen(true)}
        style={{ ...btnStyle, position: 'absolute', top: '0.9rem', right: '1rem', zIndex: 20 }}
        title={status === 'loading' ? `Reimagining… ${elapsed}s` : status === 'ready' ? 'View AI Reimagine' : status === 'error' ? errMsg : ''}
      >
        {status === 'loading' ? (
          <>
            <span style={{ width: 10, height: 10, borderRadius: '50%', border: '1.5px solid #666',
              borderTopColor: 'transparent', animation: 'reimagineSpin 0.9s linear infinite', flexShrink: 0 }} />
            Reimagining… {elapsed}s
          </>
        ) : status === 'ready' ? (
          <>✨ AI Reimagine</>
        ) : status === 'error' ? (
          <>⚠ Generation Failed</>
        ) : null}
      </button>

      {/* ── Fullscreen overlay ── */}
      {open && imageURL && (
        <div
          onClick={(e) => e.target === e.currentTarget && setOpen(false)}
          style={{
            position: 'absolute', inset: 0, zIndex: 50,
            background: 'rgba(4,4,4,0.96)',
            backdropFilter: 'blur(12px)',
            display: 'flex', flexDirection: 'column',
            alignItems: 'center', justifyContent: 'center',
            padding: '4rem 2rem 2rem',
          }}
        >
          {/* Close */}
          <button onClick={() => setOpen(false)} style={{
            position: 'absolute', top: '1rem', right: '1.2rem',
            background: 'none', border: '1px solid rgba(255,255,255,0.12)',
            borderRadius: '50%', width: 34, height: 34,
            color: '#555', cursor: 'pointer', fontSize: '0.85rem',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>✕</button>

          {/* Label */}
          <div style={{ position: 'absolute', top: '1.1rem', left: '1.4rem',
            fontSize: '0.58rem', letterSpacing: '0.2em', color: '#3a3a3a' }}>
            ✨ AI REIMAGINE · {artwork.title}
          </div>

          {/* Image */}
          <div style={{
            maxWidth: 'min(86vw, 86vh)',
            maxHeight: 'min(86vw, 86vh)',
            position: 'relative',
          }}>
            {!imgLoaded && (
              <div style={{ position: 'absolute', inset: 0, display: 'flex',
                alignItems: 'center', justifyContent: 'center' }}>
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
                width: '100%', height: '100%',
                objectFit: 'contain',
                borderRadius: 12,
                opacity: imgLoaded ? 1 : 0,
                transition: 'opacity 0.6s ease',
                boxShadow: '0 0 80px rgba(255,220,80,0.08)',
              }}
            />
          </div>

          {/* Caption */}
          <p style={{ marginTop: '1.2rem', fontSize: '0.68rem', color: '#444',
            letterSpacing: '0.1em', textAlign: 'center', maxWidth: 500, lineHeight: 1.6 }}>
            AI-generated real-world scene preserving the original composition
          </p>
        </div>
      )}

      {/* Error retry */}
      {status === 'error' && (
        <div style={{ position: 'absolute', top: '3.5rem', right: '1rem', zIndex: 20,
          background: 'rgba(8,8,8,0.9)', border: '1px solid rgba(200,60,60,0.3)',
          borderRadius: 8, padding: '0.7rem 0.9rem', maxWidth: 240,
          fontSize: '0.65rem', color: '#c05050', lineHeight: 1.5 }}>
          {errMsg.includes('not configured') ? (
            <>FAL_KEY not configured — see fal.ai</>
          ) : errMsg.slice(0, 120)}
          <button onClick={() => {
            startedId.current = null;
            cache.delete(artwork.id);
            setStatus('idle');
            setErrMsg('');
          }} style={{ display: 'block', marginTop: '0.5rem', background: 'none',
            border: '1px solid #555', borderRadius: 4, color: '#888',
            fontSize: '0.6rem', padding: '0.2rem 0.5rem', cursor: 'pointer' }}>
            Retry
          </button>
        </div>
      )}
    </>
  );
}
