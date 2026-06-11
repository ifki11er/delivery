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
    <div className="relative flex min-h-dvh items-center justify-center overflow-hidden bg-[#061c4a] p-4 text-white">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_18%_18%,rgba(30,92,170,0.45),transparent_34%),linear-gradient(160deg,#071a46_0%,#05225a_52%,#03143b_100%)]" />
      <div className="absolute -right-24 -top-28 h-[430px] w-44 rotate-[-38deg] rounded-[42px] bg-[#35d0bf] opacity-80 shadow-[0_0_32px_rgba(53,208,191,0.35)] sm:h-[520px] sm:w-56" />
      <div className="absolute -right-28 top-12 h-[430px] w-44 rotate-[-38deg] rounded-[42px] bg-[#20b9ac] opacity-90 sm:h-[520px] sm:w-56" />
      <div className="absolute left-0 top-[34%] h-44 w-72 -skew-x-[18deg] bg-[#092150]/45" />
      <div className="absolute bottom-0 left-0 h-80 w-full bg-[linear-gradient(180deg,transparent,rgba(0,15,46,0.78))]" />

      <div className="w-full max-w-md bg-[#09285a]/70 backdrop-blur-xl border border-white/20 rounded-3xl shadow-[0_8px_32px_0_rgba(0,0,0,0.25)] overflow-hidden p-8 relative z-10">
        <Link href="/login" className="inline-flex items-center text-white/65 hover:text-white transition-colors mb-6 text-sm">
          <ArrowLeft className="w-4 h-4 mr-1" /> {t.auth_back}
        </Link>

        <div className="text-center mb-8">
          <h2 className="text-2xl font-bold text-white mb-2 tracking-tight">{t.forgot_title}</h2>
          <p className="text-white/60 text-sm">{t.forgot_desc}</p>
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
              <label className="text-sm font-medium text-white/80" htmlFor="email">{t.email_address}</label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Mail className="h-5 w-5 text-[#37d0bf]" />
                </div>
                <input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="name@example.com"
                  required
                  className="w-full pl-10 pr-4 py-3 bg-[#09285a]/70 border border-white/20 rounded-xl text-white placeholder-white/40 focus:outline-none focus:ring-2 focus:ring-[#37d0bf]/30 focus:border-[#37d0bf]/60 transition-all"
                />
              </div>
            </div>

            {status === 'ERROR' && (
              <div className="text-red-300 text-sm">{message}</div>
            )}

            <button
              type="submit"
              disabled={status === 'LOADING'}
              className="w-full py-3 px-4 bg-[#37d0bf] text-[#03143b] font-black rounded-xl shadow-lg hover:bg-[#45dece] focus:outline-none transition-all disabled:opacity-50"
            >
              {status === 'LOADING' ? t.processing : t.forgot_submit}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
