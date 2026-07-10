import { useState, useEffect, useRef, useMemo, useCallback, memo } from 'react';
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

/* ─── Movement boundaries (keep camera inside the room) ─── */
const YAW_LIMIT = Math.PI * 0.34;  // max look-around angle (~61°) — can't spin to the void
const Z_MAX     = 2.0;             // nearest the entrance the camera may stand

/* ─── Museum-grade frame styles (MoMA / Getty / Louvre) ─────────────
 * Heavier, more ornate profiles. Flags:
 *   lip     — stepped darker outer moulding (adds carved depth)
 *   corners — protruding gold corner bosses (baroque cartouches)
 *   goldBead— bright inner bead line around the mat
 *   mat     — mat-board colour (null = none)
 *   artScale— shrink artwork inside frame to reveal a wide mat
 */
const STYLES = [
  // 0 · Ornate baroque antique gold — heavy carved (Louvre)
  {
    sizeMult: 1.02, border: 0.82, depth: 0.26,
    color: '#8f6a22', hoverColor: '#b3873a', lipColor: '#5e461a',
    roughness: 0.42, metalness: 0.88,
    mat: '#f2ecdd', goldBead: true, beadColor: '#c8a23e',
    lip: true, carved: true, artScale: 1,
  },
  // 1 · Antique deep-carved bronzed gold with mat (Getty)
  {
    sizeMult: 0.9, border: 0.98, depth: 0.3,
    color: '#6f521a', hoverColor: '#8f6c26', lipColor: '#453210',
    roughness: 0.5, metalness: 0.82,
    mat: '#efe8d8', goldBead: true, beadColor: '#b6923a',
    lip: true, carved: true, artScale: 1,
  },
  // 2 · Modern black + wide white mat (Klimt drawing / MoMA works on paper)
  {
    sizeMult: 0.82, border: 0.2, depth: 0.16,
    color: '#141414', hoverColor: '#333333', lipColor: '#0a0a0a',
    roughness: 0.5, metalness: 0.15,
    mat: '#ffffff', goldBead: false, beadColor: '#ffffff',
    lip: false, carved: false, artScale: 0.68,
  },
  // 3 · Slim warm-white modern (Mondrian / contemporary)
  {
    sizeMult: 0.8, border: 0.16, depth: 0.14,
    color: '#eae7df', hoverColor: '#ffffff', lipColor: '#d6d2c8',
    roughness: 0.85, metalness: 0.0,
    mat: null, goldBead: false, beadColor: '#ffffff',
    lip: false, carved: false, artScale: 1,
  },
  // 4 · Aged champagne gold, stepped + carved (MoMA)
  {
    sizeMult: 1.06, border: 0.6, depth: 0.22,
    color: '#a08c58', hoverColor: '#c2ac74', lipColor: '#6e5e36',
    roughness: 0.42, metalness: 0.82,
    mat: '#fbf7ee', goldBead: true, beadColor: '#c4b078',
    lip: true, carved: true, artScale: 1,
  },
  // 5 · Very heavy carved wood-gold (Louvre grand format)
  {
    sizeMult: 0.98, border: 1.12, depth: 0.36,
    color: '#5a4318', hoverColor: '#7a5c22', lipColor: '#3a2b0e',
    roughness: 0.46, metalness: 0.78,
    mat: '#fefbf3', goldBead: true, beadColor: '#c9a63e',
    lip: true, carved: true, artScale: 1,
  },
];

/* ─── Hanging variation (size + height) for gallery-wall layering ─── */
const VARIATION = [
  { y:  0.00, scale: 1.05 },
  { y:  0.75, scale: 0.68 },
  { y: -0.35, scale: 1.28 },
  { y:  0.42, scale: 0.82 },
  { y: -0.12, scale: 1.10 },
  { y:  0.55, scale: 0.74 },
];

