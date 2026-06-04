'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Mail, ArrowLeft } from 'lucide-react';
import { useI18n } from '@/i18n/I18nProvider';

export default function ForgotPasswordPage() {
  const t = useI18n();
  const [email, setEmail] = useState('');
  const [status, setStatus] = useState<'IDLE' | 'LOADING' | 'SUCCESS' | 'ERROR'>('IDLE');
  const [message, setMessage] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) return;

    setStatus('LOADING');
    try {
      const res = await fetch('/api/auth/reset-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });
      const data = await res.json();

      if (res.ok) {
        setStatus('SUCCESS');
        setMessage(t.forgot_success);
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
      <div className="absolute bottom-[-10%] right-[-10%] w-[30rem] h-[30rem] bg-blue-500/20 rounded-full blur-3xl mix-blend-overlay" />

      <div className="w-full max-w-md bg-white/10 backdrop-blur-xl border border-white/20 rounded-3xl shadow-[0_8px_32px_0_rgba(31,38,135,0.37)] overflow-hidden p-8 relative z-10">
        <Link href="/login" className="inline-flex items-center text-indigo-100 hover:text-white transition-colors mb-6 text-sm">
          <ArrowLeft className="w-4 h-4 mr-1" /> {t.auth_back}
        </Link>

        <div className="text-center mb-8">
          <h2 className="text-2xl font-bold text-white mb-2 tracking-tight">{t.forgot_title}</h2>
          <p className="text-indigo-100/80 text-sm">{t.forgot_desc}</p>
        </div>

        {status === 'SUCCESS' ? (
          <div className="bg-green-500/10 border border-green-500/50 text-green-100 p-6 rounded-xl text-center">
            <p className="mb-4 text-sm">{message}</p>
            <Link href="/login" className="inline-block py-2 px-4 bg-white/20 text-white rounded-lg hover:bg-white/30 transition-colors text-sm font-medium">
              {t.login_screen}
            </Link>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="space-y-1">
              <label className="text-sm font-medium text-indigo-100" htmlFor="email">{t.email_address}</label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Mail className="h-5 w-5 text-indigo-200" />
                </div>
                <input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="name@example.com"
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
              disabled={status === 'LOADING'}
              className="w-full py-3 px-4 bg-white text-indigo-600 font-semibold rounded-xl shadow-lg hover:bg-indigo-50 focus:outline-none transition-all disabled:opacity-50"
            >
              {status === 'LOADING' ? t.processing : t.forgot_submit}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
