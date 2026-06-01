import { useRef, useMemo, useState, Suspense } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { Stars } from '@react-three/drei';
import { EffectComposer, Bloom, Vignette } from '@react-three/postprocessing';
import { useNavigate } from 'react-router-dom';
import * as THREE from 'three';
import { Helmet } from 'react-helmet-async';
import SiteNav from '../components/SiteNav';

/**
 * CosmosPage (mounted at /enter) — replaces the old Upload/Explore selector.
 *
 * A deep-space scene where every artwork floats as a 2D plane at a random
 * point in 3D volume, slowly rotating and breathing. Camera drifts in
 * response to mouse position; scroll wheel zooms through the cluster.
 * Click an artwork → its 3D viewer page.
 */

/* ─── Safe canvas-downsampled texture loader (re-used pattern) ─── */
const MAX_TEX = 1024;
function loadTextureSafe(url, onLoad, onError) {
  const img = new window.Image();
  img.crossOrigin = 'anonymous';
  img.onload = () => {
    try {
      const { naturalWidth: iw, naturalHeight: ih } = img;
      const scale = Math.min(1, MAX_TEX / iw, MAX_TEX / ih);
      const canvas = document.createElement('canvas');
      canvas.width  = Math.round(iw * scale);
      canvas.height = Math.round(ih * scale);
      canvas.getContext('2d').drawImage(img, 0, 0, canvas.width, canvas.height);
      const tex = new THREE.CanvasTexture(canvas);
      tex.colorSpace = THREE.SRGBColorSpace;
      onLoad(tex);
    } catch (e) { onError(e); }
  };
  img.onerror = onError;
  img.src = url;
}

/* ─── Deterministic pseudo-random based on string ─── */
function seedRand(seed) {
  let h = 0;
  for (let i = 0; i < seed.length; i++) h = (Math.imul(31, h) + seed.charCodeAt(i)) | 0;
  return () => {
    h = (Math.imul(48271, h) ^ (h >>> 16)) | 0;
    return (Math.abs(h) % 100000) / 100000;
  };
}

/* ─── A single floating artwork plane ─── */
function FloatingArtwork({ artwork, position, rotation, scale, phase, onClick }) {
  const groupRef = useRef();
  const [texture, setTexture] = useState(null);
  const [hovered, setHovered] = useState(false);

  // Lazy texture load
  useMemo(() => {
    if (!artwork.originalURL) return;
    loadTextureSafe(artwork.originalURL, setTexture, () => {});
  }, [artwork.originalURL]);

  const aspect = artwork.aspectRatio || 1.0;
  const w = scale;
  const h = scale / aspect;

  useFrame(({ clock }) => {
    if (!groupRef.current) return;
    const t = clock.getElapsedTime();
    // Gentle Y rotation + vertical bob, unique per-artwork phase
    groupRef.current.rotation.y = rotation[1] + Math.sin(t * 0.2 + phase) * 0.15;
    groupRef.current.position.y = position[1] + Math.sin(t * 0.4 + phase) * 0.25;
    // Hover: scale-up nudge
    const target = hovered ? 1.15 : 1;
    groupRef.current.scale.x += (target - groupRef.current.scale.x) * 0.12;
    groupRef.current.scale.y += (target - groupRef.current.scale.y) * 0.12;
    groupRef.current.scale.z += (target - groupRef.current.scale.z) * 0.12;
  });

  return (
    <group
      ref={groupRef}
      position={position}
      rotation={rotation}
      onClick={(e) => { e.stopPropagation(); onClick(); }}
      onPointerOver={(e) => { e.stopPropagation(); setHovered(true); document.body.style.cursor = 'pointer'; }}
      onPointerOut={() => { setHovered(false); document.body.style.cursor = 'auto'; }}
    >
      {/* The art itself */}
      {texture && (
        <mesh>
          <planeGeometry args={[w, h]} />
          <meshBasicMaterial
            map={texture}
            transparent
            side={THREE.DoubleSide}
            toneMapped={false}
          />
        </mesh>
      )}
      {/* Subtle glow halo behind */}
      {texture && (
        <mesh position={[0, 0, -0.02]}>
          <planeGeometry args={[w * 1.15, h * 1.15]} />
          <meshBasicMaterial color={hovered ? '#7DD3FC' : '#ffffff'} transparent opacity={hovered ? 0.22 : 0.06} />
        </mesh>
      )}
    </group>
  );
}

/* ─── Mouse + scroll driven camera rig ─── */
function CameraRig() {
  const { camera, mouse } = useThree();
  const targetZ = useRef(28);
  const targetX = useRef(0);
  const targetY = useRef(0);

  // Scroll wheel → forward/back through space
  useMemo(() => {
    const onWheel = (e) => {
      e.preventDefault();
      targetZ.current = Math.max(8, Math.min(50, targetZ.current + e.deltaY * 0.02));
    };
    window.addEventListener('wheel', onWheel, { passive: false });
    return () => window.removeEventListener('wheel', onWheel);
  }, []);

  useFrame(() => {
    // Mouse parallax for camera target (look-at)
    targetX.current = mouse.x * 2.5;
    targetY.current = mouse.y * 1.5;

    // Smoothly approach
    camera.position.z += (targetZ.current - camera.position.z) * 0.06;
    camera.position.x += (mouse.x * 1.2 - camera.position.x) * 0.05;
    camera.position.y += (mouse.y * 0.8 - camera.position.y) * 0.05;
    camera.lookAt(0, 0, 0);
  });

  return null;
}

