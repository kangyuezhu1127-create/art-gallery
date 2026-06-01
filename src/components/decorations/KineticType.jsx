import { useRef, useMemo } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { Text } from '@react-three/drei';
import * as THREE from 'three';

/**
 * KineticType — a cylindrical kinetic typography background, inspired by
 * Kiel Mutschelknaus' Space Type Generator (spacetypegenerator.com).
 *
 * The text is repeated `count` times around a cylinder of given `radius`,
 * stacked across `rows` rows with vertical `offset`, each row rotated by
 * `rotatePerRow` degrees. The whole group auto-spins, with a slight wave
 * deformation. PRIDE mode colors each letter on a rainbow.
 *
 * Defaults mirror the screenshot's "Depth Gallery" preset:
 *   Radius 188, Count 9, Rotate -5, Offset 1.13,
 *   Wave Count 3, Latitude 122, Y-Scale 2,
 *   Type X-Scale 20, Y-Scale 40, Weight 2,
 *   Tweak Y-rot 7, Z-rot 20,
 *   Camera X-rot 15, Z-rot -1
 */

function Letters({
  text = 'depth gallery ',
  radius = 3.8,
  count = 9,            // times around the cylinder
  rows = 7,             // vertical stack
  rowOffset = 0.45,     // vertical spacing
  rotatePerRow = -5,    // degrees per row
  letterX = 0.4,        // X scale (letter width)
  letterY = 0.75,       // Y scale (letter height)
  weight = 700,         // font weight
  waveLatitude = 1.22,  // amplitude of vertical wave (in units)
  pride = true,         // rainbow colors
  baseColor = '#0a0a0a',
}) {
  const groupRef = useRef();

  // Build the letter list once
  const letters = useMemo(() => {
    const list = [];
    const sequence = text.repeat(count);
    const total = sequence.length;
    const angleStep = (Math.PI * 2) / total;

    for (let r = 0; r < rows; r++) {
      const rowY = (r - (rows - 1) / 2) * rowOffset;
      const rowRotateRad = (rotatePerRow * Math.PI / 180) * r;

      for (let i = 0; i < total; i++) {
        const angle = i * angleStep + rowRotateRad;
        const x = Math.cos(angle) * radius;
        const z = Math.sin(angle) * radius;
        const yaw = -angle + Math.PI / 2; // face outward

        const char = sequence[i];
        list.push({
          char,
          position: [x, rowY, z],
          rotation: [0, yaw, 0],
          // PRIDE: rainbow distributed across full ring per row,
          // with a slight phase shift per row
          hue: ((i / total) + r * 0.07) % 1,
          rowIdx: r,
          colIdx: i,
        });
      }
    }
    return list;
  }, [text, radius, count, rows, rowOffset, rotatePerRow]);

  useFrame(({ clock }) => {
    if (!groupRef.current) return;
    const t = clock.getElapsedTime();
    groupRef.current.rotation.y = t * 0.12;          // slow spin
    // Subtle wave breathing — modulate group Y a touch
    groupRef.current.position.y = Math.sin(t * 0.3) * 0.08;
  });

  const colorFor = (hue) => {
    if (!pride) return baseColor;
    const c = new THREE.Color();
    c.setHSL(hue, 0.9, 0.55);
    return c.getStyle();
  };

  // Pre-tilt group by tweak rotations from screenshot:
  // Tweak Y-rot 7 (deg) ≈ 0.122 rad, Z-rot 20 ≈ 0.349 rad
  return (
    <group ref={groupRef} rotation={[0, 0.122, 0.349]}>
      {letters.map((l, idx) => {
        // wave deformation across columns to give "latitude 122" feel
        const waveY = Math.sin((l.colIdx / 6) + l.rowIdx * 0.5) * waveLatitude * 0.18;
        return (
          <Text
            key={idx}
            position={[l.position[0], l.position[1] + waveY, l.position[2]]}
            rotation={l.rotation}
            fontSize={letterY}
            color={colorFor(l.hue)}
            anchorX="center"
            anchorY="middle"
            font={undefined}                 // drei default (Inter)
            fontWeight={weight}
            scale={[letterX / 0.5, 1, 1]}    // letter X-scale
          >
            {l.char}
          </Text>
        );
      })}
    </group>
  );
}

export default function KineticTypeBackground({
  text = 'depth gallery ',
  className = '',
  pride = true,
  ...letterProps
}) {
  return (
    <div
      className={`absolute inset-0 pointer-events-none ${className}`}
      aria-hidden
    >
      <Canvas
        camera={{ position: [0, 0, 6.5], fov: 55, rotation: [0.262, 0, -0.017] }}
        dpr={[1, 2]}
        gl={{ alpha: true, antialias: true }}
        style={{ background: 'transparent' }}
      >
        {/* Soft ambient so letters render evenly */}
        <ambientLight intensity={1} />
        <Letters text={text} pride={pride} {...letterProps} />
      </Canvas>
    </div>
  );
}
