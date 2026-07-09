import { useState, useEffect, useRef } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { Text } from '@react-three/drei';
import { useNavigate, useLocation } from 'react-router-dom';
import * as THREE from 'three';
import { useAuth } from '../contexts/AuthContext';
import { useGalleryTransition } from '../contexts/TransitionContext';
import UploadModal from '../components/UploadModal';
import AuthModal from '../components/AuthModal';
import EditModal from '../components/EditModal';
import SiteNav from '../components/SiteNav';
import GestureCameraControl from '../components/gestures/GestureCameraControl';

/* ─── Room constants ─── */
const HW     = 16.0;
const RH     = 18.0;
const EYE    = 1.5;
const GAP    = 11.0;
const FW     = 6.8;
const FH_MAX = 6.5;

/* ─── 4 gold frame styles ─── */
const STYLES = [
  // 0 · thin polished gold
  {
    sizeMult: 1.0, border: 0.16, depth: 0.06,
    color: '#c8a455', hoverColor: '#e4c060',
    roughness: 0.12, metalness: 0.95,
    mat: null, goldBead: false, beadColor: '#c9a84c',
  },
  // 1 · antique ornate gold with mat
  {
    sizeMult: 0.88, border: 0.60, depth: 0.12,
    color: '#8b6914', hoverColor: '#a07820',
    roughness: 0.42, metalness: 0.82,
    mat: '#f4efe5', goldBead: true, beadColor: '#c9a84c',
  },
  // 2 · champagne gold medium
  {
    sizeMult: 1.06, border: 0.40, depth: 0.09,
    color: '#c8a84c', hoverColor: '#d9bc5e',
    roughness: 0.28, metalness: 0.88,
    mat: '#fdfaf4', goldBead: false, beadColor: '#c9a84c',
  },
  // 3 · deep burnished gold with ornate bead
  {
    sizeMult: 0.95, border: 0.52, depth: 0.10,
    color: '#7c5e1a', hoverColor: '#9a7828',
    roughness: 0.25, metalness: 0.92,
    mat: '#fffdf6', goldBead: true, beadColor: '#e8c84a',
  },
];

/* ─── Safe texture loader — no Suspense, handles errors + oversized images ─── */
const MAX_TEX = 2048; // safe WebGL texture dimension for all devices

function loadTextureSafe(url, onLoad, onError) {
  const img = new window.Image();
  img.crossOrigin = 'anonymous';
  img.onload = () => {
    try {
      // Always route through canvas — avoids THREE.Texture(img) quirks
      // and automatically handles oversized images for all GPU limits
      const { naturalWidth: iw, naturalHeight: ih } = img;
      const scale = Math.min(1, MAX_TEX / iw, MAX_TEX / ih);
      const canvas = document.createElement('canvas');
      canvas.width  = Math.round(iw * scale);
      canvas.height = Math.round(ih * scale);
      canvas.getContext('2d').drawImage(img, 0, 0, canvas.width, canvas.height);
      const tex = new THREE.CanvasTexture(canvas);
      tex.colorSpace = THREE.SRGBColorSpace;
      onLoad(tex);
    } catch (e) { onError(e); }
  };
  img.onerror = onError;
  img.src = url;
}

/* ─── Artwork image plane — self-contained loading with retry ─── */
function ArtImage({ url, fw, fh, depth }) {
  // Place backing + artwork just in front of the frame's front face (depth/2)
  // so they're never buried inside the frame body regardless of style depth.
  const backingZ = depth / 2 + 0.008;
  const artworkZ = depth / 2 + 0.020;
  const [texture,  setTexture]  = useState(null);
  const [retries,  setRetries]  = useState(0);
  const mountedRef = useRef(true);

  useEffect(() => {
    mountedRef.current = true;
    setTexture(null);

    let timer;
    loadTextureSafe(
      url,
      (tex) => { if (mountedRef.current) setTexture(tex); },
      ()    => {
        if (retries < 3) {
          timer = setTimeout(() => {
            if (mountedRef.current) setRetries(r => r + 1);
          }, 1500 * (retries + 1));
        }
      }
    );
    return () => {
      mountedRef.current = false;
      clearTimeout(timer);
    };
  }, [url, retries]);

  return (
    <group>
      {/* backing plane — always in front of frame face, gives contrast for white-bg art */}
      <mesh position={[0, 0, backingZ]}>
        <planeGeometry args={[fw, fh]} />
        <meshStandardMaterial color="#d6d6d6" roughness={1} />
      </mesh>
      {/* artwork — appears once texture is ready */}
      {texture && (
        <mesh position={[0, 0, artworkZ]}>
          <planeGeometry args={[fw, fh]} />
          <meshStandardMaterial
            map={texture}
            toneMapped={false}
            transparent
            alphaTest={0.01}
          />
        </mesh>
      )}
    </group>
  );
}

