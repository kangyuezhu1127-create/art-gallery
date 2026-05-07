import { useEffect } from 'react';
import { Link } from 'react-router-dom';

// All non-3D UI: intro, crosshair, info bar, detail panel, tweaks, toolbar, joystick.
export default function WalkHUD({
  introGone, onEnter,
  artworks, aimedIdx, openIdx, onClose,
  vibe, setVibe, focus, setFocus, speed, setSpeed,
  audioOn, setAudioOn, onShare, layout,
}) {
  const aimed = aimedIdx != null ? artworks[aimedIdx] : null;
  const open = openIdx != null ? artworks[openIdx] : null;

  // Joystick wiring (touch only)
  useEffect(() => {
    if (!introGone) return;
    const el = document.getElementById('walk-joystick');
    const knob = el?.querySelector('.knob');
    if (!el || !knob) return;
    let id = null;
    const onDown = (e) => { id = e.pointerId; el.setPointerCapture(e.pointerId); };
    const onMove = (e) => {
      if (e.pointerId !== id) return;
      const r = el.getBoundingClientRect();
      const cx = r.left + r.width / 2, cy = r.top + r.height / 2;
      let dx = e.clientX - cx, dy = e.clientY - cy;
      const max = r.width / 2 - 22;
      const len = Math.hypot(dx, dy);
      if (len > max) { dx = dx / len * max; dy = dy / len * max; }
      knob.style.transform = `translate(calc(-50% + ${dx}px), calc(-50% + ${dy}px))`;
      if (window.__walkJoy) { window.__walkJoy.active = true; window.__walkJoy.dx = dx / max; window.__walkJoy.dy = dy / max; }
    };
    const onUp = (e) => {
      if (e.pointerId !== id) return;
      id = null;
      knob.style.transform = `translate(-50%, -50%)`;
      if (window.__walkJoy) { window.__walkJoy.active = false; window.__walkJoy.dx = 0; window.__walkJoy.dy = 0; }
    };
    el.addEventListener('pointerdown', onDown);
    el.addEventListener('pointermove', onMove);
    el.addEventListener('pointerup', onUp);
    el.addEventListener('pointercancel', onUp);
    return () => {
      el.removeEventListener('pointerdown', onDown);
      el.removeEventListener('pointermove', onMove);
      el.removeEventListener('pointerup', onUp);
      el.removeEventListener('pointercancel', onUp);
    };
  }, [introGone]);

  return (
    <>
      {/* Intro overlay */}
      {!introGone && (
        <div className="absolute inset-0 z-30 flex flex-col justify-between p-8 md:p-14 bg-black/60 backdrop-blur-sm">
          <div className="flex justify-between text-xs tracking-widest uppercase text-white/60">
            <span>Depth Gallery · Walk-through</span>
            <Link to="/" className="hover:text-white">← Back to grid</Link>
          </div>
          <div className="max-w-3xl">
            <h1 style={{ fontFamily: 'Fraunces, serif' }} className="text-6xl md:text-8xl font-light italic leading-none tracking-tight text-white">
              A walk-in <span className="not-italic font-extralight opacity-70">volume</span>,<br />not a wall.
            </h1>
            <p className="mt-6 max-w-md text-white/65">{artworks.length} 件作品已挂上墙 · {layout.kind === 'corridor' ? '走廊布局' : '圆厅自动扩展'}</p>
            <div className="mt-8 flex flex-wrap gap-4 items-center">
              <button onClick={onEnter} className="px-6 py-3 bg-white text-black rounded-full text-sm uppercase tracking-widest font-medium hover:-translate-y-px transition-transform">
                Enter the gallery →
              </button>
              <span className="text-xs uppercase tracking-widest text-white/55">WASD · 鼠标转头 · 点击作品查看</span>
            </div>
          </div>
          <div className="text-xs uppercase tracking-widest text-white/55 flex flex-wrap gap-8">
            <div><div className="text-white/40">Pieces installed</div><div className="text-white">{artworks.length}</div></div>
            <div><div className="text-white/40">Atmosphere</div><div className="text-white">{vibe}</div></div>
            <div><div className="text-white/40">Audio</div><div className="text-white">{audioOn ? 'ON' : 'OFF'}</div></div>
          </div>
        </div>
      )}

      {/* HUD */}
      {introGone && (
        <>
          {/* Crosshair */}
          <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-5 h-5 pointer-events-none">
            <div className="absolute left-1/2 top-0 bottom-0 w-px -translate-x-1/2 bg-white/70" />
            <div className="absolute top-1/2 left-0 right-0 h-px -translate-y-1/2 bg-white/70" />
            <div className={`absolute left-1/2 top-1/2 w-1 h-1 -translate-x-1/2 -translate-y-1/2 rounded-full transition-all ${aimed ? 'bg-yellow-300 scale-[2]' : 'bg-white'}`} />
          </div>

          {/* Bottom label */}
          <div className="absolute bottom-20 left-1/2 -translate-x-1/2 text-[10px] tracking-[0.22em] uppercase text-white/60 flex gap-4 items-center pointer-events-none">
            <span>{aimed ? `№ ${String(aimedIdx + 1).padStart(2, '0')} · ${aimed.title}` : 'No artwork in view'}</span>
          </div>

          {/* Toolbar */}
          <div className="absolute left-1/2 -translate-x-1/2 bottom-5 flex gap-2 p-2 bg-black/60 backdrop-blur-md border border-white/15 rounded-full text-xs uppercase tracking-widest">
            <button onClick={() => setAudioOn(!audioOn)} className={`px-3 py-2 rounded-full hover:bg-white/10 ${audioOn ? 'bg-white/15' : ''}`}>♪ Audio</button>
            <button onClick={onShare} className="px-3 py-2 rounded-full hover:bg-white/10">Share</button>
            <Link to="/" className="px-3 py-2 rounded-full hover:bg-white/10">Exit</Link>
          </div>

          {/* Tweaks */}
          <div className="absolute right-5 top-5 w-[260px] p-4 bg-black/70 backdrop-blur-md border border-white/15 rounded-2xl text-white/90">
            <div className="text-[10px] uppercase tracking-[0.2em] text-white/55 mb-3">Tweaks</div>
            <div className="mb-3">
              <div className="text-[10px] uppercase tracking-widest text-white/55 mb-1">Atmosphere</div>
              <div className="flex gap-1 p-0.5 bg-white/5 rounded-lg">
                {['moody', 'white', 'liminal'].map((v) => (
                  <button key={v} onClick={() => setVibe(v)} className={`flex-1 py-1.5 text-xs rounded-md ${vibe === v ? 'bg-white/15 text-white' : 'text-white/55'}`}>{v}</button>
                ))}
              </div>
            </div>
            <div className="mb-3">
              <div className="text-[10px] uppercase tracking-widest text-white/55 mb-1">Spotlight focus · {focus.toFixed(2)}</div>
              <input type="range" min="0" max="1" step="0.05" value={focus} onChange={(e) => setFocus(+e.target.value)} className="w-full" />
            </div>
            <div>
              <div className="text-[10px] uppercase tracking-widest text-white/55 mb-1">Walk speed · {speed.toFixed(1)}</div>
              <input type="range" min="2" max="9" step="0.5" value={speed} onChange={(e) => setSpeed(+e.target.value)} className="w-full" />
            </div>
          </div>

          {/* Detail panel */}
          {open && (
            <div className="absolute left-5 bottom-20 w-[min(380px,calc(100vw-40px))] p-5 bg-black/80 backdrop-blur-md border border-white/15 rounded-2xl">
              <div className="flex justify-between items-start gap-3">
                <div>
                  <div className="text-[10px] uppercase tracking-[0.2em] text-white/55">№ {String(openIdx + 1).padStart(2, '0')}</div>
                  <h2 style={{ fontFamily: 'Fraunces, serif' }} className="text-2xl font-light italic mt-1">{open.title}</h2>
                  <div className="text-xs text-white/55 mt-1">{open.artist || 'Unknown'} · {open.year || '—'}</div>
                </div>
                <button onClick={onClose} className="w-7 h-7 rounded-md text-white/60 hover:bg-white/10">×</button>
              </div>
              {open.description && <p className="text-sm text-white/80 mt-3 leading-relaxed">{open.description}</p>}
              <Link to={`/artwork/${open.id}`} className="inline-block mt-4 text-xs uppercase tracking-widest border border-white/20 rounded-full px-3 py-1.5 hover:bg-white/10">
                Open standalone view →
              </Link>
            </div>
          )}

          {/* Joystick (mobile only via CSS) */}
          <div id="walk-joystick" className="absolute left-5 bottom-5 w-[110px] h-[110px] rounded-full bg-black/45 border border-white/15 backdrop-blur md:hidden touch-none">
            <div className="knob absolute left-1/2 top-1/2 w-11 h-11 rounded-full bg-white/85 -translate-x-1/2 -translate-y-1/2 shadow-lg" />
          </div>
        </>
      )}
    </>
  );
}
