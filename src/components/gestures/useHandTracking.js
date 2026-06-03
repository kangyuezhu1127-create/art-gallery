import { useEffect, useRef, useState } from 'react';
import { HandLandmarker, FilesetResolver } from '@mediapipe/tasks-vision';

/**
 * useHandTracking — initialise MediaPipe Hands + webcam and report
 * the palm position on every frame.
 *
 * Returns:
 *   status        : 'idle' | 'initializing' | 'ready' | 'denied' | 'error'
 *   position      : { x, y } normalised to viewport (0..1) or null
 *   videoRef      : ref to attach to a <video> element for preview
 *   landmarksRef  : ref holding the latest 21-point landmark array (for
 *                   advanced overlays)
 *
 * Notes:
 *  - x is mirrored so the cursor moves the same direction as the user's
 *    hand (selfie convention).
 *  - palm position uses landmark 9 (middle-finger MCP), the most stable
 *    centre of the hand.
 *  - WASM + model loaded from public CDNs — no bundling needed.
 */
export function useHandTracking({ enabled }) {
  const videoRef        = useRef(null);
  const landmarkerRef   = useRef(null);
  const landmarksRef    = useRef(null);
  const rafRef          = useRef(0);
  const streamRef       = useRef(null);
  const [status,   setStatus]   = useState('idle');
  const [position, setPosition] = useState(null);

  useEffect(() => {
    if (!enabled) {
      setStatus('idle');
      setPosition(null);
      landmarksRef.current = null;
      return;
    }

    let cancelled = false;

    const setup = async () => {
      setStatus('initializing');
      try {
        // 1. Load MediaPipe WASM
        const fileset = await FilesetResolver.forVisionTasks(
          'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.14/wasm'
        );
        if (cancelled) return;

        const landmarker = await HandLandmarker.createFromOptions(fileset, {
          baseOptions: {
            modelAssetPath:
              'https://storage.googleapis.com/mediapipe-models/hand_landmarker/hand_landmarker/float16/1/hand_landmarker.task',
            delegate: 'GPU',
          },
          runningMode: 'VIDEO',
          numHands: 1,
          minHandDetectionConfidence: 0.6,
          minHandPresenceConfidence: 0.6,
          minTrackingConfidence: 0.6,
        });
        if (cancelled) { landmarker.close(); return; }
        landmarkerRef.current = landmarker;

        // 2. Get webcam
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { width: 640, height: 480, facingMode: 'user' },
          audio: false,
        });
        if (cancelled) { stream.getTracks().forEach((t) => t.stop()); return; }
        streamRef.current = stream;

        const video = videoRef.current;
        if (!video) { stream.getTracks().forEach((t) => t.stop()); return; }
        video.srcObject = stream;
        await video.play();

        setStatus('ready');

        // 3. Detection loop
        let lastTs = -1;
        const tick = () => {
          if (cancelled || !landmarkerRef.current || !videoRef.current) return;
          const v = videoRef.current;
          if (v.readyState >= 2) {
            const ts = performance.now();
            if (ts !== lastTs) {
              lastTs = ts;
              const result = landmarkerRef.current.detectForVideo(v, ts);
              if (result.landmarks?.length > 0) {
                const lm = result.landmarks[0];
                landmarksRef.current = lm;
                // palm = middle-finger MCP joint, mirror X for selfie view
                const palm = lm[9];
                setPosition({ x: 1 - palm.x, y: palm.y });
              } else {
                landmarksRef.current = null;
                setPosition(null);
              }
            }
          }
          rafRef.current = requestAnimationFrame(tick);
        };
        rafRef.current = requestAnimationFrame(tick);
      } catch (err) {
        if (cancelled) return;
        if (err?.name === 'NotAllowedError' || err?.name === 'PermissionDeniedError') {
          setStatus('denied');
        } else {
          console.error('[hand-tracking]', err);
          setStatus('error');
        }
      }
    };

    setup();

    return () => {
      cancelled = true;
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      if (streamRef.current) streamRef.current.getTracks().forEach((t) => t.stop());
      if (landmarkerRef.current) {
        try { landmarkerRef.current.close(); } catch { /* ignore */ }
        landmarkerRef.current = null;
      }
      setPosition(null);
      landmarksRef.current = null;
    };
  }, [enabled]);

  return { status, position, videoRef, landmarksRef };
}
