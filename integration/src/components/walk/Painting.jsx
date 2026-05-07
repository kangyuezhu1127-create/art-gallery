import { useRef, useState, useEffect } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';

// One painting on a wall. Uses the artwork's depth_map_url as displacementMap
// so walking close to it makes the surface bulge — extending the project's core idea.
export default function Painting({
  artwork, idx, position, normal,
  width, height, spotIntensity,
  isAimed, anyAimed, focus,
  onAim, onOpen,
}) {
  const groupRef = useRef();
  const meshRef = useRef();
  const spotRef = useRef();
  const targetRef = useRef();
  const { camera } = useThree();

  const [colorTex, setColorTex] = useState(null);
  const [depthTex, setDepthTex] = useState(null);
  const [hovered, setHovered] = useState(false);

  // Load color + depth textures
  useEffect(() => {
    if (!artwork?.originalURL) return;
    const loader = new THREE.TextureLoader();
    loader.setCrossOrigin('anonymous');
    loader.load(artwork.originalURL, (t) => {
      t.colorSpace = THREE.SRGBColorSpace;
      setColorTex(t);
    });
  }, [artwork?.originalURL]);

  useEffect(() => {
    if (!artwork?.depthMapURL) return;
    const loader = new THREE.TextureLoader();
    loader.setCrossOrigin('anonymous');
    loader.load(artwork.depthMapURL, (t) => setDepthTex(t));
  }, [artwork?.depthMapURL]);

  // Orient group so plane faces along normal
  useEffect(() => {
    if (!groupRef.current) return;
    groupRef.current.position.set(...position);
    const target = new THREE.Vector3(...position).add(new THREE.Vector3(...normal));
    groupRef.current.lookAt(target);
  }, [position, normal]);

  // Spot lerp + dynamic displacement scale
  useFrame((state, dt) => {
    if (!spotRef.current) return;
    const dx = position[0] - camera.position.x;
    const dz = position[2] - camera.position.z;
    const dist = Math.hypot(dx, dz);
    const baseFalloff = THREE.MathUtils.clamp(1 - (dist - 4) / 18, 0.3, 1);

    let target = spotIntensity * baseFalloff;
    if (anyAimed) {
      target = isAimed
        ? spotIntensity * (1 + 0.6 * focus)
        : spotIntensity * (1 - 0.85 * focus) * baseFalloff;
    }
    spotRef.current.intensity += (target - spotRef.current.intensity) * Math.min(1, dt * 6);

    // Depth bulge ramps up as you approach
    if (meshRef.current && meshRef.current.material) {
      const closeness = THREE.MathUtils.clamp(1 - (dist - 1.5) / 4, 0, 1);
      const targetScale = isAimed ? 0.18 * closeness : 0.06 * closeness;
      const curr = meshRef.current.material.displacementScale ?? 0;
      meshRef.current.material.displacementScale = curr + (targetScale - curr) * Math.min(1, dt * 4);
    }
  });

  const aspect = artwork?.aspectRatio || width / height;
  // Honor the artwork's aspect ratio: keep height fixed, derive width
  const w = Math.min(width, height * aspect);
  const h = w / aspect;

  return (
    <>
      <group ref={groupRef}>
        {/* Frame */}
        <mesh position={[0, 0, 0]} castShadow receiveShadow>
          <boxGeometry args={[w + 0.18, h + 0.18, 0.06]} />
          <meshStandardMaterial color="#111" roughness={0.4} metalness={0.4} />
        </mesh>
        {/* Canvas (the artwork itself) */}
        <mesh
          ref={meshRef}
          position={[0, 0, 0.04]}
          receiveShadow
          onPointerOver={(e) => { e.stopPropagation(); setHovered(true); onAim?.(idx); }}
          onPointerOut={() => { setHovered(false); onAim?.((cur) => (cur === idx ? null : cur)); }}
          onClick={(e) => { e.stopPropagation(); onOpen?.(idx); }}
        >
          <planeGeometry args={[w, h, 128, 128]} />
          {colorTex ? (
            <meshStandardMaterial
              map={colorTex}
              color="#000"
              emissive="#fff"
              emissiveMap={colorTex}
              displacementMap={depthTex || null}
              displacementScale={0}
              roughness={0.78}
              transparent
              side={THREE.FrontSide}
            />
          ) : (
            <meshStandardMaterial color="#171413" roughness={0.9} />
          )}
        </mesh>
        {/* Caption strip below (number + title) */}
        <mesh position={[0, -h / 2 - 0.18, 0.05]}>
          <planeGeometry args={[w * 0.9, 0.04]} />
          <meshBasicMaterial color="#666" transparent opacity={0.5} />
        </mesh>
      </group>

      {/* Spotlight (in world space, aimed at the painting) */}
      <object3D ref={targetRef} position={position} />
      <spotLight
        ref={spotRef}
        position={[
          position[0] + normal[0] * 1.6,
          position[1] + 1.8,
          position[2] + normal[2] * 1.6,
        ]}
        target={targetRef.current || undefined}
        color={0xfff1d4}
        intensity={spotIntensity}
        distance={9.5}
        angle={Math.PI / 7}
        penumbra={0.55}
        decay={1.4}
        castShadow
      />
    </>
  );
}
