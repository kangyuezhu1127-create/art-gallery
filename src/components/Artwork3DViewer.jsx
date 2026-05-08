import { useRef, Suspense } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { OrbitControls, useTexture } from '@react-three/drei';
import * as THREE from 'three';

const SPEED_RAD_PER_S = (Math.PI * 2) / 10;   // 10 s per full revolution
const RESUME_DELAY_MS = 3000;                  // ms of inactivity before spin resumes

/* ─── Artwork mesh — displacement breathes, orientation driven by parent groups ─── */
function ArtworkMesh({ colorURL, depthURL, displacementScale, aspectRatio }) {
  const [colorTex, depthTex] = useTexture([colorURL, depthURL]);
  colorTex.colorSpace = THREE.SRGBColorSpace;

  const meshRef   = useRef();
  const dispRef   = useRef(displacementScale);
  dispRef.current = displacementScale;

  useFrame(({ clock }) => {
    if (!meshRef.current?.material) return;
    // Subtle depth breathing — feels alive without changing pose
    meshRef.current.material.displacementScale =
      dispRef.current + Math.sin(clock.elapsedTime * 0.4) * 0.012;
  });

  const w = 3;
  const h = w / (aspectRatio || 1);

  return (
    <mesh ref={meshRef}>
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

/* ─── Fires onReady after textures loaded + first frame rendered ─── */
function SceneReady({ onReady }) {
  const fired = useRef(false);
  useFrame(() => {
    if (fired.current) return;
    fired.current = true;
    onReady?.();
  });
  return null;
}

/* ─── Fits camera so artwork fills ~80 % of viewport ─── */
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

/* ─── Scene: pivot spin + paper flutter + user orbit ─── */
function Scene({ colorURL, depthURL, displacementScale, aspectRatio, onReady }) {
  const pivotRef     = useRef();   // display-pedestal Y spin
  const paperRef     = useRef();   // paper-in-wind subtle bend
  const lastInteract = useRef(-Infinity); // ms timestamp

  useFrame((_, delta) => {
    const now  = performance.now();
    const idle = (now - lastInteract.current) > RESUME_DELAY_MS;

    /* ── Display pedestal spin — stops while user is interacting ── */
    if (pivotRef.current) {
      if (idle) {
        pivotRef.current.rotation.y =
          (pivotRef.current.rotation.y + delta * SPEED_RAD_PER_S) % (Math.PI * 2);
      }
    }

    /* ── Paper in wind — always running, very subtle ── */
    if (paperRef.current) {
      const t = now / 1000; // wall-clock seconds (not canvas clock, so no reset artifacts)
      // Gentle X tilt: ±2.5°, slow wave
      paperRef.current.rotation.x = Math.sin(t * 0.35) * 0.044;
      // Slight Z twist: ±1.2°, offset phase so it doesn't sync with X
      paperRef.current.rotation.z = Math.sin(t * 0.22 + 1.8) * 0.021;
    }
  });

  const onInteract = () => { lastInteract.current = performance.now(); };

  return (
    <>
      <AutoCamera aspectRatio={aspectRatio} />

      {/* pivot: auto-spins on Y */}
      <group ref={pivotRef}>
        {/* paper: gentle tilt + twist */}
        <group ref={paperRef}>
          <Suspense fallback={null}>
            <ArtworkMesh
              colorURL={colorURL}
              depthURL={depthURL}
              displacementScale={displacementScale}
              aspectRatio={aspectRatio}
            />
            <SceneReady onReady={onReady} />
          </Suspense>
        </group>
      </group>

      <OrbitControls
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
      {/* key=colorURL → fresh canvas + fresh clock for every artwork */}
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
