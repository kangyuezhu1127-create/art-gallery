import { useEffect, useRef, useState } from 'react';
import { useHandTracking } from './useHandTracking';
import { useDwellSelect } from './useDwellSelect';

// MediaPipe hand skeleton connections
const CONNECTIONS = [
  [0,1],[1,2],[2,3],[3,4],
  [0,5],[5,6],[6,7],[7,8],
  [5,9],[9,10],[10,11],[11,12],
  [9,13],[13,14],[14,15],[15,16],
  [13,17],[17,18],[18,19],[19,20],
  [0,17],[17,13],[13,9],[9,5],[5,0],
];

export function detectGesture(lm) {
  if (!lm || lm.length < 21) return 'none';
  const d = Math.hypot(lm[4].x - lm[8].x, lm[4].y - lm[8].y);
  if (d < 0.07) return 'pinch';
  const ext = [
    lm[8].y < lm[6].y,
    lm[12].y < lm[10].y,
    lm[16].y < lm[14].y,
    lm[20].y < lm[18].y,
  ];
  if (ext[0] && !ext[1] && !ext[2] && !ext[3]) return 'point';
  if (ext[0] && ext[1] && ext[2] && ext[3]) return 'open';
  if (!ext[0] && !ext[1] && !ext[2] && !ext[3]) return 'fist';
  return 'none';
}

const GESTURE_LABELS = {
  pinch: 'PINCH — SELECT',
  point: 'POINT — NAVIGATE',
  open:  'OPEN — NEXT',
  fist:  'FIST — PREV',
  none:  '',
};

const GESTURE_COLORS = {
  pinch: '#D72638',
  point: '#2563eb',
  open:  '#16a34a',
  fist:  '#f59e0b',
  none:  'rgba(255,255,255,0.5)',
};

