import { useState, useEffect, useRef, useCallback } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import HandsfreeOverlay from '../components/gestures/HandsfreeOverlay';
import UploadModal from '../components/UploadModal';
import AuthModal from '../components/AuthModal';
import EditModal from '../components/EditModal';
import { useAuth } from '../contexts/AuthContext';

// ── Generating depth overlay ─────────────────────────────────────
function GeneratingOverlay({ status }) {
  return (
    <div style={{
      position: 'absolute', inset: 0,
      background: 'rgba(0,0,0,0.52)',
      display: 'flex', flexDirection: 'column',
      alignItems: 'center', justifyContent: 'center',
      gap: 14, zIndex: 2,
    }}>
      {/* Scan line */}
      <div style={{ position: 'absolute', inset: 0, overflow: 'hidden', pointerEvents: 'none' }}>
        <div style={{
          position: 'absolute', left: 0, right: 0, height: 2,
          background: 'linear-gradient(90deg, transparent 0%, rgba(255,255,255,0.55) 50%, transparent 100%)',
          animation: 'scanline 2.2s linear infinite',
        }} />
      </div>

      {/* Corner brackets — digital-to-reality aesthetic */}
      {[['top:10px','left:10px','borderTop','borderLeft'],
        ['top:10px','right:10px','borderTop','borderRight'],
        ['bottom:10px','left:10px','borderBottom','borderLeft'],
        ['bottom:10px','right:10px','borderBottom','borderRight'],
      ].map(([t, s], i) => (
        <div key={i} style={{
          position: 'absolute',
          ...(Object.fromEntries([t, s].map(p => p.split(':')))),
          width: 20, height: 20,
          borderColor: 'rgba(255,255,255,0.45)',
          borderStyle: 'solid',
          borderWidth: 0,
          ...(i < 2 ? { borderTopWidth: 2 } : { borderBottomWidth: 2 }),
          ...(i % 2 === 0 ? { borderLeftWidth: 2 } : { borderRightWidth: 2 }),
        }} />
      ))}

      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10, zIndex: 1 }}>
        <div style={{
          width: 28, height: 28,
          border: '2px solid rgba(255,255,255,0.25)',
          borderTopColor: '#fff',
          borderRadius: '50%',
          animation: 'spin 0.9s linear infinite',
        }} />
        <p style={{
          color: '#fff', fontSize: 9.5,
          letterSpacing: '0.3em', textTransform: 'uppercase',
          fontFamily: '"Inter Tight", monospace', fontWeight: 600,
        }}>Computing Depth</p>
        <p style={{
          color: 'rgba(255,255,255,0.45)', fontSize: 8.5,
          letterSpacing: '0.15em', textAlign: 'center', maxWidth: 180,
          fontFamily: '"Inter Tight", monospace',
        }}>{status || 'Digital → Reality'}</p>
      </div>
    </div>
  );
}

// ── Artwork index item ────────────────────────────────────────────
function IndexItem({ artwork, index, isActive, onClick }) {
  const has3D       = !!artwork.depthMapURL;
  const isGenerating = !has3D && !artwork.depthStatus?.startsWith('Generation failed');

  return (
    <div
      data-gesture-target
      data-artwork-index={index}
      onClick={onClick}
      style={{
        marginBottom: 18,
        paddingLeft: 14,
        borderLeft: `2px solid ${isActive ? '#111' : 'transparent'}`,
        cursor: 'pointer',
        transition: 'border-color 0.2s',
      }}
    >
      <p style={{
        fontFamily: '"Fraunces", serif',
        fontSize: 14,
        fontWeight: isActive ? 700 : 400,
        color: isActive ? '#111' : '#555',
        lineHeight: 1.35,
        transition: 'color 0.2s, font-weight 0.2s',
      }}>
        {artwork.title}
      </p>
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 2 }}>
        <p style={{ fontSize: 11, color: '#aaa' }}>{artwork.artist || 'Unknown'}</p>
        {isGenerating && (
          <span style={{
            fontSize: 8, letterSpacing: '0.12em', color: '#D72638',
            background: 'rgba(215,38,56,0.08)',
            padding: '1px 5px', borderRadius: 3,
            fontFamily: '"Inter Tight", monospace', fontWeight: 600,
          }}>DEPTH</span>
        )}
        {has3D && (
          <span style={{
            fontSize: 8, letterSpacing: '0.12em', color: '#16a34a',
            background: 'rgba(22,163,74,0.08)',
            padding: '1px 5px', borderRadius: 3,
            fontFamily: '"Inter Tight", monospace', fontWeight: 600,
          }}>3D</span>
        )}
      </div>
    </div>
  );
}