/* ─── Procedural carved-pattern bump map ────────────────────────────
 * A single shared canvas texture that gives every gilt frame fine
 * scroll/leaf carving detail via bumpMap — no extra geometry, so it
 * costs nothing per-frame at render time. Generated lazily once.
 */
let _carvedTex = null;
function carvedBumpTexture() {
  if (_carvedTex) return _carvedTex;
  const S = 128;
  const c = document.createElement('canvas');
  c.width = c.height = S;
  const ctx = c.getContext('2d');
  ctx.fillStyle = '#808080';
  ctx.fillRect(0, 0, S, S);
  ctx.lineCap = 'round';
  const cell = 32;
  for (let gy = 0; gy < S; gy += cell) {
    for (let gx = 0; gx < S; gx += cell) {
      const cx = gx + cell / 2, cy = gy + cell / 2;
      // raised scroll (light) + recessed shadow (dark) → carved relief
      ctx.strokeStyle = '#e0e0e0'; ctx.lineWidth = 3;
      ctx.beginPath(); ctx.arc(cx, cy, 9, Math.PI * 0.15, Math.PI * 1.25); ctx.stroke();
      ctx.strokeStyle = '#3a3a3a'; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.arc(cx, cy, 9, Math.PI * 1.25, Math.PI * 2.15); ctx.stroke();
      // paired leaf flourishes
      ctx.strokeStyle = '#cfcfcf'; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.moveTo(gx, gy); ctx.quadraticCurveTo(cx, gy + 7, gx + cell, gy + 1); ctx.stroke();
      ctx.strokeStyle = '#4a4a4a'; ctx.lineWidth = 1.5;
      ctx.beginPath(); ctx.moveTo(gx, gy + 2); ctx.quadraticCurveTo(cx, gy + 10, gx + cell, gy + 3); ctx.stroke();
    }
  }
  const t = new THREE.CanvasTexture(c);
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.repeat.set(5, 5);
  _carvedTex = t;
  return t;
}

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


/* ─── Carved molding — concentric raised ridge rings on the frame face.
 * Replaces the diamond corner bosses with a repeating carved-pattern
 * profile (like real museum mouldings). Each ring = 4 thin beveled boxes.
 */
function RidgeRing({ w, h, z, thick, color, emissive }) {
  const matProps = { color, metalness: 0.9, roughness: 0.26, emissive, emissiveIntensity: 0.18 };
  return (
    <group position={[0, 0, z]}>
      {/* top / bottom rails */}
      <mesh position={[0,  h / 2, 0]}><boxGeometry args={[w + thick, thick, thick]} /><meshStandardMaterial {...matProps} /></mesh>
      <mesh position={[0, -h / 2, 0]}><boxGeometry args={[w + thick, thick, thick]} /><meshStandardMaterial {...matProps} /></mesh>
      {/* left / right rails */}
      <mesh position={[-w / 2, 0, 0]}><boxGeometry args={[thick, h - thick, thick]} /><meshStandardMaterial {...matProps} /></mesh>
      <mesh position={[ w / 2, 0, 0]}><boxGeometry args={[thick, h - thick, thick]} /><meshStandardMaterial {...matProps} /></mesh>
    </group>
  );
}

/* ─── Museum wall label — printed beside the artwork (Getty / MoMA) ───
 * troika <Text> is the most expensive thing per frame, so we use only
 * TWO text meshes per label: a header block (artist / title / medium
 * combined with newlines) and an optional description.
 */
