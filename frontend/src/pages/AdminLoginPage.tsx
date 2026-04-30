import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Lock, User, Sparkles, ArrowLeft } from 'lucide-react';
import { apiClient } from '../api/client';
import { useLanguage } from '../i18n/LanguageContext';
import logo from '../assets/logo.png';

export default function AdminLoginPage() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const navigate = useNavigate();
  const { t } = useLanguage();

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const { data } = await apiClient.post('/admin/login', { username, password });

      localStorage.setItem('admin_token', (data as any).token);
      localStorage.setItem('admin_user', JSON.stringify((data as any).user));
      navigate('/admin');
    } catch (err: any) {
      setError(err.response?.data?.error || err.message || 'Login failed');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-gradient-to-br from-slate-50 via-indigo-50 to-brand-50 dark:from-slate-950 dark:via-slate-900 dark:to-brand-950 transition-colors">
      <motion.div
        className="w-full max-w-md"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
      >
        <Link
          to="/"
          className="inline-flex items-center gap-1.5 text-sm text-slate-500 dark:text-slate-400 hover:text-brand-600 dark:hover:text-brand-400 mb-4 font-medium transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          {t("detail_back")}
        </Link>

        <div className="glass-panel p-8 space-y-6">
          <div className="text-center space-y-2">
            <img src={logo} alt="Gadam" className="w-14 h-14 rounded-2xl shadow-lg shadow-brand-500/30 mx-auto" />
            <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-brand-500/10 dark:bg-brand-400/15 text-brand-600 dark:text-brand-300 text-xs font-semibold border border-brand-200/50 dark:border-brand-500/30">
              <Sparkles className="w-3.5 h-3.5" />
              {t("admin_login_title")}
            </div>
            <h1 className="text-2xl font-bold text-slate-900 dark:text-white">
              {t("admin_brand")}
            </h1>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <motion.div
                className="bg-rose-50 dark:bg-rose-500/10 border border-rose-200 dark:border-rose-500/30 rounded-xl p-3 text-rose-600 dark:text-rose-400 text-sm"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
              >
                {error}
              </motion.div>
            )}

            <div className="space-y-1.5">
              <label className="block text-xs uppercase tracking-wide font-semibold text-slate-500 dark:text-slate-400">
                {t("admin_username")}
              </label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className="w-full pl-10 pr-4 py-2.5 bg-white dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white text-sm focus:outline-none focus:border-brand-400 dark:focus:border-brand-500 focus:ring-2 focus:ring-brand-200 dark:focus:ring-brand-500/20 transition-colors placeholder:text-slate-400"
                  placeholder={t("admin_username_placeholder")}
                  required
                  autoFocus
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="block text-xs uppercase tracking-wide font-semibold text-slate-500 dark:text-slate-400">
                {t("admin_password")}
              </label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full pl-10 pr-4 py-2.5 bg-white dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white text-sm focus:outline-none focus:border-brand-400 dark:focus:border-brand-500 focus:ring-2 focus:ring-brand-200 dark:focus:ring-brand-500/20 transition-colors placeholder:text-slate-400"
                  placeholder={t("admin_password_placeholder")}
                  required
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 rounded-xl bg-gradient-to-r from-brand-600 to-brand-500 text-white font-semibold shadow-lg shadow-brand-600/30 hover:shadow-brand-500/50 hover:scale-[1.01] disabled:opacity-50 disabled:hover:scale-100 transition-all duration-200"
            >
              {loading ? t("admin_signing_in") : t("admin_sign_in")}
            </button>
          </form>

          <p className="text-center text-slate-500 dark:text-slate-400 text-xs">
            {t("admin_default")}{' '}
            <code className="text-brand-600 dark:text-brand-400 px-1.5 py-0.5 rounded bg-brand-50 dark:bg-brand-500/10">admin</code>{' '}
            /{' '}
            <code className="text-brand-600 dark:text-brand-400 px-1.5 py-0.5 rounded bg-brand-50 dark:bg-brand-500/10">admin</code>
          </p>
        </div>
      </motion.div>
    </div>
  );
}
