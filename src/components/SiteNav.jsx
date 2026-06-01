import { useState, useRef, useEffect } from 'react';
import { Link, NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import AuthModal from './AuthModal';

/**
 * SiteNav — universal top navigation.
 *
 * Layout (left → right):
 *   [Brand logo + 蓝点 + subtitle]    [Module links]    [EN/中]  [👤 account]
 *
 * Used on: Landing (transparent), Cosmos, Walking Gallery, About, etc.
 *
 * Props:
 *   variant: 'transparent' (over hero) | 'solid' (white bg)
 *   lang, onLangChange: optional controlled lang switcher
 *   modules: override the default nav items
 */

const DEFAULT_MODULES = [
  { to: '/enter',   label: 'Cosmos',   labelZh: '宇宙' },
  { to: '/gallery', label: 'Walk-in',  labelZh: '走入' },
  { to: '/about',   label: 'About',    labelZh: '关于' },
];

function PersonIcon({ className = '', size = 18 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor"
         strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className={className}>
      <circle cx="12" cy="8" r="4" />
      <path d="M4 21c0-4.4 3.6-8 8-8s8 3.6 8 8" />
    </svg>
  );
}

export default function SiteNav({
  variant = 'solid',
  lang: langProp,
  onLangChange,
  modules = DEFAULT_MODULES,
}) {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();

  const [authOpen, setAuthOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [internalLang, setInternalLang] = useState('en');
  const lang = langProp ?? internalLang;
  const setLang = onLangChange ?? setInternalLang;

  const menuRef = useRef(null);
  useEffect(() => {
    const onClickOutside = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target)) setMenuOpen(false);
    };
    document.addEventListener('mousedown', onClickOutside);
    return () => document.removeEventListener('mousedown', onClickOutside);
  }, []);

  const displayName = user?.user_metadata?.display_name || user?.email?.split('@')[0] || '';
  const initial = displayName.charAt(0).toUpperCase();

  // Unified translucent-white block — works as a clear color block on top
  // of any page (white, kinetic rainbow, deep cosmos). The block itself
  // is the visual separator — no bottom border needed.
  // Kept `variant` prop for API compatibility but ignored here.
  void variant;
  const isDark = false;
  const navBg  = 'bg-white/72 backdrop-blur-xl';

  return (
    <>
      <nav className={`sticky top-0 z-40 ${navBg}`}>
        <div className="max-w-[1500px] mx-auto px-8 h-20 flex items-center justify-between gap-6">
          {/* Brand — single black wordmark serving as Home link */}
          <Link
            to="/"
            className="shrink-0 font-display font-black uppercase tracking-[0.22em] text-ink text-[0.95rem] hover:opacity-70 transition-opacity"
          >
            Unveil&nbsp;The&nbsp;Art
          </Link>

          {/* Module nav — pure typography, no divider lines */}
          <div className="hidden md:flex items-center h-full flex-1 justify-center gap-2">
            {modules.map((m) => (
              <NavLink
                key={m.to}
                to={m.to}
                className={({ isActive }) =>
                  `relative flex items-center justify-center px-6 py-2 text-[0.78rem] tracking-[0.28em] uppercase font-bold transition-colors ${
                    isActive
                      ? 'text-ink'
                      : 'text-ink/45 hover:text-ink'
                  }`
                }
              >
                {({ isActive }) => (
                  <>
                    <span>{lang === 'zh' ? m.labelZh : m.label}</span>
                    {isActive && (
                      <span className="absolute left-1/2 -translate-x-1/2 bottom-1 w-[5px] h-[5px] rounded-full bg-ink" />
                    )}
                  </>
                )}
              </NavLink>
            ))}
          </div>

          {/* Right cluster: lang + account */}
          <div className="flex items-center gap-5 shrink-0">
            {/* Lang switcher */}
            <div className={`hidden sm:flex items-center gap-2 text-xs tracking-wider ${isDark ? 'text-white/55' : 'text-ink/55'}`}>
              <button
                onClick={() => setLang('en')}
                className={`transition-colors ${
                  lang === 'en'
                    ? (isDark ? 'text-white font-bold' : 'text-ink font-bold')
                    : (isDark ? 'hover:text-white' : 'hover:text-ink')
                }`}
              >
                EN
              </button>
              <span className={isDark ? 'text-white/25' : 'text-ink/25'}>/</span>
              <button
                onClick={() => setLang('zh')}
                className={`transition-colors ${
                  lang === 'zh'
                    ? (isDark ? 'text-white font-bold' : 'text-ink font-bold')
                    : (isDark ? 'hover:text-white' : 'hover:text-ink')
                }`}
              >
                中
              </button>
            </div>

            {/* Account icon */}
            {!user ? (
              <button
                onClick={() => setAuthOpen(true)}
                title="Sign in"
                className={`w-10 h-10 rounded-full flex items-center justify-center border-[1.5px] transition-colors ${
                  isDark
                    ? 'border-white/30 text-white hover:bg-white hover:text-ink'
                    : 'border-ink/20 text-ink hover:bg-ink hover:text-white'
                }`}
              >
                <PersonIcon size={17} />
              </button>
            ) : (
              <div className="relative" ref={menuRef}>
                <button
                  onClick={() => setMenuOpen((o) => !o)}
                  className={`w-10 h-10 rounded-full text-sm font-bold flex items-center justify-center hover:opacity-85 transition-opacity ${
                    isDark ? 'bg-white text-ink' : 'bg-ink text-white'
                  }`}
                >
                  {initial || <PersonIcon size={17} />}
                </button>
                {menuOpen && (
                  <div className="absolute right-0 mt-2 w-52 bg-white border border-ink/10 rounded-2xl shadow-xl py-1.5 z-50">
                    <div className="px-4 py-3 border-b border-ink/10">
                      <p className="font-display font-bold text-ink truncate text-sm">{displayName}</p>
                      <p className="text-xs text-ink/40 truncate">{user.email}</p>
                    </div>
                    <button
                      onClick={() => { navigate('/account'); setMenuOpen(false); }}
                      className="w-full text-left px-4 py-2 text-sm text-ink/80 hover:bg-ink/5 hover:text-ink transition-colors"
                    >
                      My Works · 我的作品
                    </button>
                    <button
                      onClick={() => { navigate('/gallery'); setMenuOpen(false); }}
                      className="w-full text-left px-4 py-2 text-sm text-ink/80 hover:bg-ink/5 hover:text-ink transition-colors"
                    >
                      Walk-in Gallery
                    </button>
                    <div className="border-t border-ink/10 my-1" />
                    <button
                      onClick={() => { signOut(); setMenuOpen(false); }}
                      className="w-full text-left px-4 py-2 text-sm text-ink/60 hover:bg-ink/5 hover:text-ink transition-colors"
                    >
                      Sign out · 退出登录
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </nav>

      {authOpen && <AuthModal onClose={() => setAuthOpen(false)} />}
    </>
  );
}
