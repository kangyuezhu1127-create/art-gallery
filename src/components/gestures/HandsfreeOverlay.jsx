import { useEffect } from 'react';
import { useHandTracking } from './useHandTracking';
import { useDwellSelect } from './useDwellSelect';

/**
 * HandsfreeOverlay — drop-in component that:
 *   1. initialises hand tracking when `enabled`
 *   2. renders a glowing cursor at the user's hand position
 *   3. visualises a dwell-progress ring while hovering any element with
 *      [data-gesture-target]
 *   4. calls onSelect(target) when dwell completes (default: click target)
 *   5. shows a small camera preview & status hint in the bottom-right
 *
 * Smoothly fades cursor in/out so dropouts feel calm, not glitchy.
 */
export default function HandsfreeOverlay({
  enabled,
  dwellMs       = 1500,
  selector      = '[data-gesture-target]',
  onSelect,
  showPreview   = true,
  onClose,
}) {
  const { status, position, videoRef } = useHandTracking({ enabled });
  const { dwellProgress, target }      = useDwellSelect({
    position,
    dwellMs,
    selector,
    onSelect: onSelect || ((el) => el.click()),
  });

  // Briefly highlight the target while dwelling, then clean up
  useEffect(() => {
    if (!target) return;
    target.setAttribute('data-gesture-hover', 'true');
    return () => target.removeAttribute('data-gesture-hover');
  }, [target]);

  if (!enabled) return null;

  return (
    <>
      {/* Hidden-but-mounted video for MediaPipe; preview is a CSS reflection */}
      <video
        ref={videoRef}
        playsInline
        muted
        style={{
          position: 'fixed',
          bottom: 16,
          right: 16,
          width: showPreview && status === 'ready' ? 112 : 0,
          height: showPreview && status === 'ready' ? 84 : 0,
          objectFit: 'cover',
          borderRadius: 10,
          transform: 'scaleX(-1)',  // mirror for selfie feel
          border: '1px solid rgba(255,255,255,0.15)',
          boxShadow: '0 6px 20px rgba(0,0,0,0.4)',
          zIndex: 9998,
          transition: 'width 0.25s, height 0.25s',
          pointerEvents: 'none',
        }}
      />

      {/* Status / permission card */}
      {status !== 'ready' && (
        <div
          style={{
            position: 'fixed',
            bottom: 24,
            right: 24,
            zIndex: 9999,
            background: 'rgba(15,15,18,0.92)',
            backdropFilter: 'blur(8px)',
            border: '1px solid rgba(255,255,255,0.12)',
            color: '#fff',
            padding: '12px 16px',
            borderRadius: 12,
            fontSize: 12,
            letterSpacing: '0.05em',
            maxWidth: 280,
            boxShadow: '0 8px 30px rgba(0,0,0,0.4)',
          }}
        >
          {status === 'initializing' && (
            <>
              <p style={{ marginBottom: 4, fontWeight: 600 }}>👋 Hands-free</p>
              <p style={{ opacity: 0.7 }}>Loading hand tracker…</p>
            </>
          )}
          {status === 'denied' && (
            <>
              <p style={{ marginBottom: 4, fontWeight: 600 }}>Camera permission needed</p>
              <p style={{ opacity: 0.7 }}>
                Enable camera in your browser&apos;s site permissions to use
                hands-free mode. Video stays in your browser — never uploaded.
              </p>
            </>
          )}
          {status === 'error' && (
            <>
              <p style={{ marginBottom: 4, fontWeight: 600 }}>Hands-free unavailable</p>
              <p style={{ opacity: 0.7 }}>Your browser couldn&apos;t initialise the hand tracker.</p>
            </>
          )}
          {status === 'idle' && (
            <p style={{ opacity: 0.7 }}>Hands-free standby…</p>
          )}
          {onClose && (
            <button
              onClick={onClose}
              style={{
                marginTop: 8,
                background: 'transparent',
                border: '1px solid rgba(255,255,255,0.18)',
                color: '#fff',
                fontSize: 10,
                letterSpacing: '0.18em',
                padding: '5px 10px',
                borderRadius: 99,
                cursor: 'pointer',
              }}
            >
              CLOSE
            </button>
          )}
        </div>
      )}

      {/* Cursor + dwell ring */}
      {position && status === 'ready' && (
        <CursorDot
          position={position}
          dwellProgress={dwellProgress}
          armed={!!target}
        />
      )}

      {/* Highlight style for the currently-targeted element */}
      <style>{`
        [data-gesture-hover="true"] {
          outline: 2px solid rgba(124, 58, 237, 0.65);
          outline-offset: 4px;
          transition: outline 0.15s ease;
        }
      `}</style>
    </>
  );
}

function CursorDot({ position, dwellProgress, armed }) {
  const size = 56;
  const r    = 22;
  const circ = 2 * Math.PI * r;

  return (
    <div
      style={{
        position: 'fixed',
        left: position.x * window.innerWidth,
        top:  position.y * window.innerHeight,
        transform: 'translate(-50%, -50%)',
        pointerEvents: 'none',
        zIndex: 9999,
        transition: 'opacity 0.2s',
      }}
    >
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        {/* outer ring background */}
        <circle
          cx={size/2} cy={size/2} r={r}
          fill="none"
          stroke="rgba(255,255,255,0.18)"
          strokeWidth="2"
        />
        {/* dwell progress ring */}
        <circle
          cx={size/2} cy={size/2} r={r}
          fill="none"
          stroke="rgba(124, 58, 237, 0.95)"
          strokeWidth="3"
          strokeLinecap="round"
          strokeDasharray={circ}
          strokeDashoffset={circ * (1 - dwellProgress)}
          transform={`rotate(-90 ${size/2} ${size/2})`}
        />
        {/* centre dot */}
        <circle
          cx={size/2} cy={size/2}
          r={armed ? 8 : 5}
          fill={armed ? 'rgba(124,58,237,0.95)' : 'rgba(255,255,255,0.85)'}
          style={{ transition: 'r 0.15s, fill 0.15s' }}
        />
      </svg>
    </div>
  );
}
