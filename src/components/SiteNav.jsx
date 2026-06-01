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

  const isTransparent = variant === 'transparent';
  const isDark        = variant === 'dark';
  // Visual separation is the priority — every variant has a defined bottom edge
  const navBg = isDark
    ? 'bg-black/55 backdrop-blur-md border-b border-white/15 text-white'
    : isTransparent
      ? 'bg-white/70 backdrop-blur-md border-b border-ink/15'
      : 'bg-white border-b border-ink/15';

  return (
    <>
      <nav className={`sticky top-0 z-40 ${navBg}`}>
        <div className="max-w-[1500px] mx-auto px-8 h-20 flex items-center justify-between gap-6">
          {/* Brand */}
          <Link to="/" className="flex items-center gap-3 shrink-0 group">
            <span
              className="w-[9px] h-[9px] rounded-full transition-transform group-hover:scale-150"
              style={{ backgroundColor: '#7DD3FC' }}
            />
            <div className="leading-tight">
              <div className={`font-display font-black tracking-tight ${isDark ? 'text-white' : 'text-ink'} text-[1.15rem]`}>
                Depth Gallery
              </div>
              <div className={`text-[0.58rem] tracking-[0.32em] uppercase ${isDark ? 'text-white/45' : 'text-ink/45'} -mt-0.5 hidden sm:block`}>
                Unveiled · The Art
              </div>
            </div>
          </Link>

          {/* Module nav — editorial style, full-height dividers */}
          <div className={`hidden md:flex items-stretch h-full flex-1 justify-center ${isDark ? 'border-x border-white/10' : 'border-x border-ink/10'} mx-4`}>
            {modules.map((m, i) => (
              <NavLink
                key={m.to}
                to={m.to}
                className={({ isActive }) =>
                  `relative flex items-center justify-center px-8 text-[0.78rem] tracking-[0.28em] uppercase font-bold transition-all ${
                    isActive
                      ? (isDark ? 'text-white' : 'text-ink')
                      : (isDark ? 'text-white/55 hover:text-white' : 'text-ink/55 hover:text-ink')
                  } ${i !== 0 ? (isDark ? 'border-l border-white/10' : 'border-l border-ink/10') : ''}`
                }
              >
                {({ isActive }) => (
                  <>
                    <span>{lang === 'zh' ? m.labelZh : m.label}</span>
                    {isActive && (
                      <span
                        className={`absolute left-0 right-0 bottom-0 h-[3px] ${isDark ? 'bg-white' : 'bg-ink'}`}
                      />
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
