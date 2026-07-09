import { useEffect, useRef, useState } from 'react';
import { useHandTracking } from './useHandTracking';

/*
 * GestureCameraControl — floating camera window that shows the user's
 * webcam with a live hand skeleton drawn on top, detects finger gestures,
 * and reports the hand position + gesture to the parent every frame via
 * the onFrame callback. Used to drive the 3D gallery walk-through.
 *
 * onFrame({ x, y, gesture })  — x,y normalised 0..1 (x already mirrored),
 *                               gesture ∈ 'none'|'point'|'pinch'|'open'|'fist'
 */

const CONNECTIONS = [
  [0,1],[1,2],[2,3],[3,4],
  [0,5],[5,6],[6,7],[7,8],
  [5,9],[9,10],[10,11],[11,12],
  [9,13],[13,14],[14,15],[15,16],
  [13,17],[17,18],[18,19],[19,20],
  [0,17],[17,13],[13,9],[9,5],[5,0],
];

const GESTURE_COLORS = {
  pinch: '#c8a455',
  point: '#2563eb',
  open:  '#16a34a',
  fist:  '#e0a020',
  none:  'rgba(255,255,255,0.55)',
};
const GESTURE_LABELS = {
  pinch: 'PINCH · ENTER',
  point: 'POINT · STEER',
  open:  'OPEN · WALK',
  fist:  'FIST · HOLD',
  none:  '',
};

function detectGesture(lm) {
  if (!lm || lm.length < 21) return 'none';
  const pinchDist = Math.hypot(lm[4].x - lm[8].x, lm[4].y - lm[8].y);
  if (pinchDist < 0.07) return 'pinch';
  const ext = [
    lm[8].y  < lm[6].y,
    lm[12].y < lm[10].y,
    lm[16].y < lm[14].y,
    lm[20].y < lm[18].y,
  ];
  if (ext[0] && !ext[1] && !ext[2] && !ext[3]) return 'point';
  if (ext[0] && ext[1] && ext[2] && ext[3])   return 'open';
  if (!ext[0] && !ext[1] && !ext[2] && !ext[3]) return 'fist';
  return 'none';
}

