import { useRef, Suspense, useState, useEffect } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { OrbitControls, useTexture } from '@react-three/drei';
import * as THREE from 'three';

const SPEED_RAD_PER_S = (Math.PI * 2) / 10;
const RESUME_DELAY_MS = 3000;

/* Edge-zone factor: -1 at left/top, 0 in dead zone, +1 at right/bottom */
function edgeFactor(v, dead = 0.22) {
  if (v < dead) return -(1 - v / dead);
  if (v > 1 - dead) return (v - (1 - dead)) / dead;
  return 0;
}

/* ─── Artwork mesh — displacement breathes ─── */
function ArtworkMesh({ colorURL, depthURL, displacementScale, aspectRatio }) {
  const [colorTex, depthTex] = useTexture([colorURL, depthURL]);
  colorTex.colorSpace = THREE.SRGBColorSpace;
  const meshRef   = useRef();
  const dispRef   = useRef(displacementScale);
  dispRef.current = displacementScale;

  useFrame(({ clock }) => {
    if (!meshRef.current?.material) return;
    meshRef.current.material.displacementScale =
      dispRef.current + Math.sin(clock.elapsedTime * 0.4) * 0.012;
  });

  const w = 3;
  const h = w / (aspectRatio || 1);
  return (
    <mesh ref={meshRef} rotation={[0, 0, 0]}>
      <planeGeometry args={[w, h, 256, 256]} />
      <meshStandardMaterial
        color="#000000" emissive="#ffffff"
        emissiveMap={colorTex} map={colorTex}
        transparent displacementMap={depthTex}
        displacementScale={displacementScale}
        side={THREE.DoubleSide}
      />
    </mesh>
  );
}

function SceneReady({ onReady }) {
  const fired = useRef(false);
  useFrame(() => { if (!fired.current) { fired.current = true; onReady?.(); } });
  return null;
}

function AutoCamera({ aspectRatio }) {
  const { camera, size } = useThree();
  useFrame(() => {
    if (camera.userData.fitted) return;
    camera.userData.fitted = true;
    const meshH  = 3 / (aspectRatio || 1);
    const fovRad = (camera.fov * Math.PI) / 180;
    const fitH   = (meshH / 2 / Math.tan(fovRad / 2)) / 0.8;
    const fitW   = (3 / (2 * Math.tan(fovRad / 2) * (size.width / size.height))) / 0.8;
    camera.position.set(0, 0, Math.max(fitH, fitW));
    camera.lookAt(0, 0, 0);
    camera.updateProjectionMatrix();
  });
  return null;
}

