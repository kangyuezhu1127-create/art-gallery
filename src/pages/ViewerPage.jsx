import { useState, useEffect, useRef, useCallback } from 'react';
import { Helmet } from 'react-helmet-async';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import Artwork3DViewer from '../components/Artwork3DViewer';
import ReimaginePanel from '../components/ReimaginePanel';
import { useGalleryTransition } from '../contexts/TransitionContext';

export default function ViewerPage({ artworks, onUpdate }) {
  const { id }      = useParams();
  const navigate    = useNavigate();
  const location    = useLocation();
  const { signalReady } = useGalleryTransition();

  const artwork     = artworks.find((a) => a.id === id);
  const has3D       = !!artwork?.depthMapURL;
  const fromGallery = !!location.state?.fromGallery;

  const [displacementScale, setDisplacementScale] = useState(fromGallery ? 0 : 0.25);
  const animRef  = useRef(null);
  const firedRef = useRef(false);

  const animateDisplacement = useCallback(() => {
    let start = null;
    const run = (ts) => {
      if (!start) start = ts;
      const p = Math.min((ts - start) / 1400, 1);
      setDisplacementScale((1 - Math.pow(1 - p, 3)) * 0.25);
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
      <Helmet>
        <title>{artwork.title} — Depth Gallery</title>
        <meta name="description" content={seoDescription || `${artwork.title} — 3D depth viewer`} />
        <meta property="og:title" content={`${artwork.title} — Depth Gallery`} />
        <meta property="og:description" content={seoDescription} />
        <meta property="og:image" content={artwork.originalURL} />
        <meta property="og:type" content="article" />
      </Helmet>

      {/* Top bar */}
      <div className="flex items-center justify-between px-6 py-4 text-white z-10">
        <button onClick={() => navigate('/gallery')}
          className="flex items-center gap-2 text-sm text-gray-400 hover:text-white transition-colors">
          ← Back to Gallery
        </button>
        <div className="text-center">
          <h1 className="font-medium text-white">{artwork.title}</h1>
          {artwork.artist && (
            <p className="text-xs text-gray-400">{artwork.artist}{artwork.year && ` · ${artwork.year}`}</p>
          )}
        </div>
        <div className="w-24" />
      </div>

      {/* Canvas area */}
      <div className="flex-1 relative min-h-0">
        {/* AI Reimagine — auto-starts, shows ✨ button when ready */}
        {has3D && <ReimaginePanel artwork={artwork} />}

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

        {has3D && (
          <>
            <div className="absolute bottom-8 left-1/2 -translate-x-1/2 bg-black/60 backdrop-blur rounded-2xl px-6 py-4 text-white flex items-center gap-4 min-w-64">
              <span className="text-xs text-gray-400 whitespace-nowrap">Depth</span>
              <input
                type="range" min="0" max="0.8" step="0.01"
                value={displacementScale}
                onChange={(e) => {
                  if (animRef.current) { cancelAnimationFrame(animRef.current); animRef.current = null; }
                  setDisplacementScale(parseFloat(e.target.value));
                }}
                className="flex-1 accent-white"
              />
              <span className="text-xs text-gray-300 w-8 text-right">{Math.round(displacementScale * 100)}</span>
            </div>
            <div className="absolute top-4 left-1/2 -translate-x-1/2 bg-black/50 backdrop-blur rounded-full px-4 py-1.5 text-xs text-gray-300 pointer-events-none">
              Drag to rotate · Scroll to zoom · Right-click to pan
            </div>
          </>
        )}
      </div>

      {artwork.description && (
        <div className="px-6 py-4 text-gray-500 text-sm text-center border-t border-gray-800">
          {artwork.description}
        </div>
      )}
    </div>
  );
}