/* ─── Gold glow aura — two translucent planes pulsing out of sync per frame ─── */
function GoldAura({ fw, fh, b, depth, zOffset }) {
  const inner = useRef();
  const outer = useRef();
  const z = depth * 0.5 + 0.012; // just in front of the frame face

  useFrame(({ clock }) => {
    // desync each frame by its world-Z so they breathe independently
    const t     = clock.elapsedTime * 0.55 + zOffset * 0.18;
    const pulse = Math.sin(t) * 0.5 + 0.5; // 0..1
    if (inner.current) inner.current.material.opacity = 0.055 + pulse * 0.038;
    if (outer.current) outer.current.material.opacity = 0.020 + pulse * 0.014;
  });

  const w = fw + b;
  const h = fh + b;
  return (
    <group>
      {/* inner halo — 0.65 units beyond frame edge on each side */}
      <mesh ref={inner} position={[0, 0, z]}>
        <planeGeometry args={[w + 0.65, h + 0.65]} />
        <meshBasicMaterial color="#c8a455" transparent depthWrite={false} />
      </mesh>
      {/* outer soft halo */}
      <mesh ref={outer} position={[0, 0, z - 0.006]}>
        <planeGeometry args={[w + 1.6, h + 1.6]} />
        <meshBasicMaterial color="#c8a455" transparent depthWrite={false} />
      </mesh>
    </group>
  );
}

