import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';

const REMEMBER_KEY = 'dg_remember_creds';

export default function AuthModal({ onClose }) {
  const [tab, setTab] = useState('login'); // 'login' | 'register'
  const [displayName, setDisplayName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [remember, setRemember] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Load saved credentials on open
  useEffect(() => {
    try {
      const saved = localStorage.getItem(REMEMBER_KEY);
      if (saved) {
        const { email: e, password: p } = JSON.parse(saved);
        if (e) setEmail(e);
        if (p) setPassword(p);
        setRemember(true);
      }
    } catch {
      // ignore corrupted storage
    }
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setLoading(true);

    try {
      if (tab === 'login') {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;

        // Persist or clear credentials based on checkbox
        if (remember) {
          localStorage.setItem(REMEMBER_KEY, JSON.stringify({ email, password }));
        } else {
          localStorage.removeItem(REMEMBER_KEY);
        }

        onClose();
      } else {
        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: { data: { display_name: displayName || email.split('@')[0] } },
        });
        if (error) throw error;
        setSuccess('Account created! Check your email to verify, then log in.');
        setTab('login');
      }
    } catch (err) {
      const msg = {
        'Invalid login credentials': 'Invalid email or password',
        'User already registered': 'Email already registered — please log in',
        'Password should be at least 6 characters': 'Password must be at least 6 characters',
      }[err.message] || err.message;
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm">
        <div className="flex items-center justify-between p-6 border-b border-gray-100">
          <div className="flex gap-4">
            <button
              onClick={() => { setTab('login'); setError(''); }}
              className={`text-sm font-medium pb-0.5 border-b-2 transition-colors ${
                tab === 'login' ? 'border-gray-900 text-gray-900' : 'border-transparent text-gray-400'
              }`}
            >
              Log In
            </button>
            <button
              onClick={() => { setTab('register'); setError(''); }}
              className={`text-sm font-medium pb-0.5 border-b-2 transition-colors ${
                tab === 'register' ? 'border-gray-900 text-gray-900' : 'border-transparent text-gray-400'
              }`}
            >
              Sign Up
            </button>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-gray-100 text-gray-400"
          >
            ✕
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-3" autoComplete="on">
          {tab === 'register' && (
            <input
              required
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              placeholder="Your name"
              autoComplete="name"
              className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm outline-none focus:border-gray-900 transition-colors"
            />
          )}
          <input
            required
            type="email"
            name="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="Email"
            autoComplete={tab === 'login' ? 'username' : 'email'}
            className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm outline-none focus:border-gray-900 transition-colors"
          />
          <input
            required
            type="password"
            name="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Password (min. 6 characters)"
            autoComplete={tab === 'login' ? 'current-password' : 'new-password'}
            className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm outline-none focus:border-gray-900 transition-colors"
          />

          {tab === 'login' && (
            <label className="flex items-center gap-2 text-xs text-gray-600 select-none cursor-pointer">
              <input
                type="checkbox"
                checked={remember}
                onChange={(e) => {
                  setRemember(e.target.checked);
                  if (!e.target.checked) localStorage.removeItem(REMEMBER_KEY);
                }}
                className="w-3.5 h-3.5 accent-gray-900"
              />
              Remember me on this device
            </label>
          )}

          {error && <p className="text-red-500 text-xs">{error}</p>}
          {success && <p className="text-green-600 text-xs">{success}</p>}

          <button
            type="submit"
            disabled={loading}
            className="w-full py-2.5 bg-gray-900 text-white text-sm font-medium rounded-xl hover:bg-gray-700 disabled:opacity-40 transition-colors"
          >
            {loading ? 'Processing…' : tab === 'login' ? 'Log In' : 'Sign Up'}
          </button>
        </form>
      </div>
    </div>
  );
}
