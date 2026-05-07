import { useState } from 'react';
import { supabase } from '../lib/supabase';

export default function AuthModal({ onClose }) {
  const [tab, setTab] = useState('login'); // 'login' | 'register'
  const [displayName, setDisplayName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setLoading(true);

    try {
      if (tab === 'login') {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        onClose();
      } else {
        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: { data: { display_name: displayName || email.split('@')[0] } },
        });
        if (error) throw error;
        setSuccess('注册成功！请检查邮箱完成验证，然后登录。');
        setTab('login');
      }
    } catch (err) {
      const msg = {
        'Invalid login credentials': '邮箱或密码错误',
        'User already registered': '该邮箱已注册，请直接登录',
        'Password should be at least 6 characters': '密码至少 6 位',
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
              登录
            </button>
            <button
              onClick={() => { setTab('register'); setError(''); }}
              className={`text-sm font-medium pb-0.5 border-b-2 transition-colors ${
                tab === 'register' ? 'border-gray-900 text-gray-900' : 'border-transparent text-gray-400'
              }`}
            >
              注册
            </button>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-gray-100 text-gray-400"
          >
            ✕
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-3">
          {tab === 'register' && (
            <input
              required
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              placeholder="你的名字"
              className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm outline-none focus:border-gray-900 transition-colors"
            />
          )}
          <input
            required
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="邮箱"
            className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm outline-none focus:border-gray-900 transition-colors"
          />
          <input
            required
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="密码（至少 6 位）"
            className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm outline-none focus:border-gray-900 transition-colors"
          />

          {error && <p className="text-red-500 text-xs">{error}</p>}
          {success && <p className="text-green-600 text-xs">{success}</p>}

          <button
            type="submit"
            disabled={loading}
            className="w-full py-2.5 bg-gray-900 text-white text-sm font-medium rounded-xl hover:bg-gray-700 disabled:opacity-40 transition-colors"
          >
            {loading ? '处理中...' : tab === 'login' ? '登录' : '注册'}
          </button>
        </form>
      </div>
    </div>
  );
}