function WallLabel({ artwork, x, halfH }) {
  const hasDesc = !!artwork.description;
  const header  = [
    artwork.artist || 'Unknown Artist',
    `${artwork.title || 'Untitled'}${artwork.year ? `, ${artwork.year}` : ''}`,
    artwork.medium || '',
  ].filter(Boolean).join('\n');

  return (
    <group position={[x, halfH * 0.35, 0.02]}>
      {/* thin accent rule */}
      <mesh position={[0, 0.32, 0]}>
        <boxGeometry args={[0.85, 0.012, 0.004]} />
        <meshBasicMaterial color="#8a8a8a" />
      </mesh>

      <Text fontSize={0.13} color="#1a1a1a" anchorX="left" anchorY="top"
        maxWidth={2.1} lineHeight={1.5} position={[0, 0.2, 0]}>
        {header}
      </Text>

      {hasDesc ? (
        <Text fontSize={0.082} color="#666" anchorX="left" anchorY="top"
          maxWidth={2.2} lineHeight={1.35} position={[0, -0.42, 0]}>
          {String(artwork.description).slice(0, 200)}
        </Text>
      ) : (
        /* reserved blank label space — faint placeholder rules (cheap boxes) */
        <group position={[0, -0.42, 0]}>
          {[0, 1, 2].map(i => (
            <mesh key={i} position={[0, -i * 0.16, 0]}>
              <boxGeometry args={[2.0 - i * 0.35, 0.008, 0.003]} />
              <meshBasicMaterial color="#cfcfcf" />
            </mesh>
          ))}
        </group>
      )}
    </group>
  );
}

/* ─── Museum-grade artistic frame with size/height variation ─── */
function Frame({ artwork, position, rotY, onSelect, styleIdx, scaleMult = 1 }) {
  const [hov, setHov] = useState(false);
  useEffect(() => {
    document.body.style.cursor = hov ? 'pointer' : 'auto';
    return () => { document.body.style.cursor = 'auto'; };
  }, [hov]);

  const s      = STYLES[styleIdx % STYLES.length];
  const fw     = FW * s.sizeMult * scaleMult;
  const fh     = Math.min(fw / (artwork.aspectRatio ?? 1.35), FH_MAX * s.sizeMult * scaleMult);
  const b      = s.border * scaleMult;

  // artwork (possibly shrunk to reveal a wide mat, e.g. works on paper)
  const artFw = fw * (s.artScale ?? 1);
  const artFh = fh * (s.artScale ?? 1);

  const halfW = (fw + b) / 2;
  const halfH = (fh + b) / 2;

  return (
    <group
      position={position}
      rotation={[0, rotY, 0]}
      onClick={onSelect}
      onPointerOver={() => setHov(true)}
      onPointerOut={() => setHov(false)}
    >
      {/* stepped darker outer lip — carved depth */}
      {s.lip && (
        <mesh position={[0, 0, -s.depth * 0.25]}>
          <boxGeometry args={[fw + b * 1.8, fh + b * 1.8, s.depth * 0.6]} />
          <meshStandardMaterial
            color={hov ? s.hoverColor : s.lipColor}
            roughness={Math.min(1, s.roughness + 0.18)}
            metalness={s.metalness * 0.85}
            emissive="#3a2a0c" emissiveIntensity={0.1}
          />
        </mesh>
      )}

      {/* outer frame body — carved-pattern bump map for fine detail */}
      <mesh>
        <boxGeometry args={[fw + b, fh + b, s.depth]} />
        <meshStandardMaterial
          color={hov ? s.hoverColor : s.color}
          roughness={s.roughness}
          metalness={s.metalness}
          emissive={s.metalness > 0.5 ? '#5c3f12' : '#000000'}
          emissiveIntensity={hov ? 0.3 : 0.1}
          bumpMap={s.carved ? carvedBumpTexture() : null}
          bumpScale={s.carved ? 0.05 : 0}
        />
      </mesh>

      {/* one raised molding step — cheap 3D carved profile (4 boxes) */}
      {s.carved && (
        <RidgeRing w={fw + b * 0.66} h={fh + b * 0.66} z={s.depth * 0.5 + 0.006}
          thick={b * 0.18} color={hov ? s.hoverColor : s.beadColor} emissive="#6e5018" />
      )}

      {/* gold inner bead (sight edge) */}
      {s.goldBead && (
        <mesh position={[0, 0, s.depth * 0.44]}>
          <boxGeometry args={[fw + b * 0.34, fh + b * 0.34, 0.013]} />
          <meshStandardMaterial
            color={s.beadColor} metalness={0.9} roughness={0.24}
            emissive="#7a5818" emissiveIntensity={0.16}
          />
        </mesh>
      )}

      {/* mat board */}
      {s.mat && (
        <mesh position={[0, 0, s.depth * 0.5]}>
          <boxGeometry args={[fw + 0.06, fh + 0.06, 0.018]} />
          <meshStandardMaterial color={s.mat} roughness={1} />
        </mesh>
      )}

      {/* artwork image */}
      <ArtImage url={artwork.originalURL} fw={artFw} fh={artFh} depth={s.depth} />

      {/* top-edge highlight */}
      <mesh position={[0, halfH, s.depth * 0.45]}>
        <boxGeometry args={[fw + b, 0.016, 0.016]} />
        <meshStandardMaterial color="#ffffff" roughness={0.12} metalness={0.4} opacity={0.22} transparent />
      </mesh>

      {/* hover glow */}
      {hov && (
        <mesh position={[0, 0, s.depth * 0.5 + 0.02]}>
          <planeGeometry args={[fw + b + 0.9, fh + b + 0.9]} />
          <meshBasicMaterial color="#d4a830" opacity={0.16} transparent depthWrite={false} />
        </mesh>
      )}

      {/* museum wall label — printed on the wall to the right of the frame */}
      <WallLabel artwork={artwork} x={halfW + 0.55} halfH={fh} />
    </group>
  );
}

