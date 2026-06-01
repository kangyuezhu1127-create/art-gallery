import { useState, useRef, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

export default function Navbar({ onUpload, onLogin }) {
  const { user, signOut } = useAuth();
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef(null);
  const displayName = user?.user_metadata?.display_name || user?.email?.split('@')[0] || '';
  const initial = displayName.charAt(0).toUpperCase();

  useEffect(() => {
    const handler = (e) => { if (menuRef.current && !menuRef.current.contains(e.target)) setMenuOpen(false); };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  return (
    <nav className="sticky top-0 z-40 bg-white/85 backdrop-blur-md border-b border-ink/10">
      <div className="max-w-[1200px] mx-auto px-6 h-16 flex items-center justify-between">
        <Link to="/" className="flex items-center gap-3 group">
          <span className="w-2 h-2 bg-papercut rounded-full transition-transform group-hover:scale-150" />
          <span className="font-display font-bold tracking-tight text-ink text-[1.05rem]">
            Depth Gallery
          </span>
          <span className="font-cn text-xs text-ink/50 hidden sm:inline">揭幕的艺术</span>
        </Link>

        <div className="flex items-center gap-3">
          {user ? (
            <>
              <button
                onClick={onUpload}
                className="hidden sm:inline-flex items-center gap-2 px-4 py-2 text-[0.85rem] font-semibold border-[1.5px] border-ink rounded-full bg-white text-ink hover:bg-ink hover:text-white transition-colors"
              >
                <span>上传作品</span>
                <span>↗</span>
              </button>
              <div className="relative" ref={menuRef}>
                <button
                  onClick={() => setMenuOpen((o) => !o)}
                  className="w-9 h-9 rounded-full bg-ink text-white text-sm font-bold flex items-center justify-center hover:bg-papercut transition-colors"
                >
                  {initial}
                </button>
                {menuOpen && (
                  <div className="absolute right-0 mt-2 w-48 bg-white border border-ink/10 rounded-2xl shadow-lg py-1 z-50">
                    <div className="px-4 py-3 border-b border-ink/10">
                      <p className="font-display font-bold text-ink truncate">{displayName}</p>
                      <p className="text-xs text-ink/40 truncate">{user.email}</p>
                    </div>
                    <button
                      onClick={() => { signOut(); setMenuOpen(false); }}
                      className="w-full text-left px-4 py-2.5 text-sm text-ink/70 hover:bg-ink/5 hover:text-ink transition-colors"
                    >
                      退出登录
                    </button>
                  </div>
                )}
              </div>
            </>
          ) : (
            <button
              onClick={onLogin}
              className="inline-flex items-center gap-2 px-4 py-2 text-[0.85rem] font-semibold border-[1.5px] border-ink rounded-full bg-white text-ink hover:bg-ink hover:text-white transition-colors"
            >
              <span>登录 / 注册</span>
              <span>→</span>
            </button>
          )}
        </div>
      </div>
    </nav>
  );
}
