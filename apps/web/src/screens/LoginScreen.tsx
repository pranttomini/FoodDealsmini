import React, { useState, useMemo } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { supabase } from '../services/supabaseClient';
import { getTranslation } from '../translations';
import { useTheme } from '../contexts/ThemeContext';
import { Language } from '../types';

// Detect browser language for pre-login screens
const detectLanguage = (): Language => {
  try {
    return navigator.language?.startsWith('de') ? 'de' : 'en';
  } catch {
    return 'de';
  }
};

const LoginScreen: React.FC = () => {
  const navigate = useNavigate();
  const { isDark } = useTheme();
  const lang = useMemo(detectLanguage, []);
  const t = (key: any) => getTranslation(lang, key);

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [resetSent, setResetSent] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) throw error;
      navigate('/');
    } catch (error: any) {
      setError(error.message || 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  const handleForgotPassword = async () => {
    if (!email.trim()) {
      setError('Enter your email first');
      return;
    }
    setLoading(true);
    setError('');
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/login`,
      });
      if (error) throw error;
      setResetSent(true);
    } catch (err: any) {
      setError(err.message || 'Failed to send reset link');
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
          <p className={isDark ? 'text-slate-400' : 'text-gray-500'}>{t('welcomeBack')}</p>
        </div>

        <div className={`rounded-2xl shadow-sm border p-8 ${isDark ? 'bg-slate-800 border-slate-700' : 'bg-white border-gray-100'}`}>
          {resetSent ? (
            <div className="text-center py-6">
              <div className="text-4xl mb-3">✉️</div>
              <p className={`text-sm font-semibold ${isDark ? 'text-slate-200' : 'text-gray-800'}`}>
                {t('passwordResetSent')}
              </p>
              <button
                onClick={() => setResetSent(false)}
                className="mt-4 text-orange-500 text-sm font-semibold hover:text-orange-600"
              >
                {t('logIn')}
              </button>
            </div>
          ) : (
            <form onSubmit={handleLogin} className="space-y-5">
              {error && (
                <div className="bg-red-50 border border-red-100 text-red-600 p-3 rounded-xl text-sm">
                  {error}
                </div>
              )}

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

              {/* Forgot password link */}
              <div className="text-right -mt-3">
                <button
                  type="button"
                  onClick={handleForgotPassword}
                  className="text-orange-500 hover:text-orange-600 text-xs font-semibold"
                >
                  {t('forgotPassword')}
                </button>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full bg-orange-500 hover:bg-orange-600 text-white py-3 rounded-xl font-bold text-sm shadow-md shadow-orange-500/20 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? t('loggingIn') : t('logIn')}
              </button>
            </form>
          )}

          <div className="mt-6 text-center">
            <Link
              to="/signup"
              className="text-orange-500 hover:text-orange-600 text-sm font-semibold"
            >
              {t('noAccount')}
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
};

export default LoginScreen;
