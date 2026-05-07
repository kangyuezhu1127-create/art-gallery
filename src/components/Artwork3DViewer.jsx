import { useRef, Suspense } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { OrbitControls, useTexture } from '@react-three/drei';
import * as THREE from 'three';

function ArtworkMesh({ colorURL, depthURL, displacementScale, aspectRatio }) {
  const [colorTex, depthTex] = useTexture([colorURL, depthURL]);
  colorTex.colorSpace = THREE.SRGBColorSpace;

  const meshRef      = useRef();
  const dispRef      = useRef(displacementScale);   // synced each render
  const lastInteract = useRef(-100);                // seconds since epoch (clock time)
  dispRef.current    = displacementScale;

  useFrame(({ clock }) => {
    if (!meshRef.current) return;
    const t = clock.elapsedTime;

    // Idle strength ramps to 1 after 1.8 s of no OrbitControls activity
    const idle = Math.min((t - lastInteract.current) / 1.8, 1);

    // Three independent sine waves → organic paper-floating feel
    meshRef.current.rotation.y = Math.sin(t * 0.22)            * 0.09  * idle;
    meshRef.current.rotation.x = Math.sin(t * 0.15 + 1.3)     * 0.034 * idle;
    meshRef.current.rotation.z = Math.sin(t * 0.19 + 2.8)     * 0.014 * idle;

    // Displacement breathes ±0.013 around slider value — depth feels alive
    if (meshRef.current.material) {
      const breath = Math.sin(t * 0.38 + 0.9) * 0.013;
      meshRef.current.material.displacementScale = dispRef.current + breath;
    }
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
        transparent={true}
        displacementMap={depthTex}
        displacementScale={displacementScale}
        side={THREE.DoubleSide}
      />
      {/* expose lastInteract so OrbitControls can reset it */}
      <primitive object={{ _lastInteractRef: lastInteract }} attach={null} />
    </mesh>
  );
}

/* Fires onReady after textures load and first frame renders */
function SceneReady({ onReady }) {
  const fired = useRef(false);
  useFrame(() => {
    if (fired.current) return;
    fired.current = true;
    onReady?.();
  });
  return null;
}

function AutoCamera({ aspectRatio }) {
  const { camera, size } = useThree();
  useFrame(() => {
    if (camera.userData.fitted) return;
    camera.userData.fitted = true;
    const meshH = 3 / (aspectRatio || 1);
    const meshW = 3;
    const canvasAspect = size.width / size.height;
    const fovRad = (camera.fov * Math.PI) / 180;
    const fitByH = (meshH / 2 / Math.tan(fovRad / 2)) / 0.8;
    const fitByW = (meshW / (2 * Math.tan(fovRad / 2) * canvasAspect)) / 0.8;
    camera.position.z = Math.max(fitByH, fitByW);
    camera.updateProjectionMatrix();
  });
  return null;
}

function Scene({ colorURL, depthURL, displacementScale, aspectRatio, onReady }) {
  const lastInteract = useRef(-100);

  return (
    <>
      <perspectiveCamera makeDefault fov={45} near={0.1} far={100} />
      <AutoCamera aspectRatio={aspectRatio} />
      <Suspense fallback={null}>
        <ArtworkMeshWithInteract
          colorURL={colorURL}
          depthURL={depthURL}
          displacementScale={displacementScale}
          aspectRatio={aspectRatio}
          lastInteract={lastInteract}
        />
        <SceneReady onReady={onReady} />
      </Suspense>
      <OrbitControls
        enablePan enableZoom enableRotate
        minDistance={0.5} maxDistance={12}
        dampingFactor={0.05} enableDamping
        onChange={() => { lastInteract.current = performance.now() / 1000; }}
      />
    </>
  );
}

/* Wrapper that passes lastInteract ref into the mesh */
function ArtworkMeshWithInteract({ colorURL, depthURL, displacementScale, aspectRatio, lastInteract }) {
  const [colorTex, depthTex] = useTexture([colorURL, depthURL]);
  colorTex.colorSpace = THREE.SRGBColorSpace;

  const meshRef   = useRef();
  const dispRef   = useRef(displacementScale);
  dispRef.current = displacementScale;

  useFrame(({ clock }) => {
    if (!meshRef.current) return;
    const t    = clock.elapsedTime;
    const idle = Math.min((t - lastInteract.current) / 1.8, 1);

    meshRef.current.rotation.y = Math.sin(t * 0.22)        * 0.09  * idle;
    meshRef.current.rotation.x = Math.sin(t * 0.15 + 1.3) * 0.034 * idle;
    meshRef.current.rotation.z = Math.sin(t * 0.19 + 2.8) * 0.014 * idle;

    if (meshRef.current.material) {
      meshRef.current.material.displacementScale =
        dispRef.current + Math.sin(t * 0.38 + 0.9) * 0.013;
    }
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
        transparent={true}
        displacementMap={depthTex}
        displacementScale={displacementScale}
        side={THREE.DoubleSide}
      />
    </mesh>
  );
}

export default function Artwork3DViewer({ colorURL, depthURL, displacementScale, aspectRatio, onReady }) {
  return (
    <div className="absolute inset-0" style={{ background: '#0d0d0d' }}>
      <Canvas
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