/* ─── Scene — pivot spin OR cursor-edge rotation + paper flutter ─── */
function Scene({ colorURL, depthURL, displacementScale, aspectRatio, onReady, motionEnabled }) {
  const pivotRef     = useRef();
  const paperRef     = useRef();
  const lastInteract = useRef(-Infinity);
  const mouseRef     = useRef({ x: 0.5, y: 0.5 });

  /* Track cursor when motion is on */
  useEffect(() => {
    if (!motionEnabled) return;
    const onMove = (e) => {
      mouseRef.current = { x: e.clientX / window.innerWidth, y: e.clientY / window.innerHeight };
    };
    window.addEventListener('mousemove', onMove);
    return () => window.removeEventListener('mousemove', onMove);
  }, [motionEnabled]);

  const onInteract = () => { lastInteract.current = performance.now(); };

  useFrame((_, delta) => {
    const now  = performance.now();
    const idle = (now - lastInteract.current) > RESUME_DELAY_MS;

    if (pivotRef.current) {
      if (motionEnabled) {
        /* Cursor edges drive Y (and slight X) rotation */
        const xf = edgeFactor(mouseRef.current.x);
        const yf = edgeFactor(mouseRef.current.y);
        if (xf !== 0) pivotRef.current.rotation.y += xf * delta * 1.6;
        if (yf !== 0) pivotRef.current.rotation.x += yf * delta * 0.5;
        // Gently return X to 0 when not driven
        if (yf === 0) pivotRef.current.rotation.x *= 0.95;
      } else if (idle) {
        /* Auto-spin when idle and motion control off */
        pivotRef.current.rotation.y =
          (pivotRef.current.rotation.y + delta * SPEED_RAD_PER_S) % (Math.PI * 2);
      }
    }

    /* Paper flutter — always on */
    if (paperRef.current) {
      const t = now / 1000;
      paperRef.current.rotation.x = Math.sin(t * 0.35) * 0.044;
      paperRef.current.rotation.z = Math.sin(t * 0.22 + 1.8) * 0.021;
    }
  });

  return (
    <>
      <AutoCamera aspectRatio={aspectRatio} />
      <group ref={pivotRef}>
        <group ref={paperRef}>
          <Suspense fallback={null}>
            <ArtworkMesh
              colorURL={colorURL} depthURL={depthURL}
              displacementScale={displacementScale} aspectRatio={aspectRatio}
            />
            <SceneReady onReady={onReady} />
          </Suspense>
        </group>
      </group>
      <OrbitControls
        enablePan enableZoom enableRotate
        minDistance={0.5} maxDistance={12}
        dampingFactor={0.05} enableDamping
        onStart={onInteract} onChange={onInteract}
      />
    </>
  );
}

export default function Artwork3DViewer({ colorURL, depthURL, displacementScale, aspectRatio, onReady }) {
  const [motionEnabled, setMotionEnabled] = useState(false);

  return (
    <div className="absolute inset-0" style={{ background: '#0d0d0d' }}>
      <Canvas
        key={colorURL}
        gl={{ antialias: true, alpha: true, toneMapping: THREE.NoToneMapping, outputColorSpace: THREE.SRGBColorSpace }}
        dpr={[1, 2]}
        camera={{ fov: 45, near: 0.1, far: 100, position: [0, 0, 5] }}
        style={{ width: '100%', height: '100%' }}
      >
        <Scene
          colorURL={colorURL} depthURL={depthURL}
          displacementScale={displacementScale} aspectRatio={aspectRatio}
          onReady={onReady} motionEnabled={motionEnabled}
        />
      </Canvas>

      {/* Motion control toggle */}
      <button
        onClick={() => setMotionEnabled(m => !m)}
        style={{
          position: 'absolute', bottom: '6.5rem', left: '50%', transform: 'translateX(-50%)',
          background: motionEnabled ? 'rgba(200,164,85,0.15)' : 'rgba(255,255,255,0.06)',
          border: `1px solid ${motionEnabled ? 'rgba(200,164,85,0.45)' : 'rgba(255,255,255,0.14)'}`,
          borderRadius: 99, cursor: 'pointer',
          color: motionEnabled ? '#c8a455' : '#555',
          fontSize: '0.62rem', letterSpacing: '0.12em',
          padding: '0.38rem 0.9rem',
          backdropFilter: 'blur(8px)',
          zIndex: 25,
          transition: 'all 0.25s',
        }}
      >
        ✋ {motionEnabled ? 'MOTION ON' : 'MOTION CONTROL'}
      </button>

      {/* Edge hint arrows when motion enabled */}
      {motionEnabled && (
        <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none', zIndex: 24 }}>
          {[
            { style: { top: '30%', left: '0.6rem' },   char: '◀' },
            { style: { top: '30%', right: '0.6rem' },  char: '▶' },
          ].map(({ style, char }) => (
            <div key={char} style={{
              position: 'absolute', ...style,
              color: '#c8a455', fontSize: '0.85rem', opacity: 0.35,
              animation: 'motionPulse 2s ease-in-out infinite',
            }}>{char}</div>
          ))}
          <style>{`@keyframes motionPulse { 0%,100%{opacity:.18} 50%{opacity:.55} }`}</style>
        </div>
      )}
    </div>
  );
}