// ── Main gallery page ─────────────────────────────────────────────
export default function GalleryPage({ artworks, loading, onAdd, onUpdate, onSave, onDelete }) {
  const { user } = useAuth();
  const navigate  = useNavigate();

  const [featured,    setFeatured]    = useState(0);
  const [handMode,    setHandMode]    = useState(false);
  const [showUpload,  setShowUpload]  = useState(false);
  const [showAuth,    setShowAuth]    = useState(false);
  const [editTarget,  setEditTarget]  = useState(null);
  const [imgLoaded,   setImgLoaded]   = useState(false);

  const gestureRef  = useRef('none');
  const gestureCooldown = useRef(false);

  // Reset image loaded state when featured changes
  useEffect(() => { setImgLoaded(false); }, [featured]);

  // Clamp featured index when artworks change
  useEffect(() => {
    if (artworks.length > 0 && featured >= artworks.length) setFeatured(0);
  }, [artworks.length, featured]);

  const artwork      = artworks[featured] ?? null;
  const has3D        = !!artwork?.depthMapURL;
  const isGenerating = artwork && !has3D &&
    !artwork.depthStatus?.startsWith('Generation failed') &&
    !artwork.depthStatus?.startsWith('Timeout');
  const isError      = artwork?.depthStatus?.startsWith('Generation failed') ||
                       artwork?.depthStatus?.startsWith('Timeout');

  // Gesture → open palm = next, fist = prev (with cooldown)
  const handleGesture = useCallback((g) => {
    gestureRef.current = g;
    if (gestureCooldown.current) return;
    if ((g === 'open' || g === 'fist') && artworks.length > 1) {
      gestureCooldown.current = true;
      setFeatured(f => g === 'open'
        ? (f + 1) % artworks.length
        : (f - 1 + artworks.length) % artworks.length
      );
      setTimeout(() => { gestureCooldown.current = false; }, 1200);
    }
  }, [artworks.length]);

  // Dwell select handler
  const handleGestureSelect = useCallback((el) => {
    const idx = el.dataset?.artworkIndex;
    if (idx !== undefined) { setFeatured(Number(idx)); return; }
    el.click();
  }, []);

  const isOwner = user && artwork && user.id === artwork.userId;

  // ── Groups for index ─────────────────────────────────────────
  const ready      = artworks.filter(a => !!a.depthMapURL);
  const processing = artworks.filter(a => !a.depthMapURL && !a.depthStatus?.startsWith('Generation'));
  const errored    = artworks.filter(a => a.depthStatus?.startsWith('Generation'));

  return (
    <div style={{
      minHeight: '100vh',
      background: '#fff',
      color: '#222',
      fontFamily: '"Inter Tight", "Noto Sans SC", sans-serif',
    }}>
      <Helmet>
        <title>Gallery · Unveilthe.Arts</title>
      </Helmet>

      {/* ── Top nav ── */}
      <header style={{
        position: 'sticky', top: 0, zIndex: 40,
        borderBottom: '1px solid #e5e5e5',
        background: 'rgba(255,255,255,0.96)',
        backdropFilter: 'blur(14px)',
      }}>
        <div style={{
          maxWidth: 1440, margin: '0 auto',
          padding: '0 36px',
          height: 50,
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        }}>
          <Link to="/" style={{
            fontFamily: '"Fraunces", serif', fontWeight: 900,
            fontSize: 12.5, letterSpacing: '0.22em', textTransform: 'uppercase',
            color: '#111', textDecoration: 'none',
          }}>
            Unveilthe.Arts
          </Link>

          <nav style={{ display: 'flex', gap: 36, fontSize: 10.5, letterSpacing: '0.22em', textTransform: 'uppercase' }}>
            {[
              { to: '/enter',   label: 'Cosmos'  },
              { to: '/gallery', label: 'Gallery', active: true },
              { to: '/about',   label: 'About'   },
            ].map(({ to, label, active }) => (
              <Link key={to} to={to} style={{
                color: active ? '#111' : '#999',
                textDecoration: 'none',
                borderBottom: active ? '1px solid #111' : 'none',
                paddingBottom: active ? 2 : 0,
              }}>{label}</Link>
            ))}
          </nav>

          <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
            {/* Hand mode toggle */}
            <button
              onClick={() => setHandMode(h => !h)}
              style={{
                fontSize: 10, letterSpacing: '0.18em', textTransform: 'uppercase',
                background: handMode ? '#111' : 'transparent',
                color: handMode ? '#fff' : '#888',
                border: '1px solid #d5d5d5',
                padding: '5px 14px', borderRadius: 99, cursor: 'pointer',
                fontFamily: '"Inter Tight", sans-serif',
                transition: 'all 0.22s',
                display: 'flex', alignItems: 'center', gap: 6,
              }}
            >
              <span style={{ fontSize: 13 }}>✋</span>
              <span>{handMode ? 'Hand Active' : 'Hand Mode'}</span>
            </button>

            {/* Upload */}
            <button
              onClick={() => user ? setShowUpload(true) : setShowAuth(true)}
              style={{
                fontSize: 10, letterSpacing: '0.18em', textTransform: 'uppercase',
                background: 'transparent',
                color: '#888', border: '1px solid #d5d5d5',
                padding: '5px 14px', borderRadius: 99, cursor: 'pointer',
                fontFamily: '"Inter Tight", sans-serif',
              }}
            >+ Upload</button>
          </div>
        </div>
      </header>

      {/* ── Three-column layout ── */}
      <div style={{
        maxWidth: 1440, margin: '0 auto',
        padding: '0 36px',
        display: 'grid',
        gridTemplateColumns: '216px 1fr 268px',
        gap: '0 52px',
        minHeight: 'calc(100vh - 50px - 46px)',
        alignItems: 'start',
      }}>

        {/* ── Left: Index ── */}
        <aside style={{
          borderRight: '1px solid #e5e5e5',
          paddingTop: 40,
          paddingRight: 36,
          paddingBottom: 60,
          position: 'sticky', top: 50,
          maxHeight: 'calc(100vh - 50px)',
          overflowY: 'auto',
        }}>
          <p style={{
            fontSize: 10, letterSpacing: '0.22em', color: '#aaa',
            marginBottom: 24, textTransform: 'uppercase',
          }}>( Index )</p>

          {loading ? (
            <p style={{ fontSize: 12, color: '#bbb' }}>Loading…</p>
          ) : artworks.length === 0 ? (
            <p style={{ fontSize: 12, color: '#bbb', lineHeight: 1.7 }}>
              No works yet.<br />Upload to begin.
            </p>
          ) : (
            <>
              {ready.length > 0 && (
                <>
                  <p style={{ fontSize: 9, letterSpacing: '0.18em', color: '#ccc', marginBottom: 12, textTransform: 'uppercase' }}>( 3D Ready )</p>
                  {ready.map(aw => {
                    const i = artworks.indexOf(aw);
                    return <IndexItem key={aw.id} artwork={aw} index={i} isActive={i === featured} onClick={() => setFeatured(i)} />;
                  })}
                </>
              )}

              {processing.length > 0 && (
                <>
                  <p style={{ fontSize: 9, letterSpacing: '0.18em', color: '#ccc', margin: '16px 0 12px', textTransform: 'uppercase' }}>( Computing )</p>
                  {processing.map(aw => {
                    const i = artworks.indexOf(aw);
                    return <IndexItem key={aw.id} artwork={aw} index={i} isActive={i === featured} onClick={() => setFeatured(i)} />;
                  })}
                </>
              )}

              {errored.length > 0 && (
                <>
                  <p style={{ fontSize: 9, letterSpacing: '0.18em', color: '#ccc', margin: '16px 0 12px', textTransform: 'uppercase' }}>( Error )</p>
                  {errored.map(aw => {
                    const i = artworks.indexOf(aw);
                    return <IndexItem key={aw.id} artwork={aw} index={i} isActive={i === featured} onClick={() => setFeatured(i)} />;
                  })}
                </>
              )}
            </>
          )}

          {/* Upload CTA */}
          <div style={{ marginTop: 32, paddingTop: 24, borderTop: '1px solid #e5e5e5' }}>
            <button
              onClick={() => user ? setShowUpload(true) : setShowAuth(true)}
              style={{
                fontSize: 9.5, letterSpacing: '0.2em', textTransform: 'uppercase',
                background: 'transparent', border: '1px solid #d5d5d5',
                color: '#aaa', padding: '7px 16px', borderRadius: 99,
                cursor: 'pointer', fontFamily: '"Inter Tight", sans-serif',
                transition: 'all 0.2s', width: '100%',
              }}
            >+ Add Work</button>
          </div>
        </aside>

        {/* ── Center: Featured artwork ── */}
        <main style={{ paddingTop: 40, paddingBottom: 60 }}>
          {loading ? (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: 400 }}>
              <div style={{ width: 24, height: 24, border: '2px solid #e5e5e5', borderTopColor: '#111', borderRadius: '50%', animation: 'spin 0.9s linear infinite' }} />
            </div>

          ) : !artwork ? (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: 400, textAlign: 'center' }}>
              <p style={{ fontFamily: '"Fraunces", serif', fontSize: 26, fontWeight: 700, marginBottom: 8 }}>No works yet.</p>
              <p style={{ fontSize: 13, color: '#999', marginBottom: 24 }}>Upload your first papercut to begin.</p>
              <button
                onClick={() => user ? setShowUpload(true) : setShowAuth(true)}
                style={{
                  fontSize: 11, letterSpacing: '0.15em', textTransform: 'uppercase',
                  background: '#111', color: '#fff',
                  border: 'none', padding: '10px 24px', borderRadius: 99,
                  cursor: 'pointer', fontFamily: '"Inter Tight", sans-serif',
                }}>Upload First Work →</button>
            </div>

          ) : (
            <>
              {/* Main image */}
              <div style={{
                position: 'relative',
                background: '#f2f2f2',
                borderRadius: 6,
                overflow: 'hidden',
                aspectRatio: artwork.aspectRatio || '4/3',
                maxHeight: '68vh',
                transition: 'opacity 0.3s',
              }}>
                <img
                  key={artwork.id}
                  src={artwork.originalURL}
                  alt={artwork.title}
                  onLoad={() => setImgLoaded(true)}
                  style={{
                    width: '100%', height: '100%',
                    objectFit: 'cover', display: 'block',
                    opacity: imgLoaded ? 1 : 0,
                    transition: 'opacity 0.5s ease',
                  }}
                />

                {/* Generating overlay */}
                {isGenerating && <GeneratingOverlay status={artwork.depthStatus} />}

                {/* Error */}
                {isError && (
                  <div style={{
                    position: 'absolute', inset: 0, background: 'rgba(215,38,56,0.75)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                  }}>
                    <p style={{ color: '#fff', fontSize: 11, letterSpacing: '0.1em', textAlign: 'center', padding: 20 }}>
                      {artwork.depthStatus}
                    </p>
                  </div>
                )}

                {/* Enter 3D */}
                {has3D && (
                  <button
                    data-gesture-target
                    onClick={() => navigate(`/artwork/${artwork.id}`)}
                    style={{
                      position: 'absolute', bottom: 14, right: 14,
                      background: 'rgba(0,0,0,0.82)', color: '#fff',
                      fontSize: 10, letterSpacing: '0.2em', textTransform: 'uppercase',
                      padding: '8px 18px', borderRadius: 99, border: 'none',
                      cursor: 'pointer', fontFamily: '"Inter Tight", sans-serif',
                      backdropFilter: 'blur(10px)',
                      transition: 'background 0.2s',
                    }}
                    onMouseEnter={e => e.currentTarget.style.background = 'rgba(0,0,0,0.95)'}
                    onMouseLeave={e => e.currentTarget.style.background = 'rgba(0,0,0,0.82)'}
                  >
                    Enter 3D →
                  </button>
                )}
              </div>

              {/* Navigation */}
              {artworks.length > 1 && (
                <div style={{
                  display: 'flex', alignItems: 'center', gap: 16,
                  marginTop: 20,
                }}>
                  <button
                    data-gesture-target
                    onClick={() => setFeatured(f => (f - 1 + artworks.length) % artworks.length)}
                    style={navBtnStyle}
                  >←</button>
                  <span style={{ fontSize: 10.5, letterSpacing: '0.15em', color: '#aaa', fontFamily: '"Inter Tight", monospace' }}>
                    {featured + 1} / {artworks.length}
                  </span>
                  <button
                    data-gesture-target
                    onClick={() => setFeatured(f => (f + 1) % artworks.length)}
                    style={navBtnStyle}
                  >→</button>

                  {handMode && (
                    <span style={{
                      fontSize: 9, letterSpacing: '0.15em', color: '#bbb',
                      marginLeft: 8,
                      fontFamily: '"Inter Tight", monospace',
                      textTransform: 'uppercase',
                    }}>
                      ✋ Open / ✊ Fist to navigate
                    </span>
                  )}
                </div>
              )}
            </>
          )}
        </main>

        {/* ── Right: Metadata ── */}
        <aside style={{
          borderLeft: '1px solid #e5e5e5',
          paddingTop: 40,
          paddingLeft: 36,
          paddingBottom: 60,
          position: 'sticky', top: 50,
          maxHeight: 'calc(100vh - 50px)',
          overflowY: 'auto',
        }}>
          {artwork ? (
            <>
              <p style={{ fontSize: 10, letterSpacing: '0.22em', color: '#aaa', marginBottom: 24, textTransform: 'uppercase' }}>
                ( Detail )
              </p>

              <h2 style={{
                fontFamily: '"Fraunces", serif', fontWeight: 700,
                fontSize: 22, lineHeight: 1.2, color: '#111', marginBottom: 8,
              }}>
                {artwork.title}
              </h2>
              <p style={{ fontSize: 13, color: '#777', marginBottom: 28 }}>
                {artwork.artist || 'Unknown Artist'}
                {artwork.year && <span style={{ color: '#aaa' }}> · {artwork.year}</span>}
              </p>

              <div style={{ borderTop: '1px solid #e5e5e5', paddingTop: 22, marginBottom: 22 }}>
                {artwork.medium && (
                  <div style={{ marginBottom: 16 }}>
                    <p style={{ fontSize: 9, letterSpacing: '0.18em', color: '#bbb', textTransform: 'uppercase', marginBottom: 3 }}>Medium</p>
                    <p style={{ fontSize: 13, color: '#555' }}>{artwork.medium}</p>
                  </div>
                )}
                <div>
                  <p style={{ fontSize: 9, letterSpacing: '0.18em', color: '#bbb', textTransform: 'uppercase', marginBottom: 3 }}>Depth Status</p>
                  <p style={{ fontSize: 11.5, letterSpacing: '0.06em', color: has3D ? '#16a34a' : isError ? '#D72638' : '#f59e0b' }}>
                    {has3D ? '3D READY' : isError ? 'ERROR' : 'COMPUTING…'}
                  </p>
                </div>
              </div>

              {/* Actions */}
              {has3D && (
                <button
                  data-gesture-target
                  onClick={() => navigate(`/artwork/${artwork.id}`)}
                  style={{
                    width: '100%', padding: '10px 0',
                    background: '#111', color: '#fff',
                    border: 'none', borderRadius: 99,
                    fontSize: 10.5, letterSpacing: '0.2em', textTransform: 'uppercase',
                    cursor: 'pointer', fontFamily: '"Inter Tight", sans-serif',
                    marginBottom: 10, transition: 'background 0.2s',
                  }}
                  onMouseEnter={e => e.currentTarget.style.background = '#333'}
                  onMouseLeave={e => e.currentTarget.style.background = '#111'}
                >
                  Enter 3D Experience →
                </button>
              )}

              {isOwner && (
                <div style={{ display: 'flex', gap: 8, marginBottom: 10 }}>
                  <button
                    onClick={() => setEditTarget(artwork)}
                    style={smallBtnStyle}
                  >Edit</button>
                  <button
                    onClick={() => onDelete(artwork.id)}
                    style={{ ...smallBtnStyle, color: '#D72638', borderColor: 'rgba(215,38,56,0.25)' }}
                  >Delete</button>
                </div>
              )}

              {/* Divider */}
              <div style={{ borderTop: '1px solid #e5e5e5', paddingTop: 22, marginTop: 22 }}>
                <p style={{ fontSize: 9, letterSpacing: '0.22em', color: '#bbb', textTransform: 'uppercase', marginBottom: 16 }}>
                  {handMode ? '( Gesture Active )' : '( Gesture Guide )'}
                </p>
                {[
                  ['☝', 'Point', 'Browse index'],
                  ['✌', 'Pinch', 'Select / Confirm'],
                  ['✋', 'Open', 'Next work'],
                  ['✊', 'Fist', 'Previous work'],
                ].map(([icon, name, desc]) => (
                  <div key={name} style={{ display: 'flex', alignItems: 'flex-start', gap: 10, marginBottom: 12 }}>
                    <span style={{ fontSize: 15, opacity: handMode ? 0.85 : 0.4, lineHeight: 1 }}>{icon}</span>
                    <div>
                      <p style={{ fontSize: 9.5, fontWeight: 700, letterSpacing: '0.12em', color: handMode ? '#333' : '#aaa', textTransform: 'uppercase' }}>{name}</p>
                      <p style={{ fontSize: 10, color: '#bbb' }}>{desc}</p>
                    </div>
                  </div>
                ))}
              </div>
            </>
          ) : (
            <div />
          )}
        </aside>
      </div>

      {/* ── Footer ── */}
      <footer style={{
        borderTop: '1px solid #e5e5e5',
        padding: '14px 36px',
        display: 'flex', justifyContent: 'center',
        gap: 36,
        fontSize: 10, letterSpacing: '0.22em', textTransform: 'uppercase', color: '#bbb',
      }}>
        <Link to="/about" style={{ color: '#bbb', textDecoration: 'none' }}>Info</Link>
        <a href="https://instagram.com" target="_blank" rel="noopener noreferrer" style={{ color: '#bbb', textDecoration: 'none' }}>IG</a>
        <Link to="/" style={{ color: '#bbb', textDecoration: 'none' }}>Home</Link>
      </footer>

      {/* ── Hand gesture overlay ── */}
      <HandsfreeOverlay
        enabled={handMode}
        onClose={() => setHandMode(false)}
        onSelect={handleGestureSelect}
        onGesture={handleGesture}
        dwellMs={1100}
      />

      {/* ── Modals ── */}
      {showUpload && <UploadModal onClose={() => setShowUpload(false)} onAdd={onAdd} onUpdate={onUpdate} />}
      {showAuth   && <AuthModal  onClose={() => setShowAuth(false)} />}
      {editTarget && (
        <EditModal
          artwork={editTarget}
          onClose={() => setEditTarget(null)}
          onSave={updated => { onSave(updated); setEditTarget(null); }}
        />
      )}

      <style>{`
        @keyframes spin    { to { transform: rotate(360deg); } }
        @keyframes scanline {
          0%   { top: -2px; }
          100% { top: 102%; }
        }
        aside::-webkit-scrollbar { width: 4px; }
        aside::-webkit-scrollbar-track { background: transparent; }
        aside::-webkit-scrollbar-thumb { background: #e0e0e0; border-radius: 2px; }
      `}</style>
    </div>
  );
}

const navBtnStyle = {
  background: 'none',
  border: '1px solid #e0e0e0',
  color: '#666',
  padding: '6px 18px',
  borderRadius: 99,
  cursor: 'pointer',
  fontSize: 13,
  fontFamily: '"Inter Tight", sans-serif',
  transition: 'border-color 0.2s, color 0.2s',
};

const smallBtnStyle = {
  flex: 1,
  padding: '8px 0',
  background: 'transparent',
  border: '1px solid #e0e0e0',
  color: '#666',
  borderRadius: 99,
  fontSize: 10, letterSpacing: '0.12em', textTransform: 'uppercase',
  cursor: 'pointer', fontFamily: '"Inter Tight", sans-serif',
};
