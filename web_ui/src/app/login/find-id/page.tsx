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
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-indigo-500 via-purple-500 to-pink-500 relative overflow-hidden p-4">
      <div className="absolute top-[-10%] left-[-10%] w-96 h-96 bg-white/10 rounded-full blur-3xl mix-blend-overlay" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[30rem] h-[30rem] bg-blue-500/20 rounded-full blur-3xl mix-blend-overlay" />

      <div className="w-full max-w-md bg-white/10 backdrop-blur-xl border border-white/20 rounded-3xl shadow-[0_8px_32px_0_rgba(31,38,135,0.37)] overflow-hidden p-8 relative z-10">
        <Link href="/login" className="inline-flex items-center text-indigo-100 hover:text-white transition-colors mb-6 text-sm">
          <ArrowLeft className="w-4 h-4 mr-1" /> {t.auth_back}
        </Link>

        <div className="text-center mb-8">
          <h2 className="text-2xl font-bold text-white mb-2 tracking-tight">{t.find_id_title}</h2>
          <p className="text-indigo-100/80 text-sm">{t.find_id_desc}</p>
        </div>

        {status === 'SUCCESS_EMAIL' ? (
          <div className="bg-indigo-500/20 border border-indigo-400/50 text-white p-6 rounded-xl text-center space-y-4">
            <Mail className="w-10 h-10 mx-auto text-indigo-300" />
            <div>
              <p className="text-sm text-indigo-100 mb-1">{t.find_id_email_result}</p>
              <p className="text-xl font-bold tracking-wider">{result}</p>
            </div>
            <div className="flex gap-2 pt-4">
              <Link href="/login" className="flex-1 py-2 px-4 bg-white text-indigo-600 rounded-lg hover:bg-indigo-50 transition-colors text-sm font-bold shadow">
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
              <p className="text-sm text-indigo-100 mb-1">{t.find_id_social_prefix}</p>
              <p className="text-lg font-bold">
                <span className="text-yellow-300 uppercase">{result}</span> {t.find_id_social_provider}
              </p>
              <p className="text-sm text-indigo-100 mt-1">{t.find_id_social_suffix}</p>
            </div>
            <div className="pt-4">
              <Link href="/login" className="block w-full py-2 px-4 bg-white text-indigo-600 rounded-lg hover:bg-indigo-50 transition-colors text-sm font-bold shadow">
                {t.find_id_go_social}
              </Link>
            </div>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="space-y-1">
              <label className="text-sm font-medium text-indigo-100" htmlFor="phoneNumber">{t.phone_number}</label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Phone className="h-5 w-5 text-indigo-200" />
                </div>
                <input
                  id="phoneNumber"
                  type="tel"
                  value={phoneNumber}
                  onChange={(e) => setPhoneNumber(e.target.value)}
                  placeholder={t.phone_digits_placeholder}
                  required
                  className="w-full pl-10 pr-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder-indigo-200/50 focus:outline-none focus:ring-2 focus:ring-white/50 focus:border-transparent transition-all"
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
              className="w-full py-3 px-4 bg-white text-indigo-600 font-semibold rounded-xl shadow-lg hover:bg-indigo-50 focus:outline-none transition-all disabled:opacity-50"
            >
              {status === 'LOADING' ? t.find_id_loading : t.find_id_submit}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