export default function GestureCameraControl({ enabled, onFrame, onClose }) {
  const { status, videoRef, landmarksRef } = useHandTracking({ enabled });
  const canvasRef  = useRef(null);
  const rafRef     = useRef(0);
  const onFrameRef = useRef(onFrame);
  onFrameRef.current = onFrame;

  const [gesture, setGesture] = useState('none');
  const gestureRef = useRef('none');

  useEffect(() => {
    if (!enabled) return;
    const CW = 220, CH = 165;

    const draw = () => {
      const canvas = canvasRef.current;
      const video  = videoRef.current;
      if (!canvas || !video || video.readyState < 2) {
        rafRef.current = requestAnimationFrame(draw);
        return;
      }
      const ctx = canvas.getContext('2d');

      // mirrored camera feed
      ctx.save();
      ctx.scale(-1, 1);
      ctx.drawImage(video, -CW, 0, CW, CH);
      ctx.restore();

      // vignette
      const vg = ctx.createRadialGradient(CW/2, CH/2, CH*0.2, CW/2, CH/2, CH*0.75);
      vg.addColorStop(0, 'rgba(0,0,0,0)');
      vg.addColorStop(1, 'rgba(0,0,0,0.4)');
      ctx.fillStyle = vg;
      ctx.fillRect(0, 0, CW, CH);

      // center dead-zone guides
      ctx.strokeStyle = 'rgba(255,255,255,0.12)';
      ctx.lineWidth = 1;
      ctx.strokeRect(CW*0.32, CH*0.28, CW*0.36, CH*0.44);

      const lm = landmarksRef.current;
      const g  = detectGesture(lm);
      if (g !== gestureRef.current) { gestureRef.current = g; setGesture(g); }

      if (lm && lm.length >= 21) {
        const color = GESTURE_COLORS[g];
        // skeleton
        ctx.lineWidth = 1.6;
        ctx.strokeStyle = 'rgba(255,255,255,0.55)';
        for (const [a, b] of CONNECTIONS) {
          ctx.beginPath();
          ctx.moveTo((1-lm[a].x)*CW, lm[a].y*CH);
          ctx.lineTo((1-lm[b].x)*CW, lm[b].y*CH);
          ctx.stroke();
        }
        if (g === 'pinch') {
          ctx.strokeStyle = color; ctx.lineWidth = 2.5;
          ctx.beginPath();
          ctx.moveTo((1-lm[4].x)*CW, lm[4].y*CH);
          ctx.lineTo((1-lm[8].x)*CW, lm[8].y*CH);
          ctx.stroke();
        }
        // joints
        for (let i = 0; i < lm.length; i++) {
          const x = (1-lm[i].x)*CW, y = lm[i].y*CH;
          const isTip = [4,8,12,16,20].includes(i);
          ctx.beginPath();
          ctx.arc(x, y, isTip ? 4.5 : 2.4, 0, Math.PI*2);
          ctx.fillStyle = (i===4||i===8) ? color : isTip ? 'rgba(255,255,255,0.9)' : 'rgba(255,255,255,0.5)';
          ctx.fill();
        }
        // palm center (landmark 9), mirror x
        const palm = lm[9];
        onFrameRef.current?.({ x: 1 - palm.x, y: palm.y, gesture: g });
      } else {
        onFrameRef.current?.({ x: 0.5, y: 0.5, gesture: 'none' });
      }

      rafRef.current = requestAnimationFrame(draw);
    };
    rafRef.current = requestAnimationFrame(draw);
    return () => cancelAnimationFrame(rafRef.current);
  }, [enabled, videoRef, landmarksRef]);

  if (!enabled) return null;
  const CW = 220, CH = 165;

  return (
    <>
      <video ref={videoRef} playsInline muted
        style={{ position: 'fixed', width: 0, height: 0, opacity: 0, pointerEvents: 'none' }} />

      <div style={{
        position: 'fixed', bottom: 24, left: 24, zIndex: 50,
        display: 'flex', flexDirection: 'column', gap: 8,
      }}>
        {status === 'ready' ? (
          <div style={{
            position: 'relative', width: CW,
            borderRadius: 12, overflow: 'hidden',
            border: '1px solid rgba(255,255,255,0.2)',
            boxShadow: '0 10px 40px rgba(0,0,0,0.5)', background: '#111',
          }}>
            <canvas ref={canvasRef} width={CW} height={CH} style={{ display: 'block' }} />

            {/* LIVE */}
            <div style={{ position: 'absolute', top: 8, left: 8, display: 'flex', alignItems: 'center', gap: 5 }}>
              <div style={{ width: 6, height: 6, borderRadius: '50%', background: '#16a34a', boxShadow: '0 0 6px #16a34a', animation: 'gcPulse 2s infinite' }} />
              <span style={{ fontSize: 8, color: 'rgba(255,255,255,0.75)', letterSpacing: '0.14em', fontFamily: 'monospace' }}>LIVE · YOU</span>
            </div>

            {/* gesture label */}
            {gesture !== 'none' && (
              <div style={{
                position: 'absolute', bottom: 8, left: 8,
                background: 'rgba(0,0,0,0.65)', backdropFilter: 'blur(6px)',
                color: GESTURE_COLORS[gesture], fontSize: 8.5, fontWeight: 700,
                letterSpacing: '0.16em', padding: '3px 8px', borderRadius: 4,
                fontFamily: 'monospace',
              }}>{GESTURE_LABELS[gesture]}</div>
            )}

            {onClose && (
              <button onClick={onClose} style={{
                position: 'absolute', top: 6, right: 6,
                background: 'rgba(0,0,0,0.55)', border: 'none', color: 'rgba(255,255,255,0.8)',
                width: 18, height: 18, borderRadius: '50%', fontSize: 9, cursor: 'pointer',
              }}>✕</button>
            )}
          </div>
        ) : (
          <div style={{
            background: 'rgba(10,10,10,0.92)', backdropFilter: 'blur(10px)',
            border: '1px solid rgba(255,255,255,0.12)', color: '#fff',
            padding: '14px 18px', borderRadius: 12, fontSize: 11,
            letterSpacing: '0.05em', maxWidth: 230,
          }}>
            {status === 'initializing' && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <div style={{ width: 14, height: 14, border: '2px solid rgba(255,255,255,0.2)', borderTopColor: '#fff', borderRadius: '50%', animation: 'gcSpin 1s linear infinite' }} />
                <span style={{ opacity: 0.75 }}>Starting camera…</span>
              </div>
            )}
            {status === 'denied' && <span style={{ opacity: 0.7 }}>Camera blocked — enable it in browser settings to use hand control.</span>}
            {status === 'error'  && <span style={{ opacity: 0.7 }}>Hand tracker unavailable on this browser.</span>}
            {status === 'idle'   && <span style={{ opacity: 0.5 }}>Standby…</span>}
            {onClose && (
              <button onClick={onClose} style={{
                display: 'block', marginTop: 10, background: 'transparent',
                border: '1px solid rgba(255,255,255,0.2)', color: '#fff', fontSize: 9,
                letterSpacing: '0.18em', padding: '5px 12px', borderRadius: 99, cursor: 'pointer',
              }}>CLOSE</button>
            )}
          </div>
        )}
      </div>

      <style>{`
        @keyframes gcSpin  { to { transform: rotate(360deg); } }
        @keyframes gcPulse { 0%,100% { opacity:1; } 50% { opacity:0.35; } }
      `}</style>
    </>
  );
}
