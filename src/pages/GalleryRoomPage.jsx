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
const HW     = 16.0;
const RH     = 18.0;
const EYE    = 1.5;
const GAP    = 11.0;
const FW     = 6.8;
const FH_MAX = 6.5;

/* ─── 4 distinct frame styles ─── */
const STYLES = [
  // 0 · ultra-thin black minimalist
  {
    sizeMult: 1.0, border: 0.14, depth: 0.05,
    color: '#060606', hoverColor: '#2a2a2a',
    roughness: 0.3, metalness: 0.1,
    mat: null, goldBead: false,
  },
  // 1 · dark walnut museum
  {
    sizeMult: 0.88, border: 0.56, depth: 0.1,
    color: '#2b1206', hoverColor: '#4a2410',
    roughness: 0.85, metalness: 0.02,
    mat: '#f4efe5', goldBead: false,
  },
  // 2 · warm natural oak
  {
    sizeMult: 1.06, border: 0.38, depth: 0.08,
    color: '#7a4f22', hoverColor: '#9c6e38',
    roughness: 0.9, metalness: 0.01,
    mat: '#fdfaf4', goldBead: false,
  },
  // 3 · dark ebony with gold inner bead
  {
    sizeMult: 0.95, border: 0.46, depth: 0.09,
    color: '#0e0c08', hoverColor: '#2e2a20',
    roughness: 0.4, metalness: 0.15,
    mat: '#fffdf6', goldBead: true,
  },
];

/* ─── Texture plane ─── */
function ArtImage({ url, fw, fh }) {
  const texture = useTexture(url);
  return (
    <mesh position={[0, 0, 0.068]}>
      <planeGeometry args={[fw, fh]} />
      <meshStandardMaterial map={texture} toneMapped={false} />
    </mesh>
  );
}

/* ─── Artistic frame ─── */
function Frame({ artwork, position, rotY, onSelect, styleIdx }) {
  const [hov, setHov] = useState(false);
  useEffect(() => {
    document.body.style.cursor = hov ? 'pointer' : 'auto';
    return () => { document.body.style.cursor = 'auto'; };
  }, [hov]);

  const s   = STYLES[styleIdx % 4];
  const fw  = FW * s.sizeMult;
  const fh  = Math.min(fw / (artwork.aspectRatio ?? 1.35), FH_MAX * s.sizeMult);
  const b   = s.border;

  return (
    <group
      position={position}
      rotation={[0, rotY, 0]}
      onClick={onSelect}
      onPointerOver={() => setHov(true)}
      onPointerOut={() => setHov(false)}
    >
      {/* outer frame body */}
      <mesh>
        <boxGeometry args={[fw + b, fh + b, s.depth]} />
        <meshStandardMaterial
          color={hov ? s.hoverColor : s.color}
          roughness={s.roughness}
          metalness={s.metalness}
        />
      </mesh>

      {/* gold inner bead (style 3) */}
      {s.goldBead && (
        <mesh position={[0, 0, s.depth * 0.42]}>
          <boxGeometry args={[fw + b * 0.55, fh + b * 0.55, 0.013]} />
          <meshStandardMaterial color="#c9a84c" metalness={0.88} roughness={0.22} />
        </mesh>
      )}

      {/* mat board */}
      {s.mat && (
        <mesh position={[0, 0, s.depth * 0.55]}>
          <boxGeometry args={[fw + 0.07, fh + 0.07, 0.018]} />
          <meshStandardMaterial color={s.mat} roughness={1} />
        </mesh>
      )}

      {/* artwork image */}
      <Suspense
        fallback={
          <mesh position={[0, 0, 0.068]}>
            <planeGeometry args={[fw, fh]} />
            <meshStandardMaterial color="#e8e8e8" />
          </mesh>
        }
      >
        <ArtImage url={artwork.originalURL} fw={fw} fh={fh} />
      </Suspense>

      {/* top-edge highlight */}
      <mesh position={[0, (fh + b) / 2, s.depth * 0.45]}>
        <boxGeometry args={[fw + b, 0.016, 0.016]} />
        <meshStandardMaterial color="#ffffff" roughness={0.12} metalness={0.4} opacity={0.22} transparent />
      </mesh>

      {/* hover glow outline */}
      {hov && (
        <mesh position={[0, 0, -0.008]}>
          <boxGeometry args={[fw + b + 0.06, fh + b + 0.06, 0.008]} />
          <meshStandardMaterial color="#888" opacity={0.18} transparent />
        </mesh>
      )}
    </group>
  );
}

