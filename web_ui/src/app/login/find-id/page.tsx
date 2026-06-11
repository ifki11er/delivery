'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Phone, ArrowLeft, Mail, AlertCircle } from 'lucide-react';
import { useI18n } from '@/i18n/I18nProvider';

export default function FindIdPage() {
  const t = useI18n();
  const [phoneNumber, setPhoneNumber] = useState('');
  const [status, setStatus] = useState<'IDLE' | 'LOADING' | 'SUCCESS_EMAIL' | 'SUCCESS_SOCIAL' | 'ERROR'>('IDLE');
  const [result, setResult] = useState<string | null>(null);
  const [message, setMessage] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!phoneNumber) return;

    setStatus('LOADING');
    try {
      const res = await fetch('/api/auth/find-id', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phoneNumber }),
      });
      const data = await res.json();

      if (res.ok) {
        if (data.type === 'SOCIAL') {
          setStatus('SUCCESS_SOCIAL');
          setResult(data.provider);
        } else {
          setStatus('SUCCESS_EMAIL');
          setResult(data.email);
        }
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
          <h2 className="text-2xl font-bold text-white mb-2 tracking-tight">{t.find_id_title}</h2>
          <p className="text-white/60 text-sm">{t.find_id_desc}</p>
        </div>

        {status === 'SUCCESS_EMAIL' ? (
          <div className="bg-indigo-500/20 border border-indigo-400/50 text-white p-6 rounded-xl text-center space-y-4">
            <Mail className="w-10 h-10 mx-auto text-[#37d0bf]" />
            <div>
              <p className="text-sm text-white/70 mb-1">{t.find_id_email_result}</p>
              <p className="text-xl font-bold tracking-wider">{result}</p>
            </div>
            <div className="flex gap-2 pt-4">
              <Link href="/login" className="flex-1 py-2 px-4 bg-[#37d0bf] text-[#03143b] rounded-lg hover:bg-[#45dece] transition-colors text-sm font-bold shadow">
                {t.login_button}
              </Link>
              <Link href="/login/forgot" className="flex-1 py-2 px-4 bg-white/10 text-white border border-white/20 rounded-lg hover:bg-white/20 transition-colors text-sm font-bold">
                {t.find_password}
              </Link>
            </div>
          </div>
        ) : status === 'SUCCESS_SOCIAL' ? (
          <div className="bg-yellow-500/20 border border-yellow-400/50 text-white p-6 rounded-xl text-center space-y-4">
            <AlertCircle className="w-10 h-10 mx-auto text-yellow-300" />
            <div>
              <p className="text-sm text-white/70 mb-1">{t.find_id_social_prefix}</p>
              <p className="text-lg font-bold">
                <span className="text-yellow-300 uppercase">{result}</span> {t.find_id_social_provider}
              </p>
              <p className="text-sm text-white/70 mt-1">{t.find_id_social_suffix}</p>
            </div>
            <div className="pt-4">
              <Link href="/login" className="block w-full py-2 px-4 bg-[#37d0bf] text-[#03143b] rounded-lg hover:bg-[#45dece] transition-colors text-sm font-bold shadow">
                {t.find_id_go_social}
              </Link>
            </div>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="space-y-1">
              <label className="text-sm font-medium text-white/80" htmlFor="phoneNumber">{t.phone_number}</label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Phone className="h-5 w-5 text-[#37d0bf]" />
                </div>
                <input
                  id="phoneNumber"
                  type="tel"
                  value={phoneNumber}
                  onChange={(e) => setPhoneNumber(e.target.value)}
                  placeholder={t.phone_digits_placeholder}
                  required
                  className="w-full pl-10 pr-4 py-3 bg-[#09285a]/70 border border-white/20 rounded-xl text-white placeholder-white/40 focus:outline-none focus:ring-2 focus:ring-[#37d0bf]/30 focus:border-[#37d0bf]/60 transition-all"
                />
              </div>
            </div>

            {status === 'ERROR' && (
              <div className="text-red-300 text-sm text-center bg-red-500/10 p-3 rounded-lg border border-red-500/20">
                {message}
              </div>
            )}

            <button
              type="submit"
              disabled={status === 'LOADING'}
              className="w-full py-3 px-4 bg-[#37d0bf] text-[#03143b] font-black rounded-xl shadow-lg hover:bg-[#45dece] focus:outline-none transition-all disabled:opacity-50"
            >
              {status === 'LOADING' ? t.find_id_loading : t.find_id_submit}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