export default function HandsfreeOverlay({
  enabled,
  dwellMs    = 1200,
  selector   = '[data-gesture-target]',
  onSelect,
  onClose,
  onGesture,
}) {
  const { status, position, videoRef, landmarksRef } = useHandTracking({ enabled });
  const { dwellProgress, target } = useDwellSelect({
    position,
    dwellMs,
    selector,
    onSelect: onSelect || ((el) => el.click()),
  });

  const canvasRef  = useRef(null);
  const rafRef     = useRef(0);
  const [gesture, setGesture] = useState('none');
  const gestureRef = useRef('none');

  useEffect(() => {
    if (!target) return;
    target.setAttribute('data-gesture-hover', 'true');
    return () => target.removeAttribute('data-gesture-hover');
  }, [target]);

  // Canvas drawing loop — video frame + hand skeleton
  useEffect(() => {
    if (!enabled) return;

    const draw = () => {
      const canvas = canvasRef.current;
      const video  = videoRef.current;

      if (!canvas || !video || video.readyState < 2) {
        rafRef.current = requestAnimationFrame(draw);
        return;
      }

      const ctx = canvas.getContext('2d');
      const W = canvas.width;
      const H = canvas.height;

      // Mirror the camera feed
      ctx.save();
      ctx.scale(-1, 1);
      ctx.drawImage(video, -W, 0, W, H);
      ctx.restore();

      // Subtle vignette
      const vg = ctx.createRadialGradient(W/2, H/2, H * 0.2, W/2, H/2, H * 0.75);
      vg.addColorStop(0, 'rgba(0,0,0,0)');
      vg.addColorStop(1, 'rgba(0,0,0,0.35)');
      ctx.fillStyle = vg;
      ctx.fillRect(0, 0, W, H);

      const lm = landmarksRef.current;
      const g  = detectGesture(lm);

      if (g !== gestureRef.current) {
        gestureRef.current = g;
        setGesture(g);
        onGesture?.(g);
      }

      if (lm && lm.length >= 21) {
        const color = GESTURE_COLORS[g];

        // Skeleton connections
        ctx.lineWidth = 1.5;
        ctx.strokeStyle = 'rgba(255,255,255,0.55)';
        for (const [a, b] of CONNECTIONS) {
          ctx.beginPath();
          ctx.moveTo((1 - lm[a].x) * W, lm[a].y * H);
          ctx.lineTo((1 - lm[b].x) * W, lm[b].y * H);
          ctx.stroke();
        }

        // Pinch connection highlight
        if (g === 'pinch') {
          ctx.strokeStyle = color;
          ctx.lineWidth = 2.5;
          ctx.beginPath();
          ctx.moveTo((1 - lm[4].x) * W, lm[4].y * H);
          ctx.lineTo((1 - lm[8].x) * W, lm[8].y * H);
          ctx.stroke();
        }

        // Landmark dots
        for (let i = 0; i < lm.length; i++) {
          const x = (1 - lm[i].x) * W;
          const y = lm[i].y * H;
          const isTip = [4, 8, 12, 16, 20].includes(i);
          ctx.beginPath();
          ctx.arc(x, y, isTip ? 4.5 : 2.5, 0, Math.PI * 2);
          ctx.fillStyle = (i === 4 || i === 8) ? color : isTip ? 'rgba(255,255,255,0.9)' : 'rgba(255,255,255,0.55)';
          ctx.fill();
        }
      }

      rafRef.current = requestAnimationFrame(draw);
    };

    rafRef.current = requestAnimationFrame(draw);
    return () => cancelAnimationFrame(rafRef.current);
  }, [enabled, videoRef, landmarksRef, onGesture]);

  if (!enabled) return null;

  const CW = 200, CH = 150;

  return (
    <>
      {/* Hidden video element consumed by MediaPipe */}
      <video
        ref={videoRef}
        playsInline
        muted
        style={{ position: 'fixed', width: 0, height: 0, opacity: 0, pointerEvents: 'none' }}
      />

      {/* Camera window */}
      <div style={{
        position: 'fixed', bottom: 24, right: 24,
        zIndex: 9998,
        display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 8,
      }}>
        {status === 'ready' && (
          <div style={{
            position: 'relative', width: CW,
            borderRadius: 12, overflow: 'hidden',
            border: '1px solid rgba(255,255,255,0.18)',
            boxShadow: '0 8px 40px rgba(0,0,0,0.55)',
            background: '#111',
          }}>
            <canvas ref={canvasRef} width={CW} height={CH} style={{ display: 'block' }} />

            {/* Gesture label */}
            {gesture !== 'none' && (
              <div style={{
                position: 'absolute', bottom: 7, left: 7,
                background: 'rgba(0,0,0,0.65)',
                backdropFilter: 'blur(6px)',
                color: GESTURE_COLORS[gesture],
                fontSize: 8.5,
                fontFamily: '"Inter Tight", monospace',
                letterSpacing: '0.18em',
                fontWeight: 700,
                padding: '3px 8px',
                borderRadius: 4,
                textTransform: 'uppercase',
              }}>
                {GESTURE_LABELS[gesture]}
              </div>
            )}

            {/* Live indicator */}
            <div style={{
              position: 'absolute', top: 7, left: 7,
              display: 'flex', alignItems: 'center', gap: 5,
            }}>
              <div style={{
                width: 6, height: 6, borderRadius: '50%',
                background: '#16a34a',
                boxShadow: '0 0 6px #16a34a',
                animation: 'pulse 2s infinite',
              }} />
              <span style={{ fontSize: 8, color: 'rgba(255,255,255,0.7)', letterSpacing: '0.12em', fontFamily: '"Inter Tight", sans-serif' }}>LIVE</span>
            </div>

            {/* Close */}
            {onClose && (
              <button onClick={onClose} style={{
                position: 'absolute', top: 6, right: 6,
                background: 'rgba(0,0,0,0.55)', border: 'none',
                color: 'rgba(255,255,255,0.8)',
                width: 18, height: 18, borderRadius: '50%',
                fontSize: 9, cursor: 'pointer',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>✕</button>
            )}
          </div>
        )}

        {/* Status / loading card */}
        {status !== 'ready' && (
          <div style={{
            background: 'rgba(10,10,10,0.92)',
            backdropFilter: 'blur(10px)',
            border: '1px solid rgba(255,255,255,0.1)',
            color: '#fff',
            padding: '14px 18px',
            borderRadius: 12,
            fontSize: 11,
            letterSpacing: '0.06em',
            maxWidth: 240,
            boxShadow: '0 8px 30px rgba(0,0,0,0.4)',
          }}>
            {status === 'initializing' && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <div style={{ width: 14, height: 14, border: '2px solid rgba(255,255,255,0.2)', borderTopColor: '#fff', borderRadius: '50%', animation: 'spin 1s linear infinite', flexShrink: 0 }} />
                <p style={{ opacity: 0.75, fontSize: 11 }}>Loading hand tracker…</p>
              </div>
            )}
            {status === 'denied' && <p style={{ opacity: 0.7 }}>Enable camera in browser settings.</p>}
            {status === 'error'   && <p style={{ opacity: 0.7 }}>Hand tracker unavailable.</p>}
            {status === 'idle'    && <p style={{ opacity: 0.5 }}>Hands-free standby…</p>}
            {onClose && (
              <button onClick={onClose} style={{
                marginTop: 10, background: 'transparent',
                border: '1px solid rgba(255,255,255,0.18)',
                color: '#fff', fontSize: 9,
                letterSpacing: '0.18em', padding: '5px 12px',
                borderRadius: 99, cursor: 'pointer',
                fontFamily: '"Inter Tight", sans-serif',
                textTransform: 'uppercase',
              }}>Close</button>
            )}
          </div>
        )}
      </div>

      {/* Cursor + dwell ring */}
      {position && status === 'ready' && (
        <CursorDot
          position={position}
          dwellProgress={dwellProgress}
          armed={!!target}
          gesture={gesture}
        />
      )}

      <style>{`
        @keyframes spin   { to { transform: rotate(360deg); } }
        @keyframes pulse  { 0%,100% { opacity:1; } 50% { opacity:0.4; } }
        @keyframes scanline {
          0%   { top: -2px; }
          100% { top: 100%; }
        }
        @keyframes depthReveal {
          0%   { opacity:0; transform:scaleY(0); transform-origin:top; }
          100% { opacity:1; transform:scaleY(1); }
        }
        [data-gesture-hover="true"] {
          outline: 2px solid rgba(215,38,56,0.6);
          outline-offset: 3px;
          transition: outline 0.15s;
        }
      `}</style>
    </>
  );
}

function CursorDot({ position, dwellProgress, armed, gesture }) {
  const size  = 52;
  const r     = 20;
  const circ  = 2 * Math.PI * r;
  const color = GESTURE_COLORS[gesture] || 'rgba(255,255,255,0.85)';

  return (
    <div style={{
      position: 'fixed',
      left: position.x * window.innerWidth,
      top:  position.y * window.innerHeight,
      transform: 'translate(-50%, -50%)',
      pointerEvents: 'none',
      zIndex: 9999,
    }}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        <circle cx={size/2} cy={size/2} r={r} fill="none" stroke="rgba(255,255,255,0.15)" strokeWidth="1.5" />
        <circle
          cx={size/2} cy={size/2} r={r}
          fill="none"
          stroke={color}
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeDasharray={circ}
          strokeDashoffset={circ * (1 - dwellProgress)}
          transform={`rotate(-90 ${size/2} ${size/2})`}
          style={{ transition: 'stroke 0.2s' }}
        />
        <circle
          cx={size/2} cy={size/2}
          r={armed ? 7 : 4}
          fill={armed ? color : 'rgba(255,255,255,0.8)'}
          style={{ transition: 'r 0.12s, fill 0.2s' }}
        />
      </svg>
    </div>
  );
}
