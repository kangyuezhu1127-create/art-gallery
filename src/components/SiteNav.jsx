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
  const navBg = isTransparent
    ? 'bg-transparent'
    : 'bg-white/85 backdrop-blur-md border-b border-ink/10';

  return (
    <>
      <nav className={`sticky top-0 z-40 ${navBg}`}>
        <div className="max-w-[1400px] mx-auto px-6 h-16 flex items-center justify-between gap-6">
          {/* Brand */}
          <Link to="/" className="flex items-center gap-3 shrink-0 group">
            <span
              className="w-2 h-2 rounded-full transition-transform group-hover:scale-150"
              style={{ backgroundColor: '#7DD3FC' }}
            />
            <div className="leading-tight">
              <div className="font-display font-bold tracking-tight text-ink text-[1.05rem]">
                Depth Gallery
              </div>
              <div className="text-[0.62rem] tracking-[0.22em] uppercase text-ink/45 -mt-0.5 hidden sm:block">
                Unveiled · The Art
              </div>
            </div>
          </Link>

          {/* Module nav */}
          <div className="hidden md:flex items-center gap-0 flex-1 justify-center">
            {modules.map((m, i) => (
              <NavLink
                key={m.to}
                to={m.to}
                className={({ isActive }) =>
                  `relative px-6 py-2 text-[0.78rem] tracking-[0.22em] uppercase font-semibold transition-colors ${
                    isActive ? 'text-ink' : 'text-ink/55 hover:text-ink'
                  } ${i !== 0 ? 'border-l border-ink/10' : ''}`
                }
              >
                {({ isActive }) => (
                  <>
                    <span>{lang === 'zh' ? m.labelZh : m.label}</span>
                    {isActive && (
                      <span className="absolute left-1/2 -translate-x-1/2 bottom-1 w-1 h-1 rounded-full bg-ink" />
                    )}
                  </>
                )}
              </NavLink>
            ))}
          </div>

          {/* Right cluster: lang + account */}
          <div className="flex items-center gap-4 shrink-0">
            {/* Lang switcher */}
            <div className="hidden sm:flex items-center gap-2 text-xs tracking-wider text-ink/55">
              <button
                onClick={() => setLang('en')}
                className={`transition-colors ${lang === 'en' ? 'text-ink font-semibold' : 'hover:text-ink'}`}
              >
                EN
              </button>
              <span className="text-ink/25">/</span>
              <button
                onClick={() => setLang('zh')}
                className={`transition-colors ${lang === 'zh' ? 'text-ink font-semibold' : 'hover:text-ink'}`}
              >
                中
              </button>
            </div>

            {/* Account icon */}
            {!user ? (
              <button
                onClick={() => setAuthOpen(true)}
                title="Sign in"
                className="w-9 h-9 rounded-full flex items-center justify-center border border-ink/15 text-ink hover:bg-ink hover:text-white transition-colors"
              >
                <PersonIcon size={16} />
              </button>
            ) : (
              <div className="relative" ref={menuRef}>
                <button
                  onClick={() => setMenuOpen((o) => !o)}
                  className="w-9 h-9 rounded-full bg-ink text-white text-sm font-bold flex items-center justify-center hover:opacity-85 transition-opacity"
                >
                  {initial || <PersonIcon size={16} />}
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
