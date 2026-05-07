import { useState, useEffect, useRef, Suspense } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { useTexture, Text } from '@react-three/drei';
import { useNavigate } from 'react-router-dom';
import * as THREE from 'three';
import { useAuth } from '../contexts/AuthContext';
import UploadModal from '../components/UploadModal';
import AuthModal from '../components/AuthModal';
import EditModal from '../components/EditModal';

/* ─── Room constants ─── */
const HW = 6.5;        // half-width of corridor
const RH = 5.0;        // room height
const EYE = 0.6;       // camera eye height offset from center
const GAP = 6.5;       // spacing between frames on same wall
const FRAME_W = 3.2;   // max frame width
const WALL_CLR = '#f8f4ee';
const FLOOR_CLR = '#c8a96e';
const FRAME_CLR = '#2a1a08';
const FRAME_HOV = '#50321a';

/* ─── Texture + artwork plane ─── */
function ArtImage({ url, fw, fh }) {
  const texture = useTexture(url);
  return (
    <mesh position={[0, 0, 0.062]}>
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
  const fw = FRAME_W;
  const fh = Math.min(fw / aspect, 2.6);
  const border = 0.26;

  return (
    <group
      position={position}
      rotation={[0, rotY, 0]}
      onClick={onSelect}
      onPointerOver={() => setHov(true)}
      onPointerOut={() => setHov(false)}
    >
      {/* wooden frame */}
      <mesh>
        <boxGeometry args={[fw + border, fh + border, 0.07]} />
        <meshStandardMaterial color={hov ? FRAME_HOV : FRAME_CLR} roughness={0.65} metalness={0.08} />
      </mesh>
      {/* cream mat */}
      <mesh position={[0, 0, 0.042]}>
        <boxGeometry args={[fw + 0.05, fh + 0.05, 0.016]} />
        <meshStandardMaterial color="#f4efe6" roughness={1} />
      </mesh>
      {/* artwork image */}
      <Suspense
        fallback={
          <mesh position={[0, 0, 0.062]}>
            <planeGeometry args={[fw, fh]} />
            <meshStandardMaterial color="#ddd5c5" />
          </mesh>
        }
      >
        <ArtImage url={artwork.originalURL} fw={fw} fh={fh} />
      </Suspense>

      {/* subtle frame gloss line top */}
      <mesh position={[0, (fh + border) / 2, 0.035]}>
        <boxGeometry args={[fw + border, 0.012, 0.012]} />
        <meshStandardMaterial color="#ffffff" roughness={0.2} metalness={0.4} opacity={0.3} transparent />
      </mesh>
    </group>
  );
}

/* ─── Title + artist label below each frame ─── */
function FrameLabel({ artwork, position, rotY }) {
  const aspect = artwork.aspectRatio ?? 1.35;
  const fh = Math.min(FRAME_W / aspect, 2.6);
  const labelY = position[1] - fh / 2 - 0.32;

  return (
    <group position={[position[0], labelY, position[2]]} rotation={[0, rotY, 0]}>
      <Text fontSize={0.13} color="#555" anchorX="center" anchorY="top" maxWidth={FRAME_W}>
        {artwork.title ?? ''}
      </Text>
      {artwork.artist ? (
        <Text position={[0, -0.19, 0]} fontSize={0.1} color="#999" anchorX="center" anchorY="top">
          {artwork.artist}
        </Text>
      ) : null}
    </group>
  );
}

/* ─── Room shell ─── */
function RoomShell({ length }) {
  const mid = -length / 2;
  return (
    <>
      {/* left wall */}
      <mesh position={[-HW, 0, mid]} rotation={[0, Math.PI / 2, 0]}>
        <planeGeometry args={[length, RH]} />
        <meshStandardMaterial color={WALL_CLR} roughness={0.92} />
      </mesh>
      {/* right wall */}
      <mesh position={[HW, 0, mid]} rotation={[0, -Math.PI / 2, 0]}>
        <planeGeometry args={[length, RH]} />
        <meshStandardMaterial color={WALL_CLR} roughness={0.92} />
      </mesh>
      {/* back wall */}
      <mesh position={[0, 0, -length]}>
        <planeGeometry args={[HW * 2, RH]} />
        <meshStandardMaterial color={WALL_CLR} roughness={0.92} />
      </mesh>
      {/* entrance wall (behind camera) */}
      <mesh position={[0, 0, 2]} rotation={[0, Math.PI, 0]}>
        <planeGeometry args={[HW * 2, RH]} />
        <meshStandardMaterial color={WALL_CLR} roughness={0.92} />
      </mesh>
      {/* floor – polished light oak */}
      <mesh position={[0, -RH / 2, mid]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[HW * 2, length]} />
        <meshStandardMaterial color={FLOOR_CLR} roughness={0.35} metalness={0.04} />
      </mesh>
      {/* ceiling – bright white */}
      <mesh position={[0, RH / 2, mid]} rotation={[Math.PI / 2, 0, 0]}>
        <planeGeometry args={[HW * 2, length]} />
        <meshStandardMaterial color="#ffffff" roughness={1} />
      </mesh>
      {/* baseboard left */}
      <mesh position={[-HW + 0.03, -RH / 2 + 0.1, mid]}>
        <boxGeometry args={[0.06, 0.2, length]} />
        <meshStandardMaterial color="#ccc3b2" roughness={0.8} />
      </mesh>
      {/* baseboard right */}
      <mesh position={[HW - 0.03, -RH / 2 + 0.1, mid]}>
        <boxGeometry args={[0.06, 0.2, length]} />
        <meshStandardMaterial color="#ccc3b2" roughness={0.8} />
      </mesh>
    </>
  );
}

/* ─── Ceiling lights (evenly spaced) ─── */
function CeilingLights({ length }) {
  const count = Math.ceil(length / 4);
  return (
    <>
      <ambientLight intensity={1.6} color="#fff9f2" />
      <directionalLight position={[0, 8, -5]} intensity={0.6} color="#fffaf5" />
      {Array.from({ length: count }, (_, i) => (
        <pointLight
          key={i}
          position={[0, RH / 2 - 0.15, -(i * 4 + 1)]}
          intensity={22}
          distance={8}
          decay={2}
          color="#fffaf2"
        />
      ))}
    </>
  );
}

/* ─── Smooth camera controller ─── */
function CameraRig({ targetZ }) {
  const { camera } = useThree();

  useEffect(() => {
    camera.position.set(0, EYE, 3.5);
    camera.lookAt(0, EYE, -10);
  }, [camera]);

  useFrame(() => {
    camera.position.z = THREE.MathUtils.lerp(camera.position.z, targetZ, 0.055);
    camera.position.y = EYE;
  });

  return null;
}

/* ─── Main page ─── */
export default function GalleryRoomPage({ artworks, loading, onAdd, onUpdate, onSave, onDelete }) {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [targetZ, setTargetZ] = useState(3.5);
  const [showUpload, setShowUpload] = useState(false);
  const [showAuth, setShowAuth] = useState(false);
  const [editTarget, setEditTarget] = useState(null);

  const leftWall = artworks.filter((_, i) => i % 2 === 0);
  const rightWall = artworks.filter((_, i) => i % 2 === 1);
  const maxSlots = Math.max(leftWall.length, rightWall.length, 1);
  const roomLength = maxSlots * GAP + GAP * 2;
  const minZ = -(roomLength - GAP);

  // scroll & keyboard navigation
  useEffect(() => {
    const onWheel = (e) => {
      e.preventDefault();
      setTargetZ((z) => Math.min(3.5, Math.max(minZ, z - e.deltaY * 0.016)));
    };
    const onKey = (e) => {
      const step = 3.5;
      if (e.key === 'ArrowUp' || e.key === 'w' || e.key === 'W')
        setTargetZ((z) => Math.max(minZ, z - step));
      if (e.key === 'ArrowDown' || e.key === 's' || e.key === 'S')
        setTargetZ((z) => Math.min(3.5, z + step));
    };
    window.addEventListener('wheel', onWheel, { passive: false });
    window.addEventListener('keydown', onKey);
    return () => {
      window.removeEventListener('wheel', onWheel);
      window.removeEventListener('keydown', onKey);
    };
  }, [minZ]);

  // touch drag navigation
  const touchStartY = useRef(null);
  const onTouchStart = (e) => { touchStartY.current = e.touches[0].clientY; };
  const onTouchMove = (e) => {
    if (touchStartY.current === null) return;
    const dy = touchStartY.current - e.touches[0].clientY;
    touchStartY.current = e.touches[0].clientY;
    setTargetZ((z) => Math.min(3.5, Math.max(minZ, z - dy * 0.04)));
  };

  const handleUpload = () => (user ? setShowUpload(true) : setShowAuth(true));

  // progress 0→1 along gallery
  const progress = (3.5 - targetZ) / (3.5 - minZ);

  return (
    <div
      style={{ width: '100vw', height: '100vh', background: '#f0ebe3', position: 'relative', overflow: 'hidden' }}
      onTouchStart={onTouchStart}
      onTouchMove={onTouchMove}
    >
      <Canvas
        camera={{ fov: 68, near: 0.05, far: 300 }}
        style={{ width: '100%', height: '100%' }}
        gl={{ antialias: true, toneMapping: THREE.ACESFilmicToneMapping, toneMappingExposure: 1.5 }}
      >
        <CameraRig targetZ={targetZ} />
        <CeilingLights length={roomLength} />

        <RoomShell length={roomLength} />

        {/* left wall frames */}
        {leftWall.map((art, i) => {
          const z = -(i * GAP + GAP);
          return (
            <Frame
              key={art.id}
              artwork={art}
              position={[-HW + 0.12, EYE + 0.25, z]}
              rotY={Math.PI / 2}
              onSelect={() => navigate(`/artwork/${art.id}`)}
            />
          );
        })}
        {leftWall.map((art, i) => (
          <FrameLabel
            key={`ll-${art.id}`}
            artwork={art}
            position={[-HW + 0.12, EYE + 0.25, -(i * GAP + GAP)]}
            rotY={Math.PI / 2}
          />
        ))}

        {/* right wall frames */}
        {rightWall.map((art, i) => {
          const z = -(i * GAP + GAP * 1.5);
          return (
            <Frame
              key={art.id}
              artwork={art}
              position={[HW - 0.12, EYE + 0.25, z]}
              rotY={-Math.PI / 2}
              onSelect={() => navigate(`/artwork/${art.id}`)}
            />
          );
        })}
        {rightWall.map((art, i) => (
          <FrameLabel
            key={`rl-${art.id}`}
            artwork={art}
            position={[HW - 0.12, EYE + 0.25, -(i * GAP + GAP * 1.5)]}
            rotY={-Math.PI / 2}
          />
        ))}
      </Canvas>

      {/* ── Overlay UI ── */}

      {/* top bar */}
      <div style={{
        position: 'absolute', top: 0, left: 0, right: 0,
        padding: '1.25rem 2rem',
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        background: 'linear-gradient(to bottom, rgba(240,235,227,0.85) 0%, transparent 100%)',
        pointerEvents: 'none',
      }}>
        <button
          onClick={() => navigate('/')}
          style={{
            pointerEvents: 'all', background: 'none', border: 'none', cursor: 'pointer',
            color: '#555', fontSize: '0.72rem', letterSpacing: '0.14em',
            display: 'flex', alignItems: 'center', gap: '0.5rem',
          }}
        >
          ← DEPTH GALLERY
        </button>
        <button
          onClick={handleUpload}
          style={{
            pointerEvents: 'all',
            background: 'rgba(30,20,10,0.08)', backdropFilter: 'blur(10px)',
            border: '1px solid rgba(30,20,10,0.15)',
            color: '#333', padding: '0.45rem 1.2rem',
            borderRadius: '9999px', fontSize: '0.72rem',
            letterSpacing: '0.1em', cursor: 'pointer',
          }}
        >
          {user ? '上传作品' : '登录 / 注册'}
        </button>
      </div>

      {/* progress bar */}
      <div style={{
        position: 'absolute', bottom: 0, left: 0, right: 0, height: '2px',
        background: 'rgba(30,20,10,0.06)',
      }}>
        <div style={{
          height: '100%', width: `${progress * 100}%`,
          background: 'rgba(255,255,255,0.4)',
          transition: 'width 0.1s',
        }} />
      </div>

      {/* hint */}
      <div style={{
        position: 'absolute', bottom: '1.5rem', left: '50%', transform: 'translateX(-50%)',
        color: 'rgba(80,60,40,0.45)', fontSize: '0.65rem', letterSpacing: '0.12em',
        pointerEvents: 'none', whiteSpace: 'nowrap',
      }}>
        SCROLL · ↑↓ TO WALK · CLICK ARTWORK TO VIEW IN 3D
      </div>

      {/* nav arrows */}
      {[
        { label: '↑', onClick: () => setTargetZ((z) => Math.max(minZ, z - 3.5)), top: '50%', transform: 'translateY(-150%)' },
        { label: '↓', onClick: () => setTargetZ((z) => Math.min(3.5, z + 3.5)), top: '50%', transform: 'translateY(50%)' },
      ].map(({ label, onClick, top, transform }) => (
        <button
          key={label}
          onClick={onClick}
          style={{
            position: 'absolute', right: '1.5rem', top,
            transform,
            background: 'rgba(30,20,10,0.07)', backdropFilter: 'blur(8px)',
            border: '1px solid rgba(30,20,10,0.15)',
            color: 'rgba(60,40,20,0.6)', width: '2.25rem', height: '2.25rem',
            borderRadius: '50%', cursor: 'pointer', fontSize: '1rem',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}
        >
          {label}
        </button>
      ))}

      {/* loading state */}
      {loading && (
        <div style={{
          position: 'absolute', inset: 0,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          background: 'rgba(13,10,7,0.8)',
        }}>
          <div style={{ color: 'rgba(255,255,255,0.5)', fontSize: '0.8rem', letterSpacing: '0.15em' }}>
            LOADING GALLERY...
          </div>
        </div>
      )}

      {/* modals */}
      {showUpload && (
        <UploadModal onClose={() => setShowUpload(false)} onAdd={onAdd} onUpdate={onUpdate} />
      )}
      {showAuth && <AuthModal onClose={() => setShowAuth(false)} />}
      {editTarget && (
        <EditModal
          artwork={editTarget}
          onClose={() => setEditTarget(null)}
          onSave={(updated) => { onSave(updated); setEditTarget(null); }}
        />
      )}
    </div>
  );
}