/* ─── Room shell with strong floor shadow ─── */
function RoomShell({ length }) {
  const mid = -length / 2;
  const wallMat = { color: '#f4f1ea', roughness: 0.96 };  // warm gallery white
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
        <meshStandardMaterial color="#6b4e34" roughness={0.62} metalness={0.04} />
      </mesh>

      {/* wood plank seams — long strips running down the corridor */}
      {Array.from({ length: 9 }, (_, i) => {
        const x = -HW + (i + 1) * (HW * 2 / 10);
        return (
          <mesh key={`plank${i}`} position={[x, -RH / 2 + 0.01, mid]} rotation={[-Math.PI / 2, 0, 0]}>
            <planeGeometry args={[0.04, length]} />
            <meshStandardMaterial color="#4f3927" roughness={0.7} />
          </mesh>
        );
      })}

      {/* ceiling */}
      <mesh position={[0, RH / 2, mid]} rotation={[Math.PI / 2, 0, 0]}>
        <planeGeometry args={[HW * 2, length]} />
        <meshStandardMaterial color="#eceae4" roughness={1} />
      </mesh>

      {/* ── Skylight: recessed luminous glass panel down the centre ──
       * Single opaque panel set well below the ceiling (0.35 gap) so it
       * never z-fights the ceiling, and mullions sit clearly in front of
       * the panel (another 0.12 gap). No overlapping coplanar layers →
       * no strobing/flicker. */}
      <mesh position={[0, RH / 2 - 0.4, mid]} rotation={[Math.PI / 2, 0, 0]}>
        <planeGeometry args={[HW * 0.9, length - GAP]} />
        <meshBasicMaterial color="#e0eaf4" toneMapped={false} />
      </mesh>
      {/* metal mullions across the skylight (rungs), in front of the panel */}
      {Array.from({ length: Math.ceil(length / 6) }, (_, i) => (
        <mesh key={`mul${i}`} position={[0, RH / 2 - 0.28, -(i * 6 + 2)]}>
          <boxGeometry args={[HW * 0.92, 0.05, 0.06]} />
          <meshStandardMaterial color="#cfcfcb" roughness={0.6} metalness={0.3} />
        </mesh>
      ))}
      {/* two longitudinal mullions */}
      {[-HW * 0.3, HW * 0.3].map((x, i) => (
        <mesh key={`lm${i}`} position={[x, RH / 2 - 0.28, mid]}>
          <boxGeometry args={[0.06, 0.05, length - GAP]} />
          <meshStandardMaterial color="#cfcfcb" roughness={0.6} metalness={0.3} />
        </mesh>
      ))}
      {/* raised curb around the skylight well */}
      {[-HW * 0.46, HW * 0.46].map((x, i) => (
        <mesh key={`curb${i}`} position={[x, RH / 2 - 0.18, mid]}>
          <boxGeometry args={[0.12, 0.36, length - GAP]} />
          <meshStandardMaterial color="#e2e0da" roughness={1} />
        </mesh>
      ))}

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

/* ─── Lighting: cheap & warm — a few static lights, no per-segment loop ─
 * Real-time point lights are O(lights × fragments); the old per-segment
 * version created ~60 of them and tanked the frame-rate. We now rely on
 * hemisphere + directional light (which cost the same regardless of room
 * length) plus a SMALL fixed number of point lights spread down the hall.
 */
function CeilingLights({ length }) {
  // 3–5 point lights total, evenly spaced — independent of room length
  const NUM = Math.min(5, Math.max(3, Math.round(length / 24)));
  const step = length / NUM;
  return (
    <>
      {/* warm sky/ground hemisphere — the workhorse, one light for the whole room */}
      <hemisphereLight args={['#f3ecdd', '#7a5c3a', 2.6]} />
      {/* cool daylight from the skylight */}
      <directionalLight position={[0, 16, 2]} intensity={1.6} color="#dce8f5" />
      {/* warm fill from the front */}
      <directionalLight position={[6, 6, 12]} intensity={0.55} color="#ffdcae" />

      {/* a few warm accent point lights down the centre (fixed count) */}
      {Array.from({ length: NUM }, (_, i) => (
        <pointLight key={i} position={[0, RH / 2 - 1.0, -(i * step + step * 0.5)]}
          intensity={70} distance={step * 2.4} decay={2} color="#fde7c8" />
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

/* ─── Static scene (room + lights + frames) ──────────────────────────
 * Memoised so that camera movement — which updates targetZ/targetYaw
 * state on every scroll/motion tick — does NOT force react-three-fiber
 * to re-reconcile the ~200 frame/label nodes. Only re-renders when the
 * artwork list changes. This is the main scrolling-jank fix.
 */
const StaticScene = memo(function StaticScene({ leftWall, rightWall, roomLen, onFrameClick }) {
  return (
    <>
      <CeilingLights length={roomLen} />
      <RoomShell length={roomLen} />

      {leftWall.map((art, i) => {
        const si = (i * 2) % STYLES.length;
        const v  = VARIATION[i % VARIATION.length];
        const z  = -(i * GAP + GAP);
        return <Frame key={art.id} artwork={art} position={[-HW + 0.1, EYE + 0.4 + v.y, z]} rotY={Math.PI / 2} styleIdx={si} scaleMult={v.scale} onSelect={() => onFrameClick(art, z, 'left')} />;
      })}

      {rightWall.map((art, i) => {
        const si = (i * 2 + 3) % STYLES.length;
        const v  = VARIATION[(i + 3) % VARIATION.length];
        const z  = -(i * GAP + GAP * 1.5);
        return <Frame key={art.id} artwork={art} position={[HW - 0.1, EYE + 0.4 + v.y, z]} rotY={-Math.PI / 2} styleIdx={si} scaleMult={v.scale} onSelect={() => onFrameClick(art, z, 'right')} />;
      })}
    </>
  );
});

/* ─── Intro "知音" guide — control primer shown before entering the hall ── */
function IntroGuide({ onEnter }) {
  const serif = '"Fraunces", serif';
  const Item = ({ glyph, en, zh }) => (
    <div style={{ display: 'flex', gap: 14, alignItems: 'flex-start' }}>
      <span style={{ fontSize: 18, lineHeight: 1.2, width: 26, textAlign: 'center', flexShrink: 0 }}>{glyph}</span>
      <div>
        <div style={{ fontFamily: serif, fontSize: '0.95rem', color: '#1a1a1a', lineHeight: 1.35 }}>{en}</div>
        <div style={{ fontSize: '0.72rem', color: '#8a8a8a', letterSpacing: '0.02em', marginTop: 2 }}>{zh}</div>
      </div>
    </div>
  );

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 200,
      background: 'rgba(244,241,234,0.86)', backdropFilter: 'blur(16px)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      padding: '2rem', animation: 'introFade 0.5s ease both',
    }}>
      <div style={{
        maxWidth: 720, width: '100%',
        background: '#fbf9f4', border: '1px solid rgba(0,0,0,0.08)',
        borderRadius: 18, padding: 'clamp(1.8rem, 4vw, 3rem)',
        boxShadow: '0 30px 80px rgba(0,0,0,0.18)',
      }}>
        <p style={{ fontSize: '0.62rem', letterSpacing: '0.32em', color: '#a08c58', fontWeight: 700, marginBottom: 14 }}>
          WALK-IN GALLERY · 步入展厅
        </p>
        <h2 style={{ fontFamily: serif, fontSize: 'clamp(1.9rem, 4.5vw, 2.9rem)', color: '#141414', lineHeight: 1.05, marginBottom: 10 }}>
          Before you enter
        </h2>
        <p style={{ fontFamily: serif, fontStyle: 'italic', color: '#666', fontSize: '0.98rem', marginBottom: 26, maxWidth: 520 }}>
          A quiet hall of papercut works awaits. Here is how to move through it — 一座剪纸静室,请先熟悉如何漫步其间。
        </p>

        <div style={{
          display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
          gap: '1.6rem 2.4rem', marginBottom: 30,
        }}>
          {/* Manual controls */}
          <div>
            <p style={{ fontSize: '0.6rem', letterSpacing: '0.24em', color: '#1a1a1a', fontWeight: 700, marginBottom: 14, borderBottom: '1px solid rgba(0,0,0,0.1)', paddingBottom: 8 }}>
              MANUAL · 手动
            </p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 13 }}>
              <Item glyph="↕" en="Scroll to walk down the hall" zh="滚动前进 / 后退" />
              <Item glyph="↔" en="Drag or scroll sideways to look" zh="拖拽或横向滚动转向" />
              <Item glyph="◱" en="Click a work to view it in 3D" zh="点击作品进入立体视角" />
            </div>
          </div>

          {/* Motion controls */}
          <div>
            <p style={{ fontSize: '0.6rem', letterSpacing: '0.24em', color: '#1a1a1a', fontWeight: 700, marginBottom: 14, borderBottom: '1px solid rgba(0,0,0,0.1)', paddingBottom: 8 }}>
              MOTION · 体感
            </p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 13 }}>
              <Item glyph="✋" en="Toggle “Motion” — a camera window shows you & your hand" zh="开启体感,浮窗显示你与手部骨架" />
              <Item glyph="🖐" en="Move your hand to steer, raise it to walk" zh="移动手掌转向,抬手前进" />
              <Item glyph="🤏" en="Pinch to enter the nearest work" zh="捏合进入最近的作品" />
            </div>
          </div>
        </div>

        <button
          onClick={onEnter}
          style={{
            fontFamily: serif, fontSize: '0.78rem', letterSpacing: '0.22em',
            background: '#141414', color: '#fff', border: 'none',
            borderRadius: 99, padding: '0.85rem 2.2rem', cursor: 'pointer',
            display: 'inline-flex', alignItems: 'center', gap: 10,
            transition: 'transform 0.2s ease, opacity 0.2s ease',
          }}
          onMouseEnter={(e) => { e.currentTarget.style.transform = 'translateY(-1px)'; e.currentTarget.style.opacity = '0.9'; }}
          onMouseLeave={(e) => { e.currentTarget.style.transform = 'none'; e.currentTarget.style.opacity = '1'; }}
        >
          ENTER THE HALL · 进入展厅 <span style={{ fontSize: '1rem' }}>→</span>
        </button>
      </div>

      <style>{`@keyframes introFade { from { opacity: 0; } to { opacity: 1; } }`}</style>
    </div>
  );
}

