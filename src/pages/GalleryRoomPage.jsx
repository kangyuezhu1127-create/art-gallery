import { useState, useEffect, useRef, Suspense } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { useTexture, Text } from '@react-three/drei';
import { useNavigate, useLocation } from 'react-router-dom';
import * as THREE from 'three';
import { useAuth } from '../contexts/AuthContext';
import UploadModal from '../components/UploadModal';
import AuthModal from '../components/AuthModal';
import EditModal from '../components/EditModal';

/* ─── Room constants ─── */
const HW     = 16.0;  // corridor half-width (doubled)
const RH     = 18.0;  // room height (tall gallery)
const EYE    = 1.5;   // camera eye Y
const GAP    = 11.0;  // frame spacing along wall
const FW     = 6.8;   // frame width
const FH_MAX = 6.5;   // max frame height (independent of room)
const WALL   = '#ffffff';
const FLOOR  = '#f4f4f4';  // very subtle off-white to separate floor from walls
const FRAME  = '#1a1008';
const FRAME_H= '#3d2510';

/* ─── Artwork texture plane ─── */
function ArtImage({ url, fw, fh }) {
  const texture = useTexture(url);
  return (
    <mesh position={[0, 0, 0.065]}>
      <planeGeometry args={[fw, fh]} />
      <meshStandardMaterial map={texture} toneMapped={false} />
    </mesh>
  );
}

/* ─── Single framed artwork ─── */
function Frame({ artwork, position, rotY, onSelect }) {
  const [hov, setHov] = useState(false);
  useEffect(() => {
    document.body.style.cursor = hov ? 'pointer' : 'auto';
    return () => { document.body.style.cursor = 'auto'; };
  }, [hov]);

  const aspect = artwork.aspectRatio ?? 1.35;
  const fw = FW;
  const fh = Math.min(fw / aspect, FH_MAX);
  const b  = 0.42; // border thickness

  return (
    <group
      position={position}
      rotation={[0, rotY, 0]}
      onClick={onSelect}
      onPointerOver={() => setHov(true)}
      onPointerOut={() => setHov(false)}
    >
      {/* outer frame */}
      <mesh>
        <boxGeometry args={[fw + b, fh + b, 0.08]} />
        <meshStandardMaterial color={hov ? FRAME_H : FRAME} roughness={0.6} metalness={0.1} />
      </mesh>
      {/* white mat board */}
      <mesh position={[0, 0, 0.045]}>
        <boxGeometry args={[fw + 0.06, fh + 0.06, 0.016]} />
        <meshStandardMaterial color="#ffffff" roughness={1} />
      </mesh>
      {/* artwork */}
      <Suspense
        fallback={
          <mesh position={[0, 0, 0.065]}>
            <planeGeometry args={[fw, fh]} />
            <meshStandardMaterial color="#ececec" />
          </mesh>
        }
      >
        <ArtImage url={artwork.originalURL} fw={fw} fh={fh} />
      </Suspense>
      {/* top-edge gloss */}
      <mesh position={[0, (fh + b) / 2, 0.04]}>
        <boxGeometry args={[fw + b, 0.014, 0.014]} />
        <meshStandardMaterial color="#ffffff" roughness={0.15} metalness={0.3} opacity={0.25} transparent />
      </mesh>
    </group>
  );
}

/* ─── Label below frame ─── */
function FrameLabel({ artwork, position, rotY }) {
  const fh = Math.min(FW / (artwork.aspectRatio ?? 1.35), FH_MAX);
  const y  = position[1] - fh / 2 - 0.5;
  return (
    <group position={[position[0], y, position[2]]} rotation={[0, rotY, 0]}>
      <Text fontSize={0.16} color="#333" anchorX="center" anchorY="top" maxWidth={FW}>
        {artwork.title ?? ''}
      </Text>
      {artwork.artist && (
        <Text position={[0, -0.24, 0]} fontSize={0.12} color="#888" anchorX="center" anchorY="top">
          {artwork.artist}
        </Text>
      )}
    </group>
  );
}

