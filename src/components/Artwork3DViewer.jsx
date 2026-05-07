import { useRef, Suspense } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { OrbitControls, useTexture } from '@react-three/drei';
import * as THREE from 'three';

function ArtworkMesh({ colorURL, depthURL, displacementScale, aspectRatio }) {
  const [colorTex, depthTex] = useTexture([colorURL, depthURL]);
  colorTex.colorSpace = THREE.SRGBColorSpace;
  const meshRef = useRef();

  useFrame((state) => {
    if (!meshRef.current) return;
    meshRef.current.rotation.y = Math.sin(state.clock.elapsedTime * 0.3) * 0.05;
  });

  const w = 3;
  const h = w / (aspectRatio || 1);

  return (
    <mesh ref={meshRef}>
      <planeGeometry args={[w, h, 256, 256]} />
      {/* emissiveMap renders the texture without any lighting math — exact color match */}
      <meshStandardMaterial
        color="#000000"
        emissive="#ffffff"
        emissiveMap={colorTex}
        displacementMap={depthTex}
        displacementScale={displacementScale}
        side={THREE.DoubleSide}
      />
    </mesh>
  );
}

// Auto-fit camera so artwork fills ~80% of the viewport on first load
function AutoCamera({ aspectRatio }) {
  const { camera, size } = useThree();

  useFrame(() => {
    // Run once to position camera
    if (camera.userData.fitted) return;
    camera.userData.fitted = true;

    const meshH = 3 / (aspectRatio || 1);
    const meshW = 3;
    const canvasAspect = size.width / size.height;

    // Pick the dimension that constrains the view
    const fovRad = (camera.fov * Math.PI) / 180;
    const fitByHeight = (meshH / 2 / Math.tan(fovRad / 2)) / 0.8;
    const fitByWidth = (meshW / (2 * Math.tan(fovRad / 2) * canvasAspect)) / 0.8;
    camera.position.z = Math.max(fitByHeight, fitByWidth);
    camera.updateProjectionMatrix();
  });

  return null;
}

function Scene({ colorURL, depthURL, displacementScale, aspectRatio }) {
  return (
    <>
      <perspectiveCamera makeDefault fov={45} near={0.1} far={100} />
      <AutoCamera aspectRatio={aspectRatio} />
      <Suspense fallback={null}>
        <ArtworkMesh
          colorURL={colorURL}
          depthURL={depthURL}
          displacementScale={displacementScale}
          aspectRatio={aspectRatio}
        />
      </Suspense>
      <OrbitControls
        enablePan
        enableZoom
        enableRotate
        minDistance={0.5}
        maxDistance={12}
        dampingFactor={0.05}
        enableDamping
      />
    </>
  );
}

export default function Artwork3DViewer({ colorURL, depthURL, displacementScale, aspectRatio }) {
  return (
    <div className="absolute inset-0">
      <Canvas
        gl={{ antialias: true, toneMapping: THREE.NoToneMapping, outputColorSpace: THREE.SRGBColorSpace }}
        dpr={[1, 2]}
        camera={{ fov: 45, near: 0.1, far: 100, position: [0, 0, 5] }}
        style={{ width: '100%', height: '100%' }}
      >
        <Scene
          colorURL={colorURL}
          depthURL={depthURL}
          displacementScale={displacementScale}
          aspectRatio={aspectRatio}
        />
      </Canvas>
    </div>
  );
}
