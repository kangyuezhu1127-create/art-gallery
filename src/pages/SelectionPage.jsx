import { useState, useRef, useEffect, Suspense } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { useTexture } from '@react-three/drei';
import { useNavigate } from 'react-router-dom';
import * as THREE from 'three';

/* mirrors GalleryRoomPage constants */
const HW     = 16.0;
const RH     = 18.0;
const EYE    = 1.5;
const GAP    = 11.0;
const FW     = 6.8;
const FH_MAX = 6.5;

/* ── minimal frame for background ── */
function BGFrame({ url, aspectRatio, position, rotY }) {
  const texture = useTexture(url);
  const fh = Math.min(FW / (aspectRatio ?? 1.35), FH_MAX);
  return (
    <group position={position} rotation={[0, rotY, 0]}>
      <mesh>
        <boxGeometry args={[FW + 0.42, fh + 0.42, 0.08]} />
        <meshStandardMaterial color="#1a1008" roughness={0.6} />
      </mesh>
      <mesh position={[0, 0, 0.065]}>
        <planeGeometry args={[FW, fh]} />
        <meshStandardMaterial map={texture} toneMapped={false} />
      </mesh>
    </group>
  );
}

/* ── slowly drifting camera ── */
function DriftCamera() {
  const { camera } = useThree();
  const t = useRef(0);
  useEffect(() => {
    camera.rotation.order = 'YXZ';
    camera.position.set(0, EYE, 1.5);
    camera.rotation.set(0, 0, 0);
  }, [camera]);
  useFrame((_, dt) => {
    t.current += dt * 0.06;
    camera.position.z = 1.5 - t.current * 1.2;
    camera.rotation.y = Math.sin(t.current * 0.35) * 0.06;
    camera.position.y = EYE + Math.sin(t.current * 0.25) * 0.025;
  });
  return null;
}

/* ── background room shell ── */
function BGRoom({ length }) {
  const mid = -length / 2;
  const w = { color: '#ffffff', roughness: 0.95 };
  return (
    <>
      <ambientLight intensity={3.5} color="#ffffff" />
      {Array.from({ length: Math.ceil(length / 5) }, (_, i) => (
        <pointLight key={i} position={[0, RH / 2 - 0.3, -(i * 5 + 2)]} intensity={90} distance={20} decay={2} color="#ffffff" />
      ))}
      <mesh position={[-HW, 0, mid]} rotation={[0,  Math.PI / 2, 0]}><planeGeometry args={[length, RH]} /><meshStandardMaterial {...w} /></mesh>
      <mesh position={[ HW, 0, mid]} rotation={[0, -Math.PI / 2, 0]}><planeGeometry args={[length, RH]} /><meshStandardMaterial {...w} /></mesh>
      <mesh position={[0, 0, -length]}><planeGeometry args={[HW * 2, RH]} /><meshStandardMaterial {...w} /></mesh>
      <mesh position={[0, -RH / 2, mid]} rotation={[-Math.PI / 2, 0, 0]}><planeGeometry args={[HW * 2, length]} /><meshStandardMaterial color="#f4f4f4" roughness={0.88} /></mesh>
      <mesh position={[0,  RH / 2, mid]} rotation={[ Math.PI / 2, 0, 0]}><planeGeometry args={[HW * 2, length]} /><meshStandardMaterial color="#ffffff" roughness={1} /></mesh>
    </>
  );
}

/* ── glass option card ── */
function OptionCard({ icon, title, subtitle, onClick }) {
  const [hov, setHov] = useState(false);
  return (
    <div
      onClick={onClick}
      onMouseEnter={() => setHov(true)}
      onMouseLeave={() => setHov(false)}
      style={{
        background: hov ? 'rgba(255,255,255,0.92)' : 'rgba(255,255,255,0.55)',
        backdropFilter: 'blur(24px)',
        WebkitBackdropFilter: 'blur(24px)',
        border: `1px solid ${hov ? 'rgba(255,255,255,0.95)' : 'rgba(255,255,255,0.7)'}`,
        borderRadius: '1.75rem',
        padding: '2.8rem 3.2rem',
        cursor: 'pointer',
        minWidth: '230px',
        textAlign: 'center',
        transform: hov ? 'scale(1.05) translateY(-6px)' : 'scale(1) translateY(0)',
        transition: 'all 0.35s cubic-bezier(0.34, 1.56, 0.64, 1)',
        boxShadow: hov
          ? '0 24px 64px rgba(0,0,0,0.13), 0 0 0 1px rgba(255,255,255,0.7)'
          : '0 8px 32px rgba(0,0,0,0.07)',
        userSelect: 'none',
      }}
    >
      <div style={{
        fontSize: '2rem', marginBottom: '1.1rem',
        opacity: hov ? 1 : 0.55,
        transition: 'opacity 0.3s',
      }}>
        {icon}
      </div>
      <div style={{
        fontSize: '0.75rem', letterSpacing: '0.2em', fontWeight: 700,
        color: '#111', marginBottom: '0.45rem',
      }}>
        {title}
      </div>
      <div style={{ fontSize: '0.7rem', color: '#999', letterSpacing: '0.05em' }}>
        {subtitle}
      </div>
    </div>
  );
}

