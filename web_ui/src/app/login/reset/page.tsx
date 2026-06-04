'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { Lock, ArrowLeft } from 'lucide-react';
import { useI18n } from '@/i18n/I18nProvider';

export default function ResetPasswordPage() {
  const t = useI18n();
  const searchParams = useSearchParams();
  const token = searchParams.get('token');

  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [status, setStatus] = useState<'IDLE' | 'LOADING' | 'SUCCESS' | 'ERROR'>('IDLE');
  const [message, setMessage] = useState('');

  useEffect(() => {
    if (!token) {
      setStatus('ERROR');
      setMessage(t.reset_missing_token);
    }
  }, [t, token]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token) return;

    if (password !== confirmPassword) {
      setStatus('ERROR');
      setMessage(t.reset_password_mismatch);
      return;
    }

    if (password.length < 8) {
      setStatus('ERROR');
      setMessage(t.reset_password_min);
      return;
    }

    setStatus('LOADING');
    try {
      const res = await fetch('/api/auth/reset-password', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, newPassword: password }),
      });
      const data = await res.json();

      if (res.ok) {
        setStatus('SUCCESS');
        setMessage(t.reset_success);
      } else {
        setStatus('ERROR');
        setMessage(data.error || t.common_error);
      }
    } catch {
      setStatus('ERROR');
      setMessage(t.network_error);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-indigo-500 via-purple-500 to-pink-500 relative overflow-hidden p-4">
      <div className="absolute top-[-10%] left-[-10%] w-96 h-96 bg-white/10 rounded-full blur-3xl mix-blend-overlay" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[30rem] h-[30rem] bg-blue-500/20 rounded-3xl blur-3xl mix-blend-overlay" />

      <div className="w-full max-w-md bg-white/10 backdrop-blur-xl border border-white/20 rounded-3xl shadow-[0_8px_32px_0_rgba(31,38,135,0.37)] overflow-hidden p-8 relative z-10">
        <Link href="/login" className="inline-flex items-center text-indigo-100 hover:text-white transition-colors mb-6 text-sm">
          <ArrowLeft className="w-4 h-4 mr-1" /> {t.back_to_login}
        </Link>

        <div className="text-center mb-8">
          <h2 className="text-2xl font-bold text-white mb-2 tracking-tight">{t.reset_title}</h2>
          <p className="text-indigo-100/80 text-sm">{t.reset_desc}</p>
        </div>

        {status === 'SUCCESS' ? (
          <div className="bg-green-500/10 border border-green-500/50 text-green-100 p-6 rounded-xl text-center">
            <p className="mb-4 text-sm">{message}</p>
            <Link href="/login" className="inline-block py-2 px-4 bg-white/20 text-white rounded-lg hover:bg-white/30 transition-colors text-sm font-medium">
              {t.login_button}
            </Link>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="space-y-1">
              <label className="text-sm font-medium text-indigo-100" htmlFor="password">{t.new_password}</label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Lock className="h-5 w-5 text-indigo-200" />
                </div>
                <input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="********"
                  required
                  className="w-full pl-10 pr-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder-indigo-200/50 focus:outline-none focus:ring-2 focus:ring-white/50 focus:border-transparent transition-all"
                />
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-sm font-medium text-indigo-100" htmlFor="confirmPassword">{t.confirm_password}</label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Lock className="h-5 w-5 text-indigo-200" />
                </div>
                <input
                  id="confirmPassword"
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="********"
                  required
                  className="w-full pl-10 pr-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder-indigo-200/50 focus:outline-none focus:ring-2 focus:ring-white/50 focus:border-transparent transition-all"
                />
              </div>
            </div>

            {status === 'ERROR' && (
              <div className="text-red-300 text-sm">{message}</div>
            )}

            <button
              type="submit"
              disabled={status === 'LOADING' || !token}
              className="w-full py-3 px-4 bg-white text-indigo-600 font-semibold rounded-xl shadow-lg hover:bg-indigo-50 focus:outline-none transition-all disabled:opacity-50"
            >
              {status === 'LOADING' ? t.changing : t.reset_submit}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