/* ─── Artistic frame ─── */
function Frame({ artwork, position, rotY, onSelect, styleIdx }) {
  const [hov, setHov] = useState(false);
  useEffect(() => {
    document.body.style.cursor = hov ? 'pointer' : 'auto';
    return () => { document.body.style.cursor = 'auto'; };
  }, [hov]);

  const s      = STYLES[styleIdx % 4];
  const fw     = FW * s.sizeMult;
  const fh     = Math.min(fw / (artwork.aspectRatio ?? 1.35), FH_MAX * s.sizeMult);
  const b      = s.border;
  const zOffset = position[2]; // world-Z for glow desync

  return (
    <group
      position={position}
      rotation={[0, rotY, 0]}
      onClick={onSelect}
      onPointerOver={() => setHov(true)}
      onPointerOut={() => setHov(false)}
    >
      {/* always-on gold glow aura */}
      <GoldAura fw={fw} fh={fh} b={b} depth={s.depth} zOffset={zOffset} />

      {/* outer frame body — emissive so it glows from within */}
      <mesh>
        <boxGeometry args={[fw + b, fh + b, s.depth]} />
        <meshStandardMaterial
          color={hov ? s.hoverColor : s.color}
          roughness={s.roughness}
          metalness={s.metalness}
          emissive="#8b6020"
          emissiveIntensity={hov ? 0.45 : 0.18}
        />
      </mesh>

      {/* gold inner bead */}
      {s.goldBead && (
        <mesh position={[0, 0, s.depth * 0.42]}>
          <boxGeometry args={[fw + b * 0.55, fh + b * 0.55, 0.013]} />
          <meshStandardMaterial
            color={s.beadColor} metalness={0.88} roughness={0.22}
            emissive="#c09030" emissiveIntensity={0.25}
          />
        </mesh>
      )}

      {/* mat board */}
      {s.mat && (
        <mesh position={[0, 0, s.depth * 0.55]}>
          <boxGeometry args={[fw + 0.07, fh + 0.07, 0.018]} />
          <meshStandardMaterial color={s.mat} roughness={1} />
        </mesh>
      )}

      {/* artwork image — self-loading with error recovery */}
      <ArtImage url={artwork.originalURL} fw={fw} fh={fh} depth={s.depth} />

      {/* top-edge highlight */}
      <mesh position={[0, (fh + b) / 2, s.depth * 0.45]}>
        <boxGeometry args={[fw + b, 0.016, 0.016]} />
        <meshStandardMaterial color="#ffffff" roughness={0.12} metalness={0.4} opacity={0.22} transparent />
      </mesh>

      {/* hover: stronger gold glow outline */}
      {hov && (
        <mesh position={[0, 0, s.depth * 0.5 + 0.02]}>
          <planeGeometry args={[fw + b + 0.9, fh + b + 0.9]} />
          <meshBasicMaterial color="#d4a830" opacity={0.18} transparent depthWrite={false} />
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

      {/* floor */}
      <mesh position={[0, -RH / 2, mid]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[HW * 2, length]} />
        <meshStandardMaterial color="#cccccc" roughness={0.88} />
      </mesh>

      {/* ceiling */}
      <mesh position={[0, RH / 2, mid]} rotation={[Math.PI / 2, 0, 0]}>
        <planeGeometry args={[HW * 2, length]} />
        <meshStandardMaterial color="#ffffff" roughness={1} />
      </mesh>

      {/* floor-wall shadow strips */}
      <mesh position={[-HW + 0.022, -RH / 2 + 0.07, mid]}>
        <boxGeometry args={[0.044, 0.14, length]} />
        <meshStandardMaterial color="#8a8a8a" roughness={1} />
      </mesh>
      <mesh position={[-HW + 0.06, -RH / 2 + 0.16, mid]}>
        <boxGeometry args={[0.08, 0.24, length]} />
        <meshStandardMaterial color="#aaaaaa" roughness={1} />
      </mesh>
      <mesh position={[-HW + 0.14, -RH / 2 + 0.3, mid]}>
        <boxGeometry args={[0.14, 0.4, length]} />
        <meshStandardMaterial color="#c0c0c0" roughness={1} />
      </mesh>
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
function CameraRig({ targetZ, targetYaw, targetFOV }) {
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
    camera.fov = THREE.MathUtils.lerp(camera.fov, targetFOV, 0.06);
    camera.updateProjectionMatrix();
  });
  return null;
}

/* ─── Main page ─── */
export default function GalleryRoomPage({ artworks, loading, onAdd, onUpdate, onSave, onDelete }) {
  const navigate  = useNavigate();
  const location  = useLocation();
  const { user }  = useAuth();

  const { startTransition } = useGalleryTransition();

  const [targetZ,    setTargetZ]    = useState(3.5);
  const [targetYaw,  setTargetYaw]  = useState(0);
  const [zooming,    setZooming]    = useState(false);
  const [showUpload, setShowUpload] = useState(false);
  const [showAuth,   setShowAuth]   = useState(false);
  const [editTarget, setEditTarget] = useState(null);
  const [motionOn,   setMotionOn]   = useState(false);
  const [joy,        setJoy]        = useState({ x: 0, y: 0 }); // -1..1 for visual
  const transitionRef = useRef(false);
  const cursorRef     = useRef({ x: 0.5, y: 0.5 });
  const motionRAF     = useRef(null);

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

  /* ─── cinematic transition: camera zoom + persistent artwork overlay ─── */
  const handleFrameClick = (artwork, frameZ, wallSide) => {
    if (transitionRef.current) return;
    transitionRef.current = true;
    setZooming(true);
    setTargetZ(frameZ);
    setTargetYaw(wallSide === 'left' ? Math.PI * 0.38 : -Math.PI * 0.38);
    startTransition(
      artwork.originalURL,
      () => navigate(`/artwork/${artwork.id}`, { state: { fromGallery: true } }),
    );
  };

  /* ─── Cursor-edge motion control ─── */
  const edgeFactor = (v) => {
    const D = 0.22; // dead-zone: 0–22% and 78–100% are active
    if (v < D) return -(1 - v / D);
    if (v > 1 - D) return (v - (1 - D)) / D;
    return 0;
  };

  useEffect(() => {
    if (!motionOn) { setJoy({ x: 0, y: 0 }); return; }
    const onMove = (e) => {
      cursorRef.current = { x: e.clientX / window.innerWidth, y: e.clientY / window.innerHeight };
    };
    window.addEventListener('mousemove', onMove);
    let frame = 0;
    const tick = () => {
      if (!transitionRef.current && !dragging.current) {
        const xf = edgeFactor(cursorRef.current.x);
        const yf = edgeFactor(cursorRef.current.y);
        if (xf !== 0) setTargetYaw(y => Math.max(-Math.PI * 0.55, Math.min(Math.PI * 0.55, y - xf * 0.007)));
        if (yf !== 0) setTargetZ(z => Math.min(3.5, Math.max(minZ, z + yf * 0.065)));
        if (++frame % 3 === 0) setJoy({ x: xf, y: yf });
      }
      motionRAF.current = requestAnimationFrame(tick);
    };
    motionRAF.current = requestAnimationFrame(tick);
    return () => { window.removeEventListener('mousemove', onMove); cancelAnimationFrame(motionRAF.current); };
  }, [motionOn, minZ]);

  /* ─── Gyroscope (mobile) ─── */
  useEffect(() => {
    if (!motionOn) return;
    const handler = (e) => {
      if (transitionRef.current) return;
      const gx = Math.max(-35, Math.min(35, e.gamma ?? 0)) / 35;
      const gy = Math.max(-25, Math.min(25, (e.beta ?? 45) - 45)) / 25;
      const D = 0.15;
      if (Math.abs(gx) > D) setTargetYaw(y => Math.max(-Math.PI * 0.55, Math.min(Math.PI * 0.55, y - gx * 0.012)));
      if (Math.abs(gy) > D) setTargetZ(z => Math.min(3.5, Math.max(minZ, z + gy * 0.1)));
    };
    if (typeof DeviceOrientationEvent !== 'undefined' && typeof DeviceOrientationEvent.requestPermission === 'function') {
      DeviceOrientationEvent.requestPermission().then(p => { if (p === 'granted') window.addEventListener('deviceorientation', handler); }).catch(() => {});
    } else {
      window.addEventListener('deviceorientation', handler);
    }
    return () => window.removeEventListener('deviceorientation', handler);
  }, [motionOn, minZ]);

  // ── input handlers ──
  useEffect(() => {
    const onWheel = (e) => {
      if (transitionRef.current) return;
      e.preventDefault();
      setTargetZ(z   => Math.min(3.5, Math.max(minZ, z - e.deltaY * 0.016)));
      setTargetYaw(y => Math.max(-Math.PI * 0.55, Math.min(Math.PI * 0.55, y - e.deltaX * 0.004)));
    };
    const onKey = (e) => {
      if (transitionRef.current) return;
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
  const onMouseDown = (e) => { if (transitionRef.current) return; dragging.current = true;  lastMX.current = e.clientX; };
  const onMouseMove = (e) => {
    if (!dragging.current || transitionRef.current) return;
    const dx = e.clientX - lastMX.current;
    lastMX.current = e.clientX;
    setTargetYaw(y => Math.max(-Math.PI * 0.55, Math.min(Math.PI * 0.55, y - dx * 0.004)));
  };
  const onMouseUp = () => { dragging.current = false; };

  const touchRef = useRef({ x: null, y: null });
  const onTouchStart = (e) => { touchRef.current = { x: e.touches[0].clientX, y: e.touches[0].clientY }; };
  const onTouchMove  = (e) => {
    if (transitionRef.current) return;
    const dx = touchRef.current.x - e.touches[0].clientX;
    const dy = touchRef.current.y - e.touches[0].clientY;
    touchRef.current = { x: e.touches[0].clientX, y: e.touches[0].clientY };
    setTargetZ(z   => Math.min(3.5, Math.max(minZ, z - dy * 0.04)));
    setTargetYaw(y => Math.max(-Math.PI * 0.55, Math.min(Math.PI * 0.55, y - dx * 0.006)));
  };

  // ── upload / auth close ──
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
    fromUploadCard.current = false;
    onAdd(artwork);
  };

  const handleUpload = () => (user ? setShowUpload(true) : setShowAuth(true));
  const progress = Math.max(0, Math.min(1, (3.5 - targetZ) / (3.5 - minZ)));

  /* ─── Hand-gesture navigation (camera window drives the walk) ─── */
  const pinchCooldown = useRef(false);
  const targetZRef    = useRef(targetZ);
  targetZRef.current  = targetZ;

  const handleHandFrame = ({ x, y, gesture }) => {
    if (transitionRef.current) return;

    // Dead-zone around center; outside it steer / walk proportionally.
    const D  = 0.16;               // half-width of the neutral zone
    const dx = x - 0.5;            // -0.5..0.5
    const dy = y - 0.5;
    const xf = Math.abs(dx) > D ? (dx - Math.sign(dx) * D) / (0.5 - D) : 0;
    const yf = Math.abs(dy) > D ? (dy - Math.sign(dy) * D) / (0.5 - D) : 0;

    // Fist = hold position (brake). Otherwise steer + walk.
    if (gesture !== 'fist') {
      if (xf !== 0) setTargetYaw(v => Math.max(-Math.PI * 0.55, Math.min(Math.PI * 0.55, v - xf * 0.02)));
      // hand up (y small → dy negative) walks forward into the room
      if (yf !== 0) setTargetZ(v => Math.min(3.5, Math.max(minZ, v + yf * 0.14)));
    }
    setJoy({ x: xf, y: yf });

    // Pinch = enter the artwork nearest to the current camera position.
    if (gesture === 'pinch' && !pinchCooldown.current) {
      pinchCooldown.current = true;
      setTimeout(() => { pinchCooldown.current = false; }, 1500);
      enterNearestFrame();
    }
  };

  const enterNearestFrame = () => {
    const camZ = targetZRef.current;
    let best = null;
    leftWall.forEach((art, i) => {
      const z = -(i * GAP + GAP);
      const d = Math.abs(z - camZ);
      if (!best || d < best.d) best = { art, z, side: 'left', d };
    });
    rightWall.forEach((art, i) => {
      const z = -(i * GAP + GAP * 1.5);
      const d = Math.abs(z - camZ);
      if (!best || d < best.d) best = { art, z, side: 'right', d };
    });
    if (best && best.d < GAP * 0.9) handleFrameClick(best.art, best.z, best.side);
  };

  return (
    <div
      style={{ width: '100vw', height: '100vh', background: '#000', position: 'relative', overflow: 'hidden', cursor: 'grab' }}
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
        <CameraRig targetZ={targetZ} targetYaw={targetYaw} targetFOV={zooming ? 36 : 68} />
        <CeilingLights length={roomLen} />
        <RoomShell length={roomLen} />

        {leftWall.map((art, i) => {
          const si = (i * 2) % 4;
          const z  = -(i * GAP + GAP);
          return <Frame key={art.id} artwork={art} position={[-HW + 0.1, EYE + 0.4, z]} rotY={Math.PI / 2} styleIdx={si} onSelect={() => handleFrameClick(art, z, 'left')} />;
        })}
        {leftWall.map((art, i) => (
          <FrameLabel key={`ll-${art.id}`} artwork={art} position={[-HW + 0.1, EYE + 0.4, -(i * GAP + GAP)]} rotY={Math.PI / 2} styleIdx={(i * 2) % 4} />
        ))}

        {rightWall.map((art, i) => {
          const si = (i * 2 + 1) % 4;
          const z  = -(i * GAP + GAP * 1.5);
          return <Frame key={art.id} artwork={art} position={[HW - 0.1, EYE + 0.4, z]} rotY={-Math.PI / 2} styleIdx={si} onSelect={() => handleFrameClick(art, z, 'right')} />;
        })}
        {rightWall.map((art, i) => (
          <FrameLabel key={`rl-${art.id}`} artwork={art} position={[HW - 0.1, EYE + 0.4, -(i * GAP + GAP * 1.5)]} rotY={-Math.PI / 2} styleIdx={(i * 2 + 1) % 4} />
        ))}
      </Canvas>

      {/* Site nav — sticky over the canvas with solid white block */}
      <div style={{ position: 'absolute', top: 0, left: 0, right: 0, zIndex: 30 }}>
        <SiteNav variant="solid" />
      </div>

      {/* Gallery-specific tool chips just below the nav */}
      <div style={{
        position: 'absolute', top: '5.5rem', left: '2rem', right: '2rem', zIndex: 25,
        display: 'flex', justifyContent: 'space-between', alignItems: 'center', pointerEvents: 'none',
      }}>
        <button
          onClick={() => setMotionOn((m) => !m)}
          style={{
            pointerEvents: 'all',
            background: motionOn ? 'rgba(0,0,0,0.08)' : 'rgba(255,255,255,0.85)',
            backdropFilter: 'blur(8px)',
            border: `1px solid ${motionOn ? 'rgba(0,0,0,0.25)' : 'rgba(0,0,0,0.12)'}`,
            borderRadius: 99, cursor: 'pointer',
            color: motionOn ? '#333' : '#888',
            fontSize: '0.6rem', letterSpacing: '0.18em', fontWeight: 700,
            padding: '0.35rem 0.9rem', display: 'flex', alignItems: 'center', gap: '0.3rem',
          }}
        >
          ✋ {motionOn ? 'MOTION · ON' : 'MOTION'}
        </button>
        <button
          onClick={handleUpload}
          className="upload-btn"
          style={{ pointerEvents: 'all' }}
        >
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
        transition: 'opacity 0.3s',
      }}>
        {motionOn
          ? '✋ MOVE HAND TO STEER · RAISE HAND TO WALK · PINCH TO ENTER 3D'
          : 'SCROLL ↑↓ TO WALK · SCROLL ←→ OR DRAG TO LOOK · CLICK ARTWORK TO VIEW IN 3D'}
      </div>

      {/* Motion control visuals */}
      {motionOn && (
        <>
          {/* Edge direction arrows */}
          {[
            { pos: { top: '3.5rem', left: '50%', transform: 'translateX(-50%)' }, arrow: '▲', factor: -joy.y },
            { pos: { bottom: '3rem', left: '50%', transform: 'translateX(-50%)' }, arrow: '▼', factor: joy.y  },
            { pos: { left: '0.5rem', top: '50%', transform: 'translateY(-50%)' }, arrow: '◀', factor: -joy.x },
            { pos: { right: '0.5rem', top: '50%', transform: 'translateY(-50%)' }, arrow: '▶', factor: joy.x  },
          ].map(({ pos, arrow, factor }) => (
            <div key={arrow} style={{
              position: 'absolute', ...pos,
              fontSize: '1.1rem',
              color: '#000',
              opacity: Math.max(0.08, factor * 0.75),
              pointerEvents: 'none', zIndex: 25,
              textShadow: factor > 0.3 ? '0 0 10px rgba(0,0,0,0.4)' : 'none',
              transition: 'opacity 0.08s',
            }}>{arrow}</div>
          ))}

          {/* Joystick mini widget */}
          <div style={{
            position: 'absolute', bottom: '3.5rem', left: '1.5rem',
            width: 48, height: 48, borderRadius: '50%',
            border: '1px solid rgba(0,0,0,0.18)',
            background: 'rgba(255,255,255,0.55)',
            backdropFilter: 'blur(8px)',
            pointerEvents: 'none', zIndex: 30,
          }}>
            <div style={{ position: 'absolute', left: '50%', top: '15%', bottom: '15%', width: 1, background: 'rgba(0,0,0,0.1)', transform: 'translateX(-50%)' }} />
            <div style={{ position: 'absolute', top: '50%', left: '15%', right: '15%', height: 1, background: 'rgba(0,0,0,0.1)', transform: 'translateY(-50%)' }} />
            <div style={{
              position: 'absolute',
              width: 10, height: 10, borderRadius: '50%',
              background: (joy.x !== 0 || joy.y !== 0) ? '#c8a455' : 'rgba(0,0,0,0.3)',
              boxShadow: (joy.x !== 0 || joy.y !== 0) ? '0 0 7px rgba(200,164,85,0.7)' : 'none',
              left: `calc(50% + ${joy.x * 15}px - 5px)`,
              top:  `calc(50% + ${joy.y * 15}px - 5px)`,
              transition: 'left 0.07s, top 0.07s, background 0.1s',
            }} />
          </div>
        </>
      )}

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

      {/* Hand-gesture camera window — appears when MOTION is on */}
      <GestureCameraControl
        enabled={motionOn}
        onFrame={handleHandFrame}
        onClose={() => setMotionOn(false)}
      />

      {showUpload && <UploadModal onClose={handleUploadClose} onAdd={handleAddSuccess} onUpdate={onUpdate} />}
      {showAuth   && <AuthModal   onClose={handleAuthClose} />}
      {editTarget && (
        <EditModal artwork={editTarget} onClose={() => setEditTarget(null)} onSave={(u) => { onSave(u); setEditTarget(null); }} />
      )}
    </div>
  );
}