/* ─── Room shell ─── */
function RoomShell({ length }) {
  const mid = -length / 2;
  const mat = { color: WALL, roughness: 0.95 };
  return (
    <>
      <mesh position={[-HW, 0, mid]} rotation={[0,  Math.PI / 2, 0]}><planeGeometry args={[length, RH]} /><meshStandardMaterial {...mat} /></mesh>
      <mesh position={[ HW, 0, mid]} rotation={[0, -Math.PI / 2, 0]}><planeGeometry args={[length, RH]} /><meshStandardMaterial {...mat} /></mesh>
      <mesh position={[0, 0, -length]}><planeGeometry args={[HW * 2, RH]} /><meshStandardMaterial {...mat} /></mesh>
      <mesh position={[0, 0, 2.5]} rotation={[0, Math.PI, 0]}><planeGeometry args={[HW * 2, RH]} /><meshStandardMaterial {...mat} /></mesh>
      {/* floor – very light gray so you can see the edge */}
      <mesh position={[0, -RH / 2, mid]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[HW * 2, length]} />
        <meshStandardMaterial color={FLOOR} roughness={0.88} />
      </mesh>
      {/* ceiling */}
      <mesh position={[0, RH / 2, mid]} rotation={[Math.PI / 2, 0, 0]}>
        <planeGeometry args={[HW * 2, length]} />
        <meshStandardMaterial color="#ffffff" roughness={1} />
      </mesh>
      {/* subtle shadow strip at floor-wall junction left */}
      <mesh position={[-HW + 0.015, -RH / 2 + 0.06, mid]}>
        <boxGeometry args={[0.03, 0.12, length]} />
        <meshStandardMaterial color="#e0e0e0" roughness={1} />
      </mesh>
      {/* subtle shadow strip at floor-wall junction right */}
      <mesh position={[HW - 0.015, -RH / 2 + 0.06, mid]}>
        <boxGeometry args={[0.03, 0.12, length]} />
        <meshStandardMaterial color="#e0e0e0" roughness={1} />
      </mesh>
      {/* floor-back-wall edge */}
      <mesh position={[0, -RH / 2 + 0.06, -length + 0.015]}>
        <boxGeometry args={[HW * 2, 0.12, 0.03]} />
        <meshStandardMaterial color="#e0e0e0" roughness={1} />
      </mesh>
    </>
  );
}

/* ─── Ceiling lights ─── */
function CeilingLights({ length }) {
  const count = Math.ceil(length / 5);
  return (
    <>
      <ambientLight intensity={3.5} color="#ffffff" />
      <directionalLight position={[0, 14, 2]} intensity={1.0} color="#ffffff" />
      {Array.from({ length: count }, (_, i) => (
        <pointLight key={i} position={[0, RH / 2 - 0.3, -(i * 5 + 2)]} intensity={90} distance={20} decay={2} color="#ffffff" />
      ))}
      {/* recessed light discs (visual only) */}
      {Array.from({ length: count }, (_, i) => (
        <mesh key={`disc-${i}`} position={[0, RH / 2 - 0.02, -(i * 5 + 2)]} rotation={[Math.PI / 2, 0, 0]}>
          <circleGeometry args={[0.18, 24]} />
          <meshStandardMaterial color="#e8e8e8" emissive="#ffffff" emissiveIntensity={0.6} />
        </mesh>
      ))}
    </>
  );
}

/* ─── Camera controller (Z movement + Y rotation) ─── */
function CameraRig({ targetZ, targetYaw }) {
  const { camera } = useThree();

  useEffect(() => {
    camera.rotation.order = 'YXZ';
    camera.position.set(0, EYE, 3.5);
    camera.rotation.set(0, 0, 0);
  }, [camera]);

  useFrame(() => {
    camera.position.z = THREE.MathUtils.lerp(camera.position.z, targetZ,   0.055);
    camera.position.y = EYE;
    camera.rotation.y = THREE.MathUtils.lerp(camera.rotation.y, targetYaw, 0.07);
  });

  return null;
}