/* ─── Label below frame ─── */
function FrameLabel({ artwork, position, rotY, styleIdx }) {
  const s  = STYLES[styleIdx % 4];
  const fw = FW * s.sizeMult;
  const fh = Math.min(fw / (artwork.aspectRatio ?? 1.35), FH_MAX * s.sizeMult);
  const y  = position[1] - (fh + s.border) / 2 - 0.48;
  return (
    <group position={[position[0], y, position[2]]} rotation={[0, rotY, 0]}>
      <Text fontSize={0.15} color="#222" anchorX="center" anchorY="top" maxWidth={fw}>
        {artwork.title ?? ''}
      </Text>
      {artwork.artist && (
        <Text position={[0, -0.22, 0]} fontSize={0.11} color="#888" anchorX="center" anchorY="top">
          {artwork.artist}
        </Text>
      )}
    </group>
  );
}

/* ─── Room shell with strong floor shadow ─── */
function RoomShell({ length }) {
  const mid = -length / 2;
  const wallMat = { color: '#ffffff', roughness: 0.95 };
  return (
    <>
      {/* walls */}
      <mesh position={[-HW, 0, mid]} rotation={[0,  Math.PI / 2, 0]}><planeGeometry args={[length, RH]} /><meshStandardMaterial {...wallMat} /></mesh>
      <mesh position={[ HW, 0, mid]} rotation={[0, -Math.PI / 2, 0]}><planeGeometry args={[length, RH]} /><meshStandardMaterial {...wallMat} /></mesh>
      <mesh position={[0, 0, -length]}><planeGeometry args={[HW * 2, RH]} /><meshStandardMaterial {...wallMat} /></mesh>
      <mesh position={[0, 0, 2.5]} rotation={[0, Math.PI, 0]}><planeGeometry args={[HW * 2, RH]} /><meshStandardMaterial {...wallMat} /></mesh>

      {/* floor — noticeable gray so edge is clear */}
      <mesh position={[0, -RH / 2, mid]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[HW * 2, length]} />
        <meshStandardMaterial color="#cccccc" roughness={0.88} />
      </mesh>

      {/* ceiling */}
      <mesh position={[0, RH / 2, mid]} rotation={[Math.PI / 2, 0, 0]}>
        <planeGeometry args={[HW * 2, length]} />
        <meshStandardMaterial color="#ffffff" roughness={1} />
      </mesh>

      {/* ── strong floor-wall shadow strips ── */}
      {/* darkest core shadow, left */}
      <mesh position={[-HW + 0.022, -RH / 2 + 0.07, mid]}>
        <boxGeometry args={[0.044, 0.14, length]} />
        <meshStandardMaterial color="#8a8a8a" roughness={1} />
      </mesh>
      {/* mid shadow, left */}
      <mesh position={[-HW + 0.06, -RH / 2 + 0.16, mid]}>
        <boxGeometry args={[0.08, 0.24, length]} />
        <meshStandardMaterial color="#aaaaaa" roughness={1} />
      </mesh>
      {/* soft edge, left */}
      <mesh position={[-HW + 0.14, -RH / 2 + 0.3, mid]}>
        <boxGeometry args={[0.14, 0.4, length]} />
        <meshStandardMaterial color="#c0c0c0" roughness={1} />
      </mesh>
      {/* darkest core shadow, right */}
      <mesh position={[HW - 0.022, -RH / 2 + 0.07, mid]}>
        <boxGeometry args={[0.044, 0.14, length]} />
        <meshStandardMaterial color="#8a8a8a" roughness={1} />
      </mesh>
      <mesh position={[HW - 0.06, -RH / 2 + 0.16, mid]}>
        <boxGeometry args={[0.08, 0.24, length]} />
        <meshStandardMaterial color="#aaaaaa" roughness={1} />
      </mesh>
      <mesh position={[HW - 0.14, -RH / 2 + 0.3, mid]}>
        <boxGeometry args={[0.14, 0.4, length]} />
        <meshStandardMaterial color="#c0c0c0" roughness={1} />
      </mesh>
      {/* back wall floor edge */}
      <mesh position={[0, -RH / 2 + 0.07, -length + 0.022]}>
        <boxGeometry args={[HW * 2, 0.14, 0.044]} />
        <meshStandardMaterial color="#8a8a8a" roughness={1} />
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
      {Array.from({ length: count }, (_, i) => (
        <mesh key={`d${i}`} position={[0, RH / 2 - 0.02, -(i * 5 + 2)]} rotation={[Math.PI / 2, 0, 0]}>
          <circleGeometry args={[0.18, 24]} />
          <meshStandardMaterial color="#e8e8e8" emissive="#ffffff" emissiveIntensity={0.6} />
        </mesh>
      ))}
    </>
  );
}