/* ─── Main page ─── */
export default function GalleryRoomPage({ artworks, loading, onAdd, onUpdate, onSave, onDelete }) {
  const navigate  = useNavigate();
  const location  = useLocation();
  const { user }  = useAuth();

  const { startTransition } = useGalleryTransition();

  const [targetZ,    setTargetZ]    = useState(Z_MAX);
  const [targetYaw,  setTargetYaw]  = useState(0);
  const [zooming,    setZooming]    = useState(false);
  const [showUpload, setShowUpload] = useState(false);
  const [showAuth,   setShowAuth]   = useState(false);
  const [editTarget, setEditTarget] = useState(null);
  const [motionOn,   setMotionOn]   = useState(false);
  const [joy,        setJoy]        = useState({ x: 0, y: 0 }); // -1..1 for visual
  // Intro "知音" guide — shown once per session before entering the hall
  const [showIntro,  setShowIntro]  = useState(() => {
    try { return !sessionStorage.getItem('walkin_intro_seen'); } catch { return true; }
  });
  const dismissIntro = () => {
    try { sessionStorage.setItem('walkin_intro_seen', '1'); } catch { /* ignore */ }
    setShowIntro(false);
  };
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

  const leftWall  = useMemo(() => artworks.filter((_, i) => i % 2 === 0), [artworks]);
  const rightWall = useMemo(() => artworks.filter((_, i) => i % 2 === 1), [artworks]);
  const maxSlots  = Math.max(leftWall.length, rightWall.length, 1);
  const roomLen   = maxSlots * GAP + GAP * 2;
  const minZ      = -(roomLen - GAP);

  /* ─── cinematic transition: camera zoom + persistent artwork overlay ─── */
  const handleFrameClick = useCallback((artwork, frameZ, wallSide) => {
    if (transitionRef.current) return;
    transitionRef.current = true;
    setZooming(true);
    setTargetZ(frameZ);
    setTargetYaw(wallSide === 'left' ? Math.PI * 0.38 : -Math.PI * 0.38);
    startTransition(
      artwork.originalURL,
      () => navigate(`/artwork/${artwork.id}`, { state: { fromGallery: true } }),
    );
  }, [navigate, startTransition]);

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
        if (xf !== 0) setTargetYaw(y => Math.max(-YAW_LIMIT, Math.min(YAW_LIMIT, y - xf * 0.007)));
        if (yf !== 0) setTargetZ(z => Math.min(Z_MAX, Math.max(minZ, z + yf * 0.065)));
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
      if (Math.abs(gx) > D) setTargetYaw(y => Math.max(-YAW_LIMIT, Math.min(YAW_LIMIT, y - gx * 0.012)));
      if (Math.abs(gy) > D) setTargetZ(z => Math.min(Z_MAX, Math.max(minZ, z + gy * 0.1)));
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
      setTargetZ(z   => Math.min(Z_MAX, Math.max(minZ, z - e.deltaY * 0.016)));
      setTargetYaw(y => Math.max(-YAW_LIMIT, Math.min(YAW_LIMIT, y - e.deltaX * 0.004)));
    };
    const onKey = (e) => {
      if (transitionRef.current) return;
      if (e.key === 'ArrowUp'    || e.key === 'w') setTargetZ(z   => Math.max(minZ, z - 3.5));
      if (e.key === 'ArrowDown'  || e.key === 's') setTargetZ(z   => Math.min(Z_MAX,  z + 3.5));
      if (e.key === 'ArrowLeft'  || e.key === 'a') setTargetYaw(y => Math.min( YAW_LIMIT, y + 0.25));
      if (e.key === 'ArrowRight' || e.key === 'd') setTargetYaw(y => Math.max(-YAW_LIMIT, y - 0.25));
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
    setTargetYaw(y => Math.max(-YAW_LIMIT, Math.min(YAW_LIMIT, y - dx * 0.004)));
  };
  const onMouseUp = () => { dragging.current = false; };

  const touchRef = useRef({ x: null, y: null });
  const onTouchStart = (e) => { touchRef.current = { x: e.touches[0].clientX, y: e.touches[0].clientY }; };
  const onTouchMove  = (e) => {
    if (transitionRef.current) return;
    const dx = touchRef.current.x - e.touches[0].clientX;
    const dy = touchRef.current.y - e.touches[0].clientY;
    touchRef.current = { x: e.touches[0].clientX, y: e.touches[0].clientY };
    setTargetZ(z   => Math.min(Z_MAX, Math.max(minZ, z - dy * 0.04)));
    setTargetYaw(y => Math.max(-YAW_LIMIT, Math.min(YAW_LIMIT, y - dx * 0.006)));
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
  const progress = Math.max(0, Math.min(1, (Z_MAX - targetZ) / (Z_MAX - minZ)));

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
      if (xf !== 0) setTargetYaw(v => Math.max(-YAW_LIMIT, Math.min(YAW_LIMIT, v - xf * 0.02)));
      // hand up (y small → dy negative) walks forward into the room
      if (yf !== 0) setTargetZ(v => Math.min(Z_MAX, Math.max(minZ, v + yf * 0.14)));
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
      style={{ width: '100vw', height: '100vh', background: '#f0f0ef', position: 'relative', overflow: 'hidden', cursor: 'grab' }}
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
        dpr={[1, 1.5]}
        gl={{ antialias: true, toneMapping: THREE.ACESFilmicToneMapping, toneMappingExposure: 2.0 }}
      >
        <CameraRig targetZ={targetZ} targetYaw={targetYaw} targetFOV={zooming ? 36 : 68} />
        <StaticScene
          leftWall={leftWall}
          rightWall={rightWall}
          roomLen={roomLen}
          onFrameClick={handleFrameClick}
        />
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
            background: motionOn ? '#111' : 'transparent',
            backdropFilter: 'blur(8px)',
            border: `1px solid ${motionOn ? '#111' : 'rgba(0,0,0,0.18)'}`,
            borderRadius: 99, cursor: 'pointer',
            color: motionOn ? '#fff' : '#555',
            fontSize: '0.62rem', letterSpacing: '0.22em', fontWeight: 500,
            fontFamily: '"Fraunces", serif',
            padding: '0.4rem 1rem', display: 'flex', alignItems: 'center', gap: '0.4rem',
            transition: 'all 0.25s ease',
          }}
        >
          ✋ {motionOn ? 'Motion · On' : 'Motion'}
        </button>
      </div>

      {/* progress bar */}
      <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: '2px', background: 'rgba(0,0,0,0.07)' }}>
        <div style={{ height: '100%', width: `${progress * 100}%`, background: 'rgba(0,0,0,0.28)', transition: 'width 0.1s' }} />
      </div>

      {/* hint */}
      <div style={{
        position: 'absolute', bottom: '1.5rem', left: '50%', transform: 'translateX(-50%)',
        color: 'rgba(0,0,0,0.4)', fontSize: '0.68rem', letterSpacing: '0.14em',
        fontFamily: '"Fraunces", serif', fontStyle: 'italic',
        pointerEvents: 'none', whiteSpace: 'nowrap', transition: 'opacity 0.3s',
      }}>
        {motionOn
          ? 'Move hand to steer · raise hand to walk · pinch to enter'
          : 'Scroll to walk · drag to look · click a work to view in 3D'}
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
        { label: '↓', action: () => setTargetZ(z => Math.min(Z_MAX,  z + 3.5)), top: 'calc(50% + 0.6rem)' },
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

      {/* Intro "知音" control primer — shown once before entering the hall */}
      {showIntro && <IntroGuide onEnter={dismissIntro} />}
    </div>
  );
}
