import React, { useState, useMemo } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { supabase } from '../services/supabaseClient';
import { getTranslation } from '../translations';
import { useTheme } from '../contexts/ThemeContext';
import { Language } from '../types';

const detectLanguage = (): Language => {
  try {
    return navigator.language?.startsWith('de') ? 'de' : 'en';
  } catch {
    return 'de';
  }
};

const SignupScreen: React.FC = () => {
  const navigate = useNavigate();
  const { isDark } = useTheme();
  const lang = useMemo(detectLanguage, []);
  const t = (key: any) => getTranslation(lang, key);

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [username, setUsername] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const { error: signUpError } = await supabase.auth.signUp({
        email,
        password,
        options: { data: { username } },
      });

      if (signUpError) throw signUpError;
      navigate('/');
    } catch (error: any) {
      setError(error.message || 'Signup failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={`min-h-screen flex items-center justify-center p-4 ${isDark ? 'bg-slate-900' : 'bg-gradient-to-b from-orange-50 to-white'}`}>
      <div className="max-w-md w-full">
        <div className="text-center mb-8">
          <h1 className={`text-4xl font-extrabold tracking-tight mb-2 ${isDark ? 'text-white' : ''}`}>
            Food<span className="text-orange-500">Deals</span>
          </h1>
          <p className={isDark ? 'text-slate-400' : 'text-gray-500'}>{t('joinCommunity')}</p>
        </div>

        <div className={`rounded-2xl shadow-sm border p-8 ${isDark ? 'bg-slate-800 border-slate-700' : 'bg-white border-gray-100'}`}>
          <form onSubmit={handleSignup} className="space-y-5">
            {error && (
              <div className="bg-red-50 border border-red-100 text-red-600 p-3 rounded-xl text-sm">
                {error}
              </div>
            )}

            <div>
              <label htmlFor="username" className={`block text-sm font-semibold mb-1.5 ${isDark ? 'text-slate-300' : 'text-gray-700'}`}>
                {t('username')}
              </label>
              <input
                id="username"
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className={`w-full px-4 py-3 border rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-black transition-colors ${
                  isDark
                    ? 'bg-slate-700 border-slate-600 text-white placeholder-slate-500 focus:bg-slate-700'
                    : 'bg-gray-50 border-gray-200 focus:bg-white'
                }`}
                placeholder="johndoe"
                required
                minLength={3}
                maxLength={30}
              />
            </div>

            <div>
              <label htmlFor="email" className={`block text-sm font-semibold mb-1.5 ${isDark ? 'text-slate-300' : 'text-gray-700'}`}>
                {t('email')}
              </label>
              <input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className={`w-full px-4 py-3 border rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-black transition-colors ${
                  isDark
                    ? 'bg-slate-700 border-slate-600 text-white placeholder-slate-500 focus:bg-slate-700'
                    : 'bg-gray-50 border-gray-200 focus:bg-white'
                }`}
                placeholder="your@email.com"
                required
              />
            </div>

            <div>
              <label htmlFor="password" className={`block text-sm font-semibold mb-1.5 ${isDark ? 'text-slate-300' : 'text-gray-700'}`}>
                {t('password')}
              </label>
              <input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className={`w-full px-4 py-3 border rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-black transition-colors ${
                  isDark
                    ? 'bg-slate-700 border-slate-600 text-white placeholder-slate-500 focus:bg-slate-700'
                    : 'bg-gray-50 border-gray-200 focus:bg-white'
                }`}
                placeholder="••••••••"
                required
                minLength={6}
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-orange-500 hover:bg-orange-600 text-white py-3 rounded-xl font-bold text-sm shadow-md shadow-orange-500/20 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? t('creatingAccount') : t('signUp')}
            </button>
          </form>

          <div className="mt-6 text-center">
            <Link
              to="/login"
              className="text-orange-500 hover:text-orange-600 text-sm font-semibold"
            >
              {t('haveAccount')}
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SignupScreen;