/* ─── Camera controller ─── */
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

/* ─── Main page ─── */
export default function GalleryRoomPage({ artworks, loading, onAdd, onUpdate, onSave, onDelete }) {
  const navigate  = useNavigate();
  const location  = useLocation();
  const { user }  = useAuth();

  const [targetZ,    setTargetZ]    = useState(3.5);
  const [targetYaw,  setTargetYaw]  = useState(0);
  const [showUpload, setShowUpload] = useState(false);
  const [showAuth,   setShowAuth]   = useState(false);
  const [editTarget, setEditTarget] = useState(null);

  // track if user arrived from SelectionPage "UPLOAD" card
  const fromUploadCard = useRef(!!location.state?.openUpload);

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

  // ── input handlers ──
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

  const dragging = useRef(false);
  const lastMX   = useRef(0);
  const onMouseDown = (e) => { dragging.current = true;  lastMX.current = e.clientX; };
  const onMouseMove = (e) => {
    if (!dragging.current) return;
    const dx = e.clientX - lastMX.current;
    lastMX.current = e.clientX;
    setTargetYaw(y => Math.max(-Math.PI * 0.55, Math.min(Math.PI * 0.55, y - dx * 0.004)));
  };
  const onMouseUp = () => { dragging.current = false; };

  const touchRef = useRef({ x: null, y: null });
  const onTouchStart = (e) => { touchRef.current = { x: e.touches[0].clientX, y: e.touches[0].clientY }; };
  const onTouchMove  = (e) => {
    const dx = touchRef.current.x - e.touches[0].clientX;
    const dy = touchRef.current.y - e.touches[0].clientY;
    touchRef.current = { x: e.touches[0].clientX, y: e.touches[0].clientY };
    setTargetZ(z   => Math.min(3.5, Math.max(minZ, z - dy * 0.04)));
    setTargetYaw(y => Math.max(-Math.PI * 0.55, Math.min(Math.PI * 0.55, y - dx * 0.006)));
  };

  // ── upload / auth close: return to /enter if came from selection card ──
  const handleUploadClose = () => {
    setShowUpload(false);
    if (fromUploadCard.current) {
      fromUploadCard.current = false;
      navigate('/enter');
    }
  };
  const handleAuthClose = () => {
    setShowAuth(false);
    if (fromUploadCard.current) {
      fromUploadCard.current = false;
      navigate('/enter');
    }
  };
  const handleAddSuccess = (artwork) => {
    fromUploadCard.current = false; // completed — stay in gallery
    onAdd(artwork);
  };

  const handleUpload = () => (user ? setShowUpload(true) : setShowAuth(true));
  const progress = Math.max(0, Math.min(1, (3.5 - targetZ) / (3.5 - minZ)));

  return (
    <div
      style={{ width: '100vw', height: '100vh', background: '#f0f0f0', position: 'relative', overflow: 'hidden', cursor: 'grab' }}
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
          const si = (i * 2) % 4;
          const z  = -(i * GAP + GAP);
          return <Frame key={art.id} artwork={art} position={[-HW + 0.1, EYE + 0.4, z]} rotY={Math.PI / 2} styleIdx={si} onSelect={() => navigate(`/artwork/${art.id}`)} />;
        })}
        {leftWall.map((art, i) => (
          <FrameLabel key={`ll-${art.id}`} artwork={art} position={[-HW + 0.1, EYE + 0.4, -(i * GAP + GAP)]} rotY={Math.PI / 2} styleIdx={(i * 2) % 4} />
        ))}

        {rightWall.map((art, i) => {
          const si = (i * 2 + 1) % 4;
          const z  = -(i * GAP + GAP * 1.5);
          return <Frame key={art.id} artwork={art} position={[HW - 0.1, EYE + 0.4, z]} rotY={-Math.PI / 2} styleIdx={si} onSelect={() => navigate(`/artwork/${art.id}`)} />;
        })}
        {rightWall.map((art, i) => (
          <FrameLabel key={`rl-${art.id}`} artwork={art} position={[HW - 0.1, EYE + 0.4, -(i * GAP + GAP * 1.5)]} rotY={-Math.PI / 2} styleIdx={(i * 2 + 1) % 4} />
        ))}
      </Canvas>

      {/* top bar */}
      <div style={{
        position: 'absolute', top: 0, left: 0, right: 0,
        padding: '1.25rem 2rem',
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        background: 'linear-gradient(to bottom, rgba(255,255,255,0.95) 0%, transparent 100%)',
        pointerEvents: 'none',
      }}>
        <button onClick={() => navigate('/enter')} style={{
          pointerEvents: 'all', background: 'none', border: 'none', cursor: 'pointer',
          color: '#666', fontSize: '0.72rem', letterSpacing: '0.14em', display: 'flex', alignItems: 'center', gap: '0.4rem',
        }}>
          ← DEPTH GALLERY
        </button>
        <button onClick={handleUpload} style={{ pointerEvents: 'all' }} className="upload-btn">
          <span className="upload-icon">+</span>
          {user ? 'UPLOAD WORK' : 'SIGN IN TO UPLOAD'}
        </button>
      </div>

      {/* progress bar */}
      <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: '2px', background: 'rgba(0,0,0,0.07)' }}>
        <div style={{ height: '100%', width: `${progress * 100}%`, background: 'rgba(0,0,0,0.28)', transition: 'width 0.1s' }} />
      </div>

      {/* hint */}
      <div style={{
        position: 'absolute', bottom: '1.5rem', left: '50%', transform: 'translateX(-50%)',
        color: 'rgba(0,0,0,0.28)', fontSize: '0.62rem', letterSpacing: '0.13em', pointerEvents: 'none', whiteSpace: 'nowrap',
      }}>
        SCROLL ↑↓ TO WALK · SCROLL ←→ OR DRAG TO LOOK · CLICK ARTWORK TO VIEW IN 3D
      </div>

      {/* nav arrows */}
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

      {loading && (
        <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(255,255,255,0.85)' }}>
          <p style={{ color: '#999', fontSize: '0.8rem', letterSpacing: '0.15em' }}>LOADING GALLERY...</p>
        </div>
      )}

      {showUpload && <UploadModal onClose={handleUploadClose} onAdd={handleAddSuccess} onUpdate={onUpdate} />}
      {showAuth   && <AuthModal   onClose={handleAuthClose} />}
      {editTarget && (
        <EditModal artwork={editTarget} onClose={() => setEditTarget(null)} onSave={(u) => { onSave(u); setEditTarget(null); }} />
      )}
    </div>
  );
}
