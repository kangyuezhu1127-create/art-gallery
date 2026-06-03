import { useState, useEffect, useRef, useCallback } from 'react';
import { Helmet } from 'react-helmet-async';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import Artwork3DViewer from '../components/Artwork3DViewer';
import ReimaginePanel from '../components/ReimaginePanel';
import { useGalleryTransition } from '../contexts/TransitionContext';
import SiteNav from '../components/SiteNav';
import HandsfreeOverlay from '../components/gestures/HandsfreeOverlay';

const FIXED_DEPTH = 0.25; // no slider — fixed depth for the 3D effect

export default function ViewerPage({ artworks, onUpdate }) {
  const { id }      = useParams();
  const navigate    = useNavigate();
  const location    = useLocation();
  const { signalReady } = useGalleryTransition();

  const artwork     = artworks.find((a) => a.id === id);
  const has3D       = !!artwork?.depthMapURL;
  const fromGallery = !!location.state?.fromGallery;

  // Animate displacement 0 → FIXED_DEPTH on gallery entry; otherwise start at fixed value
  const [displacementScale, setDisplacementScale] = useState(fromGallery ? 0 : FIXED_DEPTH);
  const animRef  = useRef(null);
  const firedRef = useRef(false);

  const animateDisplacement = useCallback(() => {
    let start = null;
    const run = (ts) => {
      if (!start) start = ts;
      const p = Math.min((ts - start) / 1400, 1);
      setDisplacementScale((1 - Math.pow(1 - p, 3)) * FIXED_DEPTH);
      if (p < 1) animRef.current = requestAnimationFrame(run);
      else        animRef.current = null;
    };
    animRef.current = requestAnimationFrame(run);
  }, []);

  const handleSceneReady = useCallback(() => {
    if (!fromGallery || firedRef.current) return;
    firedRef.current = true;
    signalReady();
    setTimeout(animateDisplacement, 220);
  }, [fromGallery, signalReady, animateDisplacement]);

  useEffect(() => {
    if (!fromGallery || has3D) return;
    const t = setTimeout(() => signalReady(), 350);
    return () => clearTimeout(t);
  }, [fromGallery, has3D, signalReady]);

  useEffect(() => () => {
    if (animRef.current) { cancelAnimationFrame(animRef.current); animRef.current = null; }
  }, []);

  if (!artwork) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-950 text-white">
        <div className="text-center">
          <p className="text-lg mb-4">Artwork not found</p>
          <button onClick={() => navigate('/gallery')} className="px-4 py-2 bg-white text-gray-900 rounded-lg">
            Back to Gallery
          </button>
        </div>
      </div>
    );
  }

  const seoDescription = [artwork.artist, artwork.year, artwork.description].filter(Boolean).join(' · ');

  return (
    <div className="h-screen bg-[#0d0d0d] flex flex-col overflow-hidden">
      {/* ───── Hands-free gesture demo (dwell-select on Reimagine) ───── */}
      <HandsfreeDemo />

      <Helmet>
        <title>{artwork.title} — Unveilthe.Arts</title>
        <meta name="description" content={seoDescription || `${artwork.title} — 3D depth viewer`} />
        <meta property="og:title" content={`${artwork.title} — Unveilthe.Arts`} />
        <meta property="og:description" content={seoDescription} />
        <meta property="og:image" content={artwork.originalURL} />
        <meta property="og:type" content="article" />
      </Helmet>

      {/* Unified site nav (dark variant) */}
      <SiteNav variant="dark" />

      {/* Artwork title strip below nav — translucent block, no line */}
      <div className="flex items-center justify-between px-6 py-3 text-white z-10 bg-white/8 backdrop-blur-sm">
        <button onClick={() => navigate('/gallery')}
          className="flex items-center gap-2 text-xs tracking-[0.18em] uppercase text-white/55 hover:text-white transition-colors">
          ← Back to Gallery
        </button>
        <div className="text-center">
          <h1 className="font-display font-bold text-white text-base">{artwork.title}</h1>
          {artwork.artist && (
            <p className="text-xs text-white/55">{artwork.artist}{artwork.year && ` · ${artwork.year}`}</p>
          )}
        </div>
        <div className="w-24" />
      </div>

      {/* Canvas area */}
      <div className="flex-1 relative min-h-0">

        {has3D ? (
          <Artwork3DViewer
            colorURL={artwork.originalURL}
            depthURL={artwork.depthMapURL}
            displacementScale={displacementScale}
            aspectRatio={artwork.aspectRatio}
            onReady={handleSceneReady}
          />
        ) : (
          <div className="absolute inset-0 flex flex-col items-center justify-center text-white gap-4">
            <div className="w-10 h-10 border-2 border-white border-t-transparent rounded-full animate-spin" />
            <p className="text-gray-300">{artwork.depthStatus || 'Generating 3D…'}</p>
            <p className="text-xs text-gray-500">First use requires downloading ~50MB AI model</p>
          </div>
        )}

        {/* Hint */}
        {has3D && (
          <div className="absolute top-4 left-1/2 -translate-x-1/2 bg-black/50 backdrop-blur rounded-full px-4 py-1.5 text-xs text-gray-300 pointer-events-none">
            Drag to rotate · Scroll to zoom · Right-click to pan
          </div>
        )}

        {/* AI Reimagine — user-triggered only, no auto API call */}
        {has3D && <ReimaginePanel artwork={artwork} />}
      </div>

      {artwork.description && (
        <div className="px-6 py-4 text-gray-500 text-sm text-center border-t border-gray-800">
          {artwork.description}
        </div>
      )}
    </div>
  );
}

/**
 * HandsfreeDemo — toggle button + camera-driven cursor.
 *
 * When the user dwells (1.5s) over any element with
 * [data-gesture-target], that element is clicked. On this page the
 * only registered target is the ReimaginePanel's main button, so the
 * end-to-end demo is:  enable → hover hand over Reimagine button →
 * progress ring fills → button auto-fires → AI scene generates.
 */
function HandsfreeDemo() {
  const [on, setOn] = useState(false);

  return (
    <>
      {/* Toggle pill — top-right under SiteNav, above 3D canvas */}
      <button
        onClick={() => setOn((v) => !v)}
        title={on ? 'Turn off hands-free' : 'Enable hands-free (camera)'}
        style={{
          position: 'absolute',
          top: 92,   // sits below SiteNav (80px) + title strip
          right: 16,
          zIndex: 30,
          display: 'inline-flex',
          alignItems: 'center',
          gap: 8,
          padding: '8px 14px',
          background: on ? 'rgba(124,58,237,0.18)' : 'rgba(255,255,255,0.06)',
          border: `1px solid ${on ? 'rgba(124,58,237,0.55)' : 'rgba(255,255,255,0.18)'}`,
          color: on ? '#c4b5fd' : '#ddd',
          fontSize: 11,
          letterSpacing: '0.18em',
          textTransform: 'uppercase',
          borderRadius: 99,
          cursor: 'pointer',
          backdropFilter: 'blur(8px)',
          transition: 'all 0.2s',
        }}
      >
        <span style={{ fontSize: 14, lineHeight: 1 }}>{on ? '👁' : '👋'}</span>
        {on ? 'Hands-free · On' : 'Hands-free'}
      </button>

      <HandsfreeOverlay
        enabled={on}
        dwellMs={1500}
        selector="[data-gesture-target]"
        onSelect={(el) => el.click()}
        onClose={() => setOn(false)}
      />
    </>
  );
}
