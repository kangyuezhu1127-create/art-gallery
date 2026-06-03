import { useEffect, useRef, useState } from 'react';

/**
 * useDwellSelect — hand-position hit-testing with dwell-time selection.
 *
 * On every animation frame:
 *   1. project the normalised hand position onto viewport pixels
 *   2. hit-test which DOM element the cursor is over
 *   3. walk up to the nearest element matching `selector`
 *   4. if it's the same target as last frame, accumulate dwell time
 *   5. when accumulated >= dwellMs, invoke onSelect(element)
 *
 * Returns:
 *   { dwellProgress: 0..1, target: HTMLElement | null }
 *
 * Smoothing:
 *   We low-pass the cursor with an exponential smoother (alpha 0.25)
 *   so jitter from finger tremor doesn't break dwell.
 */
export function useDwellSelect({
  position,
  selector = '[data-gesture-target]',
  dwellMs  = 1500,
  onSelect,
}) {
  const [state, setState] = useState({ dwellProgress: 0, target: null });

  const posRef       = useRef(position);
  const onSelectRef  = useRef(onSelect);
  const smoothedRef  = useRef(null);
  posRef.current      = position;
  onSelectRef.current = onSelect;

  useEffect(() => {
    let raf = 0;
    let dwellStart = null;
    let lastTarget = null;
    let firedTarget = null;

    const tick = () => {
      const raw = posRef.current;

      if (!raw) {
        // hand lost
        smoothedRef.current = null;
        dwellStart = null;
        lastTarget = null;
        firedTarget = null;
        setState((s) => (s.dwellProgress === 0 && s.target === null ? s : { dwellProgress: 0, target: null }));
        raf = requestAnimationFrame(tick);
        return;
      }

      // Exponential smoothing — alpha small = more smoothing
      const ALPHA = 0.28;
      const prev = smoothedRef.current ?? raw;
      const sm = {
        x: prev.x + (raw.x - prev.x) * ALPHA,
        y: prev.y + (raw.y - prev.y) * ALPHA,
      };
      smoothedRef.current = sm;

      const x = sm.x * window.innerWidth;
      const y = sm.y * window.innerHeight;

      // Hit-test (skip the cursor itself which is pointer-events:none anyway)
      const el = document.elementFromPoint(x, y);
      const target = el?.closest(selector) || null;

      if (target !== lastTarget) {
        lastTarget = target;
        dwellStart = target ? performance.now() : null;
        firedTarget = null; // entering a new target re-arms select
      }

      let progress = 0;
      if (target && dwellStart != null) {
        const elapsed = performance.now() - dwellStart;
        progress = Math.min(1, elapsed / dwellMs);
        if (progress >= 1 && firedTarget !== target) {
          firedTarget = target;
          dwellStart = null;
          progress = 1;
          try { onSelectRef.current?.(target); } catch (e) { console.error(e); }
        }
      }

      setState((s) =>
        (s.dwellProgress === progress && s.target === target) ? s : { dwellProgress: progress, target }
      );
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [selector, dwellMs]);

  return state;
}
