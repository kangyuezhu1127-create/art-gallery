import { useMemo } from 'react';
import * as THREE from 'three';
import Painting from './Painting';

const ROOM_W = 12;
const ROOM_D = 14;
const ROOM_H = 5.6;

export default function Gallery3D({ artworks, layout, palette, aimedIdx, focus, onAim, onOpen }) {
  if (layout.kind === 'corridor') {
    return <Corridor artworks={artworks} layout={layout} palette={palette} aimedIdx={aimedIdx} focus={focus} onAim={onAim} onOpen={onOpen} />;
  }
  return <Rotunda artworks={artworks} layout={layout} palette={palette} aimedIdx={aimedIdx} focus={focus} onAim={onAim} onOpen={onOpen} />;
}

function Corridor({ artworks, layout, palette, aimedIdx, focus, onAim, onOpen }) {
  const segments = layout.segments;
  const totalLen = segments * ROOM_D;

  const slots = useMemo(() => {
    const out = [];
    for (let r = 0; r < segments; r++) {
      const z = ROOM_D / 2 - r * ROOM_D - ROOM_D / 2;
      // Left wall (faces +x)
      const iL = r * 2;
      if (iL < artworks.length) {
        out.push({ idx: iL, position: [-ROOM_W / 2 + 0.12, ROOM_H * 0.55, z], normal: [1, 0, 0] });
      }
      const iR = r * 2 + 1;
      if (iR < artworks.length) {
        out.push({ idx: iR, position: [ROOM_W / 2 - 0.12, ROOM_H * 0.55, z], normal: [-1, 0, 0] });
      }
    }
    return out;
  }, [artworks.length, segments]);

  return (
    <group>
      {/* Floor */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0, -totalLen / 2 + ROOM_D / 2]} receiveShadow>
        <planeGeometry args={[ROOM_W, totalLen]} />
        <meshStandardMaterial color={palette.floor} roughness={0.6} metalness={0.05} />
      </mesh>
      {/* Ceiling */}
      <mesh rotation={[Math.PI / 2, 0, 0]} position={[0, ROOM_H, -totalLen / 2 + ROOM_D / 2]}>
        <planeGeometry args={[ROOM_W, totalLen]} />
        <meshStandardMaterial color={palette.ceil} roughness={1} />
      </mesh>
      {/* Side walls */}
      {[-1, 1].map((side) => (
        <mesh key={side} position={[side * ROOM_W / 2, ROOM_H / 2, -totalLen / 2 + ROOM_D / 2]} castShadow receiveShadow>
          <boxGeometry args={[0.2, ROOM_H, totalLen]} />
          <meshStandardMaterial color={palette.wall} roughness={0.92} />
        </mesh>
      ))}
      {/* End walls */}
      <mesh position={[0, ROOM_H / 2, ROOM_D / 2]}>
        <boxGeometry args={[ROOM_W, ROOM_H, 0.2]} />
        <meshStandardMaterial color={palette.wall} roughness={0.92} />
      </mesh>
      <mesh position={[0, ROOM_H / 2, ROOM_D / 2 - totalLen]}>
        <boxGeometry args={[ROOM_W, ROOM_H, 0.2]} />
        <meshStandardMaterial color={palette.wall} roughness={0.92} />
      </mesh>
      {/* Doorway lintels between rooms */}
      {Array.from({ length: segments - 1 }).map((_, i) => (
        <mesh key={i} position={[0, ROOM_H - 0.3, -i * ROOM_D - ROOM_D / 2]}>
          <boxGeometry args={[ROOM_W - 4, 0.6, 0.2]} />
          <meshStandardMaterial color={palette.wall} roughness={0.92} />
        </mesh>
      ))}
      {/* Pendant lights at room centers */}
      {Array.from({ length: segments }).map((_, r) => {
        const z = ROOM_D / 2 - r * ROOM_D - ROOM_D / 2;
        return <pointLight key={r} position={[0, ROOM_H - 1.0, z]} color={0xfff1d4} intensity={0.9} distance={5} decay={1.6} />;
      })}
      {/* Paintings */}
      {slots.map((s) => (
        <Painting
          key={s.idx}
          artwork={artworks[s.idx]}
          idx={s.idx}
          position={s.position}
          normal={s.normal}
          width={1.6}
          height={2.2}
          spotIntensity={palette.spot}
          isAimed={aimedIdx === s.idx}
          anyAimed={aimedIdx != null}
          focus={focus}
          onAim={onAim}
          onOpen={onOpen}
          cameraDist={null}
        />
      ))}
    </group>
  );
}

function Rotunda({ artworks, layout, palette, aimedIdx, focus, onAim, onOpen }) {
  const segments = layout.segments;
  const radius = Math.max(8, segments * 0.7);

  const panels = useMemo(() => {
    const out = [];
    for (let i = 0; i < segments && i < artworks.length; i++) {
      const angle = (i / segments) * Math.PI * 2;
      const cx = Math.sin(angle) * radius;
      const cz = Math.cos(angle) * radius;
      const inward = new THREE.Vector3(-cx, 0, -cz).normalize();
      const anchor = new THREE.Vector3(cx, ROOM_H * 0.55, cz).addScaledVector(inward, 0.12);
      out.push({
        idx: i,
        center: [cx, ROOM_H / 2, cz],
        rotY: Math.atan2(cx, cz) + Math.PI,
        position: [anchor.x, anchor.y, anchor.z],
        normal: [inward.x, inward.y, inward.z],
      });
    }
    return out;
  }, [segments, radius, artworks.length]);

  const panelW = (Math.PI * 2 * radius) / segments * 1.02;

  return (
    <group>
      {/* Floor */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
        <circleGeometry args={[radius + 1.5, 64]} />
        <meshStandardMaterial color={palette.floor} roughness={0.6} />
      </mesh>
      {/* Dome */}
      <mesh scale={[1, 0.6, 1]}>
        <sphereGeometry args={[radius + 1.5, 48, 24, 0, Math.PI * 2, 0, Math.PI / 2]} />
        <meshStandardMaterial color={palette.ceil} roughness={1} side={THREE.BackSide} />
      </mesh>
      {/* Outer panels */}
      {panels.map((p) => (
        <mesh key={'panel-' + p.idx} position={p.center} rotation={[0, p.rotY, 0]} castShadow receiveShadow>
          <boxGeometry args={[panelW, ROOM_H, 0.2]} />
          <meshStandardMaterial color={palette.wall} roughness={0.92} />
        </mesh>
      ))}
      {/* Center column */}
      <mesh position={[0, ROOM_H / 2, 0]} castShadow receiveShadow>
        <cylinderGeometry args={[0.6, 0.7, ROOM_H, 24]} />
        <meshStandardMaterial color={palette.wall} roughness={0.92} />
      </mesh>
      {/* Center light */}
      <pointLight position={[0, ROOM_H - 0.6, 0]} color={0xfff1d4} intensity={1.4} distance={radius * 2} decay={1.4} />
      {/* Paintings */}
      {panels.map((p) => (
        <Painting
          key={p.idx}
          artwork={artworks[p.idx]}
          idx={p.idx}
          position={p.position}
          normal={p.normal}
          width={1.5}
          height={2.0}
          spotIntensity={palette.spot}
          isAimed={aimedIdx === p.idx}
          anyAimed={aimedIdx != null}
          focus={focus}
          onAim={onAim}
          onOpen={onOpen}
        />
      ))}
    </group>
  );
}