/* ─── Main gallery room page ─── */
export default function GalleryRoomPage({ artworks, loading, onAdd, onUpdate, onSave, onDelete }) {
  const navigate  = useNavigate();
  const location  = useLocation();
  const { user }  = useAuth();
  const [targetZ,   setTargetZ]   = useState(3.5);
  const [targetYaw, setTargetYaw] = useState(0);
  const [showUpload, setShowUpload] = useState(false);
  const [showAuth,   setShowAuth]   = useState(false);
  const [editTarget, setEditTarget] = useState(null);

  // auto-open upload/auth when coming from SelectionPage "UPLOAD" card
  useEffect(() => {
    if (location.state?.openUpload) {
      user ? setShowUpload(true) : setShowAuth(true);
    }
  }, []);

  const leftWall  = artworks.filter((_, i) => i % 2 === 0);
  const rightWall = artworks.filter((_, i) => i % 2 === 1);
  const maxSlots  = Math.max(leftWall.length, rightWall.length, 1);
  const roomLen   = maxSlots * GAP + GAP * 2;
  const minZ      = -(roomLen - GAP);

  // ── Wheel: vertical = move, horizontal = rotate ──
  useEffect(() => {
    const onWheel = (e) => {
      e.preventDefault();
      setTargetZ(z   => Math.min(3.5, Math.max(minZ, z - e.deltaY * 0.016)));
      setTargetYaw(y => Math.max(-Math.PI * 0.55, Math.min(Math.PI * 0.55, y - e.deltaX * 0.004)));
    };
    const onKey = (e) => {
      if (e.key === 'ArrowUp'    || e.key === 'w') setTargetZ(z   => Math.max(minZ, z - 3.5));
      if (e.key === 'ArrowDown'  || e.key === 's') setTargetZ(z   => Math.min(3.5,  z + 3.5));
      if (e.key === 'ArrowLeft'  || e.key === 'a') setTargetYaw(y => Math.min( Math.PI * 0.55, y + 0.25));
      if (e.key === 'ArrowRight' || e.key === 'd') setTargetYaw(y => Math.max(-Math.PI * 0.55, y - 0.25));
    };
    window.addEventListener('wheel', onWheel, { passive: false });
    window.addEventListener('keydown', onKey);
    return () => { window.removeEventListener('wheel', onWheel); window.removeEventListener('keydown', onKey); };
  }, [minZ]);

  // ── Mouse drag: rotate ──
  const dragging  = useRef(false);
  const lastMX    = useRef(0);
  const onMouseDown = (e) => { dragging.current = true;  lastMX.current = e.clientX; };
  const onMouseMove = (e) => {
    if (!dragging.current) return;
    const dx = e.clientX - lastMX.current;
    lastMX.current = e.clientX;
    setTargetYaw(y => Math.max(-Math.PI * 0.55, Math.min(Math.PI * 0.55, y - dx * 0.004)));
  };
  const onMouseUp = () => { dragging.current = false; };

  // ── Touch: X → rotate, Y → move ──
  const touchRef = useRef({ x: null, y: null });
  const onTouchStart = (e) => { touchRef.current = { x: e.touches[0].clientX, y: e.touches[0].clientY }; };
  const onTouchMove  = (e) => {
    const dx = touchRef.current.x - e.touches[0].clientX;
    const dy = touchRef.current.y - e.touches[0].clientY;
    touchRef.current = { x: e.touches[0].clientX, y: e.touches[0].clientY };
    setTargetZ(z   => Math.min(3.5, Math.max(minZ, z - dy * 0.04)));
    setTargetYaw(y => Math.max(-Math.PI * 0.55, Math.min(Math.PI * 0.55, y - dx * 0.006)));
  };

  const handleUpload = () => (user ? setShowUpload(true) : setShowAuth(true));
  const progress = Math.max(0, Math.min(1, (3.5 - targetZ) / (3.5 - minZ)));

  return (
    <div
      style={{ width: '100vw', height: '100vh', background: '#f8f8f8', position: 'relative', overflow: 'hidden', cursor: 'grab' }}
      onMouseDown={onMouseDown}
      onMouseMove={onMouseMove}
      onMouseUp={onMouseUp}
      onMouseLeave={onMouseUp}
      onTouchStart={onTouchStart}
      onTouchMove={onTouchMove}
    >
      <Canvas
        camera={{ fov: 68, near: 0.05, far: 400 }}
        style={{ width: '100%', height: '100%' }}
        gl={{ antialias: true, toneMapping: THREE.ACESFilmicToneMapping, toneMappingExposure: 2.0 }}
      >
        <CameraRig targetZ={targetZ} targetYaw={targetYaw} />
        <CeilingLights length={roomLen} />
        <RoomShell length={roomLen} />

        {leftWall.map((art, i) => {
          const z = -(i * GAP + GAP);
          return <Frame key={art.id} artwork={art} position={[-HW + 0.12, EYE + 0.4, z]} rotY={Math.PI / 2} onSelect={() => navigate(`/artwork/${art.id}`)} />;
        })}
        {leftWall.map((art, i) => (
          <FrameLabel key={`ll-${art.id}`} artwork={art} position={[-HW + 0.12, EYE + 0.4, -(i * GAP + GAP)]} rotY={Math.PI / 2} />
        ))}

        {rightWall.map((art, i) => {
          const z = -(i * GAP + GAP * 1.5);
          return <Frame key={art.id} artwork={art} position={[HW - 0.12, EYE + 0.4, z]} rotY={-Math.PI / 2} onSelect={() => navigate(`/artwork/${art.id}`)} />;
        })}
        {rightWall.map((art, i) => (
          <FrameLabel key={`rl-${art.id}`} artwork={art} position={[HW - 0.12, EYE + 0.4, -(i * GAP + GAP * 1.5)]} rotY={-Math.PI / 2} />
        ))}
      </Canvas>

      {/* ── Top bar ── */}
      <div style={{
        position: 'absolute', top: 0, left: 0, right: 0,
        padding: '1.25rem 2rem',
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        background: 'linear-gradient(to bottom, rgba(255,255,255,0.95) 0%, transparent 100%)',
        pointerEvents: 'none',
      }}>
        <button
          onClick={() => navigate('/')}
          style={{
            pointerEvents: 'all', background: 'none', border: 'none', cursor: 'pointer',
            color: '#666', fontSize: '0.72rem', letterSpacing: '0.14em', display: 'flex', alignItems: 'center', gap: '0.4rem',
          }}
        >
          ← DEPTH GALLERY
        </button>

        {/* Upload button — prominent + animated */}
        <button
          onClick={handleUpload}
          style={{ pointerEvents: 'all' }}
          className="upload-btn"
        >
          <span className="upload-icon">+</span>
          {user ? 'UPLOAD WORK' : 'SIGN IN TO UPLOAD'}
        </button>
      </div>

      {/* ── Progress bar ── */}
      <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: '2px', background: 'rgba(0,0,0,0.06)' }}>
        <div style={{ height: '100%', width: `${progress * 100}%`, background: 'rgba(0,0,0,0.25)', transition: 'width 0.1s' }} />
      </div>

      {/* ── Hint ── */}
      <div style={{
        position: 'absolute', bottom: '1.5rem', left: '50%', transform: 'translateX(-50%)',
        color: 'rgba(0,0,0,0.3)', fontSize: '0.62rem', letterSpacing: '0.13em', pointerEvents: 'none', whiteSpace: 'nowrap',
      }}>
        SCROLL ↑↓ TO WALK · SCROLL ←→ OR DRAG TO LOOK · CLICK ARTWORK TO VIEW IN 3D
      </div>

      {/* ── Nav arrows ── */}
      {[
        { label: '↑', action: () => setTargetZ(z => Math.max(minZ, z - 3.5)), top: 'calc(50% - 2.8rem)' },
        { label: '↓', action: () => setTargetZ(z => Math.min(3.5,  z + 3.5)), top: 'calc(50% + 0.6rem)' },
      ].map(({ label, action, top }) => (
        <button key={label} onClick={action} style={{
          position: 'absolute', right: '1.5rem', top,
          background: 'rgba(0,0,0,0.06)', border: '1px solid rgba(0,0,0,0.12)',
          color: 'rgba(0,0,0,0.4)', width: '2.2rem', height: '2.2rem',
          borderRadius: '50%', cursor: 'pointer', fontSize: '1rem',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          backdropFilter: 'blur(6px)',
        }}>
          {label}
        </button>
      ))}

      {/* ── Loading ── */}
      {loading && (
        <div style={{
          position: 'absolute', inset: 0,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          background: 'rgba(255,255,255,0.85)',
        }}>
          <p style={{ color: '#999', fontSize: '0.8rem', letterSpacing: '0.15em' }}>LOADING GALLERY...</p>
        </div>
      )}

      {/* ── Modals ── */}
      {showUpload && <UploadModal onClose={() => setShowUpload(false)} onAdd={onAdd} onUpdate={onUpdate} />}
      {showAuth   && <AuthModal   onClose={() => setShowAuth(false)} />}
      {editTarget && (
        <EditModal
          artwork={editTarget}
          onClose={() => setEditTarget(null)}
          onSave={(u) => { onSave(u); setEditTarget(null); }}
        />
      )}
    </div>
  );
}
