import { useRef, Suspense } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { OrbitControls, useTexture } from '@react-three/drei';
import * as THREE from 'three';

/* 1 full revolution every ~10 seconds at 60 fps
   Three.js default speed=2 ≡ 30 s/rev  →  speed=6 ≡ 10 s/rev  */
const AUTO_ROTATE_SPEED = 6;
const RESUME_DELAY_MS   = 3000;   // ms of inactivity before auto-rotation resumes

/* ─── Artwork mesh — upright, static rotation; only displacement breathes ─── */
function ArtworkMesh({ colorURL, depthURL, displacementScale, aspectRatio }) {
  const [colorTex, depthTex] = useTexture([colorURL, depthURL]);
  colorTex.colorSpace = THREE.SRGBColorSpace;

  const meshRef   = useRef();
  const dispRef   = useRef(displacementScale);
  dispRef.current = displacementScale;

  useFrame(({ clock }) => {
    if (!meshRef.current?.material) return;
    // Subtle displacement breathing — depth feels alive without changing orientation
    meshRef.current.material.displacementScale =
      dispRef.current + Math.sin(clock.elapsedTime * 0.4) * 0.012;
  });

  const w = 3;
  const h = w / (aspectRatio || 1);

  return (
    // rotation locked to (0,0,0) — camera orbits via OrbitControls, not mesh rotation
    <mesh ref={meshRef} rotation={[0, 0, 0]}>
      <planeGeometry args={[w, h, 256, 256]} />
      <meshStandardMaterial
        color="#000000"
        emissive="#ffffff"
        emissiveMap={colorTex}
        map={colorTex}
        transparent
        displacementMap={depthTex}
        displacementScale={displacementScale}
        side={THREE.DoubleSide}
      />
    </mesh>
  );
}

/* ─── Fires onReady after textures load and first frame renders ─── */
function SceneReady({ onReady }) {
  const fired = useRef(false);
  useFrame(() => {
    if (fired.current) return;
    fired.current = true;
    onReady?.();
  });
  return null;
}

/* ─── Fits camera so artwork fills ~80 % of viewport on first load ─── */
function AutoCamera({ aspectRatio }) {
  const { camera, size } = useThree();
  useFrame(() => {
    if (camera.userData.fitted) return;
    camera.userData.fitted = true;
    const meshH = 3 / (aspectRatio || 1);
    const fovRad = (camera.fov * Math.PI) / 180;
    const fitByH = (meshH / 2 / Math.tan(fovRad / 2)) / 0.8;
    const fitByW = (3 / (2 * Math.tan(fovRad / 2) * (size.width / size.height))) / 0.8;
    camera.position.set(0, 0, Math.max(fitByH, fitByW));
    camera.lookAt(0, 0, 0);
    camera.updateProjectionMatrix();
  });
  return null;
}

/* ─── Scene: auto-rotate via OrbitControls; pause on touch, resume after 3 s ─── */
function Scene({ colorURL, depthURL, displacementScale, aspectRatio, onReady }) {
  const controlsRef    = useRef();
  const lastInteractMs = useRef(-Infinity); // ms timestamp of last user interaction

  useFrame(() => {
    if (!controlsRef.current) return;
    const idle = (performance.now() - lastInteractMs.current) > RESUME_DELAY_MS;
    controlsRef.current.autoRotate = idle;
  });

  const onInteract = () => { lastInteractMs.current = performance.now(); };

  return (
    <>
      <AutoCamera aspectRatio={aspectRatio} />
      <Suspense fallback={null}>
        <ArtworkMesh
          colorURL={colorURL}
          depthURL={depthURL}
          displacementScale={displacementScale}
          aspectRatio={aspectRatio}
        />
        <SceneReady onReady={onReady} />
      </Suspense>
      <OrbitControls
        ref={controlsRef}
        autoRotate
        autoRotateSpeed={AUTO_ROTATE_SPEED}
        enablePan
        enableZoom
        enableRotate
        minDistance={0.5}
        maxDistance={12}
        dampingFactor={0.05}
        enableDamping
        onStart={onInteract}
        onChange={onInteract}
      />
    </>
  );
}

export default function Artwork3DViewer({ colorURL, depthURL, displacementScale, aspectRatio, onReady }) {
  return (
    <div className="absolute inset-0" style={{ background: '#0d0d0d' }}>
      {/*
        key=colorURL forces the Canvas to fully remount whenever the artwork
        changes, giving a fresh clock and a fresh OrbitControls state so every
        artwork starts in the same front-facing, upright orientation.
      */}
      <Canvas
        key={colorURL}
        gl={{ antialias: true, alpha: true, toneMapping: THREE.NoToneMapping, outputColorSpace: THREE.SRGBColorSpace }}
        dpr={[1, 2]}
        camera={{ fov: 45, near: 0.1, far: 100, position: [0, 0, 5] }}
        style={{ width: '100%', height: '100%' }}
      >
        <Scene
          colorURL={colorURL}
          depthURL={depthURL}
          displacementScale={displacementScale}
          aspectRatio={aspectRatio}
          onReady={onReady}
        />
      </Canvas>
    </div>
  );
}
