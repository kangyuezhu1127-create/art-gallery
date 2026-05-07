import { createContext, useContext, useState, useRef, useCallback } from 'react';

const Ctx = createContext(null);

export function TransitionProvider({ children }) {
  const [overlay, setOverlay] = useState({ active: false, url: null, phase: 'idle' });
  // phase: idle | entering | full | leaving
  const timers = useRef([]);

  const clearTimers = () => { timers.current.forEach(clearTimeout); timers.current = []; };
  const after = (fn, ms) => { timers.current.push(setTimeout(fn, ms)); };

  /* Called by GalleryRoomPage when a frame is clicked */
  const startTransition = useCallback((url, navigateFn) => {
    clearTimers();
    // Artwork appears small + transparent, then zooms to fill
    setOverlay({ active: true, url, phase: 'entering' });
    after(() => setOverlay(s => ({ ...s, phase: 'full' })), 30);
    // Navigate after zoom completes
    after(navigateFn, 560);
  }, []);

  /* Called by ViewerPage when 3D scene has rendered its first frame */
  const signalReady = useCallback(() => {
    clearTimers();
    setOverlay(s => ({ ...s, phase: 'leaving' }));
    after(() => setOverlay({ active: false, url: null, phase: 'idle' }), 850);
  }, []);

  return (
    <Ctx.Provider value={{ startTransition, signalReady }}>
      {children}
      {overlay.active && <Overlay phase={overlay.phase} url={overlay.url} />}
    </Ctx.Provider>
  );
}

function Overlay({ phase, url }) {
  const entering = phase === 'entering';
  const leaving  = phase === 'leaving';

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 500,
      background: '#000',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      pointerEvents: 'none',
      /* fade the whole panel out on leaving */
      opacity:    leaving ? 0 : 1,
      transition: leaving ? 'opacity 0.78s ease-out' : 'none',
    }}>
      <img
        src={url}
        alt=""
        draggable={false}
        style={{
          maxWidth: '86vw',
          maxHeight: '86vh',
          objectFit: 'contain',
          display: 'block',
          userSelect: 'none',
          /* zoom from 0.68 → 1 as it enters; hold at 1 while full/leaving */
          transform:  entering ? 'scale(0.68)' : 'scale(1)',
          opacity:    entering ? 0             : 1,
          transition: 'transform 0.52s cubic-bezier(0.22, 1, 0.36, 1), opacity 0.32s ease-out',
        }}
      />
    </div>
  );
}

export const useGalleryTransition = () => useContext(Ctx);