/* ── main page ── */
export default function SelectionPage({ artworks }) {
  const navigate   = useNavigate();
  const leftWall   = artworks.filter((_, i) => i % 2 === 0);
  const rightWall  = artworks.filter((_, i) => i % 2 === 1);
  const maxSlots   = Math.max(leftWall.length, rightWall.length, 1);
  const roomLen    = maxSlots * GAP + GAP * 2;

  return (
    <div style={{ width: '100vw', height: '100vh', position: 'relative', overflow: 'hidden' }}>

      {/* ── blurred gallery background ── */}
      <div style={{
        position: 'absolute', inset: 0,
        filter: 'blur(14px) brightness(1.05)',
        transform: 'scale(1.06)',
        pointerEvents: 'none',
      }}>
        <Canvas
          camera={{ fov: 75, near: 0.05, far: 400 }}
          style={{ width: '100%', height: '100%' }}
          gl={{ antialias: false, toneMapping: THREE.ACESFilmicToneMapping, toneMappingExposure: 2.0 }}
        >
          <DriftCamera />
          <BGRoom length={roomLen} />
          <Suspense fallback={null}>
            {leftWall.map((art, i) => (
              <BGFrame key={art.id} url={art.originalURL} aspectRatio={art.aspectRatio} position={[-HW + 0.12, EYE + 0.4, -(i * GAP + GAP)]} rotY={Math.PI / 2} />
            ))}
            {rightWall.map((art, i) => (
              <BGFrame key={art.id} url={art.originalURL} aspectRatio={art.aspectRatio} position={[HW - 0.12, EYE + 0.4, -(i * GAP + GAP * 1.5)]} rotY={-Math.PI / 2} />
            ))}
          </Suspense>
        </Canvas>
      </div>

      {/* ── frosted overlay ── */}
      <div style={{ position: 'absolute', inset: 0, background: 'rgba(255,255,255,0.28)', pointerEvents: 'none' }} />

      {/* ── logo top-left ── */}
      <div style={{
        position: 'absolute', top: '2rem', left: '2.5rem',
        fontSize: '0.7rem', letterSpacing: '0.14em', color: 'rgba(0,0,0,0.45)',
        display: 'flex', alignItems: 'center', gap: '0.5rem',
      }}>
        <svg width="14" height="12" viewBox="0 0 14 12" fill="none">
          <path d="M7 1L13 11H1L7 1Z" stroke="currentColor" strokeWidth="1.1" fill="none" />
        </svg>
        DEPTH GALLERY
      </div>

      {/* ── floating option cards ── */}
      <div style={{
        position: 'absolute', inset: 0,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        gap: '1.75rem',
      }}>
        <OptionCard
          icon="⊕"
          title="UPLOAD"
          subtitle="Add your artwork to the gallery"
          onClick={() => navigate('/gallery', { state: { openUpload: true } })}
        />
        <OptionCard
          icon="→"
          title="EXPLORE GALLERY"
          subtitle="Browse the archived collection"
          onClick={() => navigate('/gallery')}
        />
      </div>

      {/* ── back hint ── */}
      <div style={{
        position: 'absolute', bottom: '2rem', left: '50%', transform: 'translateX(-50%)',
        fontSize: '0.62rem', letterSpacing: '0.12em', color: 'rgba(0,0,0,0.28)',
        cursor: 'pointer',
      }} onClick={() => navigate('/')}>
        ← BACK TO HOME
      </div>
    </div>
  );
}