/* ─── Distribute artworks in a spherical volume ─── */
function useArtworkLayout(artworks) {
  return useMemo(() => {
    return artworks.map((art, i) => {
      const rand = seedRand(art.id || String(i));
      // Spherical coords for an even-ish distribution
      const r     = 6 + rand() * 14;             // 6 ~ 20 distance from origin
      const theta = rand() * Math.PI * 2;
      const phi   = (rand() - 0.5) * Math.PI * 0.85;
      const x = r * Math.cos(phi) * Math.cos(theta);
      const y = r * Math.sin(phi) * 0.6;          // squash vertical
      const z = r * Math.cos(phi) * Math.sin(theta) - 5;
      const rotation = [
        (rand() - 0.5) * 0.4,
        rand() * Math.PI * 2,
        (rand() - 0.5) * 0.25,
      ];
      const scale = 1.4 + rand() * 1.6;
      const phase = rand() * Math.PI * 2;
      return { art, position: [x, y, z], rotation, scale, phase };
    });
  }, [artworks]);
}

function CosmosScene({ artworks, onPick }) {
  const layout = useArtworkLayout(artworks);

  return (
    <>
      <color attach="background" args={['#05060c']} />
      <ambientLight intensity={1.2} />

      {/* Deep starfield */}
      <Stars
        radius={120}
        depth={60}
        count={4500}
        factor={3.5}
        saturation={0.2}
        fade
        speed={0.4}
      />

      {/* Closer warmer stars layer */}
      <Stars
        radius={40}
        depth={30}
        count={1200}
        factor={1.8}
        saturation={1}
        fade
        speed={0.8}
      />

      {/* Floating artworks */}
      {layout.map(({ art, position, rotation, scale, phase }) => (
        <FloatingArtwork
          key={art.id}
          artwork={art}
          position={position}
          rotation={rotation}
          scale={scale}
          phase={phase}
          onClick={() => onPick(art)}
        />
      ))}

      <CameraRig />

      {/* Cinematic post-processing */}
      <EffectComposer>
        <Bloom
          intensity={0.55}
          luminanceThreshold={0.35}
          luminanceSmoothing={0.6}
          mipmapBlur
        />
        <Vignette eskil={false} offset={0.15} darkness={0.85} />
      </EffectComposer>
    </>
  );
}

export default function SelectionPage({ artworks = [] }) {
  const navigate = useNavigate();
  const [lang, setLang] = useState('en');

  // Only artworks with a valid image
  const visible = useMemo(
    () => artworks.filter((a) => a.originalURL),
    [artworks]
  );

  const copy = lang === 'zh'
    ? { tag: '宇宙厅', title: '漂浮的剪纸', hint: '鼠标拖动 · 滚轮放大 · 点击作品进入立体视图' }
    : { tag: 'COSMOS HALL', title: 'Floating Papercuts', hint: 'MOVE MOUSE · SCROLL TO ZOOM · CLICK A WORK FOR 3D' };

  return (
    <div className="fixed inset-0 bg-[#05060c] text-white overflow-hidden">
      <Helmet>
        <title>Cosmos · Depth Gallery</title>
      </Helmet>

      {/* The 3D scene fills the screen */}
      <div className="absolute inset-0">
        <Canvas
          camera={{ position: [0, 0, 28], fov: 60 }}
          dpr={[1, 2]}
          gl={{ antialias: true, alpha: false }}
        >
          <Suspense fallback={null}>
            <CosmosScene
              artworks={visible}
              onPick={(a) => navigate(`/artwork/${a.id}`)}
            />
          </Suspense>
        </Canvas>
      </div>

      {/* HUD overlay */}
      <div className="absolute top-0 left-0 right-0 z-20">
        {/* Site nav (white text variant for dark bg) */}
        <div className="cosmos-nav">
          <SiteNav variant="transparent" lang={lang} onLangChange={setLang} />
        </div>
      </div>

      {/* Page-specific labels overlaid bottom-left */}
      <div className="absolute bottom-10 left-6 z-20 pointer-events-none">
        <p className="text-[0.65rem] tracking-[0.32em] uppercase text-white/55 mb-3">
          {copy.tag}
        </p>
        <h1
          className="font-editorial text-white"
          style={{
            fontSize: 'clamp(2rem, 4.5vw, 4rem)',
            fontWeight: 700,
            letterSpacing: '-0.01em',
            lineHeight: 1,
          }}
        >
          {copy.title}
        </h1>
        <p className="text-[0.65rem] tracking-[0.22em] uppercase text-white/40 mt-3">
          {copy.hint}
        </p>
      </div>

      {/* Works counter bottom-right */}
      <div className="absolute bottom-10 right-6 z-20 text-right pointer-events-none">
        <div className="text-[0.65rem] tracking-[0.32em] uppercase text-white/40 mb-1">Drifting</div>
        <div className="font-editorial text-white text-3xl">{visible.length}</div>
        <div className="text-[0.65rem] tracking-[0.22em] uppercase text-white/40 mt-1">
          {lang === 'zh' ? '件作品' : 'works'}
        </div>
      </div>

      {/* Local style: make SiteNav text white over dark background */}
      <style>{`
        .cosmos-nav nav { background: transparent !important; border: none !important; }
        .cosmos-nav nav .text-ink            { color: #fff !important; }
        .cosmos-nav nav .text-ink\\/55       { color: rgba(255,255,255,0.6) !important; }
        .cosmos-nav nav .text-ink\\/45       { color: rgba(255,255,255,0.4) !important; }
        .cosmos-nav nav .text-ink\\/40       { color: rgba(255,255,255,0.35) !important; }
        .cosmos-nav nav .border-ink\\/15     { border-color: rgba(255,255,255,0.25) !important; }
        .cosmos-nav nav .border-ink\\/10     { border-color: rgba(255,255,255,0.15) !important; }
        .cosmos-nav nav button:hover         { background-color: rgba(255,255,255,0.1) !important; }
      `}</style>
    </div>
  );
}
