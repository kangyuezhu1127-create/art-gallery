import { useState, useEffect, useRef } from 'react';
import { Helmet } from 'react-helmet-async';
import SiteNav from '../components/SiteNav';
import ArtworkCard from '../components/ArtworkCard';
import UploadModal from '../components/UploadModal';
import AuthModal from '../components/AuthModal';
import EditModal from '../components/EditModal';
import { useAuth } from '../contexts/AuthContext';
import { Butterfly, Medallion, Peony, WindowFlower, Scissors } from '../components/decorations/Papercut';

// Deterministic pseudo-random tilt based on artwork id (stable across renders)
function tiltFor(id) {
  if (!id) return 0;
  let h = 0;
  for (let i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) | 0;
  const range = 5; // -2.5 ~ +2.5 deg
  return ((Math.abs(h) % 1000) / 1000 - 0.5) * range;
}

export default function GalleryPage({ artworks, loading, onAdd, onUpdate, onSave, onDelete }) {
  const { user } = useAuth();
  const [showUpload, setShowUpload] = useState(false);
  const [showAuth, setShowAuth] = useState(false);
  const [editTarget, setEditTarget] = useState(null);

  // Cursor-follow butterfly (lerp)
  const cursorRef = useRef({ x: -100, y: -100 });
  const targetRef = useRef({ x: -100, y: -100 });
  const cursorEl = useRef(null);

  useEffect(() => {
    const onMove = (e) => { targetRef.current = { x: e.clientX, y: e.clientY }; };
    window.addEventListener('mousemove', onMove);
    let raf;
    const tick = () => {
      cursorRef.current.x += (targetRef.current.x - cursorRef.current.x) * 0.12;
      cursorRef.current.y += (targetRef.current.y - cursorRef.current.y) * 0.12;
      if (cursorEl.current) {
        cursorEl.current.style.transform =
          `translate3d(${cursorRef.current.x - 18}px, ${cursorRef.current.y - 18}px, 0) rotate(${(targetRef.current.x - cursorRef.current.x) * 1.4}deg)`;
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => { window.removeEventListener('mousemove', onMove); cancelAnimationFrame(raf); };
  }, []);

  const handleUploadClick = () => {
    if (user) setShowUpload(true);
    else setShowAuth(true);
  };

  return (
    <div className="min-h-screen bg-paper text-ink relative">
      <Helmet>
        <title>Unveilthe.Arts | 立体剪纸艺术</title>
        <meta name="description" content="上传你的 2D 作品，AI 自动生成深度图，用 3D 视角立体欣赏每一幅画" />
        <meta property="og:title" content="Unveilthe.Arts" />
        <meta property="og:description" content="AI 驱动的 3D 艺术展览平台" />
        <meta property="og:type" content="website" />
      </Helmet>

      {/* Cursor-follow butterfly */}
      <div
        ref={cursorEl}
        className="fixed top-0 left-0 pointer-events-none z-[60] hidden md:block"
        style={{ willChange: 'transform' }}
      >
        <Butterfly size={36} className="text-papercut/70" />
      </div>

      <SiteNav variant="solid" />

      {/* HERO */}
      <section className="max-w-[1200px] mx-auto px-6 pt-20 pb-16 relative">
        {/* Decorative paper-cuts in hero corners */}
        <Peony
          size={120}
          className="absolute top-8 right-6 text-papercut/25 animate-floaty hidden md:block"
          style={{ '--r': '-12deg' }}
        />
        <WindowFlower
          size={64}
          className="absolute top-32 left-2 text-ink/15 animate-floaty hidden md:block"
          style={{ '--r': '8deg', animationDelay: '1.4s' }}
        />

        <p className="font-cn font-bold tracking-[0.3em] text-papercut text-xs uppercase mb-4">
          画 廊 · The Gallery
        </p>
        <h1
          className="font-display font-black leading-[0.95] text-ink mb-6"
          style={{ fontSize: 'clamp(2.8rem, 7vw, 6.5rem)' }}
        >
          纸 · 上 立 体
          <br />
          <span className="text-papercut">Paper, in Depth.</span>
        </h1>
        <p
          className="font-cn text-ink/65 max-w-xl mb-10 leading-relaxed"
          style={{ fontSize: 'clamp(0.95rem, 1.25vw, 1.1rem)' }}
        >
          每一张剪纸都被赋予深度信息 ——<br />
          鼠标悬停看它呼吸，点击让它在三维空间里铺开。
        </p>

        {/* Stats strip */}
        <div className="flex items-center gap-8 text-xs tracking-[0.18em] uppercase text-ink/45 border-t border-ink/10 pt-5">
          <span>{artworks.length} 件作品 · WORKS</span>
          <span className="hidden sm:inline">{new Set(artworks.map((a) => a.artist).filter(Boolean)).size} 位创作者 · ARTISTS</span>
          <span className="hidden md:inline">ROOM 01 / 12</span>
        </div>
      </section>

      {/* GRID */}
      <section className="max-w-[1200px] mx-auto px-6 pb-32">
        {loading ? (
          <div className="text-center py-32 text-ink/40">
            <div className="w-8 h-8 border-2 border-ink/20 border-t-ink rounded-full animate-spin mx-auto mb-4" />
            <p className="font-cn tracking-widest text-sm">加载中…</p>
          </div>
        ) : artworks.length === 0 ? (
          <div className="text-center py-24 flex flex-col items-center">
            <Medallion size={180} className="text-papercut/35 mb-8 animate-floaty" />
            <h2 className="font-display font-bold text-3xl mb-3">
              等待第一片纸张展开
            </h2>
            <p className="font-cn text-ink/55 mb-8 max-w-sm">
              这里还没有作品。上传你的剪纸，让它在数字空间里立体生长。
            </p>
            <button
              onClick={handleUploadClick}
              className="btn-outline"
            >
              <span>上传第一件作品</span>
              <span className="arrow">→</span>
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-x-8 gap-y-14 pt-4">
            {artworks.map((artwork, i) => (
              <ArtworkCard
                key={artwork.id}
                artwork={artwork}
                tilt={tiltFor(artwork.id)}
                index={i}
                onEdit={setEditTarget}
                onDelete={onDelete}
              />
            ))}
          </div>
        )}
      </section>

      {/* Floating scissors upload FAB */}
      {artworks.length > 0 && (
        <button
          onClick={handleUploadClick}
          title={user ? '上传作品' : '登录后上传'}
          className="fixed bottom-8 right-8 z-40 w-16 h-16 rounded-full bg-papercut text-white shadow-[0_10px_30px_rgba(215,38,56,0.35)] hover:scale-110 hover:rotate-12 active:scale-95 transition-transform duration-300 flex items-center justify-center group"
        >
          <Scissors size={32} className="text-white group-hover:animate-cutSnip" />
        </button>
      )}

      {showUpload && (
        <UploadModal onClose={() => setShowUpload(false)} onAdd={onAdd} onUpdate={onUpdate} />
      )}
      {showAuth && <AuthModal onClose={() => setShowAuth(false)} />}
      {editTarget && (
        <EditModal
          artwork={editTarget}
          onClose={() => setEditTarget(null)}
          onSave={(updated) => { onSave(updated); setEditTarget(null); }}
        />
      )}
    </div>
  );
}
