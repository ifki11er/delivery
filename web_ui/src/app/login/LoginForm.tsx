'use client';

import { useState } from 'react';
import Link from 'next/link';
import { signIn } from 'next-auth/react';
import { Lock, Mail } from 'lucide-react';
import { useSearchParams } from 'next/navigation';
import { useI18n } from '@/i18n/I18nProvider';

export default function LoginForm() {
  const t = useI18n();
  const searchParams = useSearchParams();
  const initialMessage = searchParams?.get('message');
  const [errorMsg, setErrorMsg] = useState(initialMessage || '');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (loading) return;

    setLoading(true);
    setErrorMsg('');

    const formData = new FormData(event.currentTarget);
    const email = formData.get('email') as string;
    const password = formData.get('password') as string;

    const res = await signIn('credentials', {
      email,
      password,
      redirect: false,
    });

    if (res?.error) {
      setErrorMsg(t.login_invalid_credentials);
      setLoading(false);
      return;
    }

    if (res?.ok) {
      window.location.href = '/';
    }
  };

  return (
    <>
      {errorMsg && (
        <div className="bg-red-500/10 border border-red-500/50 text-red-100 p-4 rounded-xl mb-6 text-sm text-center animate-in fade-in slide-in-from-top-4">
          {errorMsg}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-5">
        <div className="space-y-1">
          <label className="text-sm font-medium text-indigo-100" htmlFor="email">
            {t.login_email}
          </label>
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <Mail className="h-5 w-5 text-indigo-200" />
            </div>
            <input
              id="email"
              name="email"
              type="email"
              placeholder="name@example.com"
              required
              className="w-full pl-10 pr-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder-indigo-200/50 focus:outline-none focus:ring-2 focus:ring-white/50 focus:border-transparent transition-all"
            />
          </div>
        </div>

        <div className="space-y-1">
          <div className="flex justify-between items-center">
            <label className="text-sm font-medium text-indigo-100" htmlFor="password">
              {t.login_pw}
            </label>
            <div className="flex space-x-2">
              <Link href="/login/find-id" className="text-xs text-indigo-200 hover:text-white transition-colors">
                {t.login_find_email}
              </Link>
              <span className="text-xs text-indigo-200">|</span>
              <Link href="/login/forgot" className="text-xs text-indigo-200 hover:text-white transition-colors">
                {t.login_find_password}
              </Link>
            </div>
          </div>
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <Lock className="h-5 w-5 text-indigo-200" />
            </div>
            <input
              id="password"
              name="password"
              type="password"
              placeholder="••••••••"
              required
              className="w-full pl-10 pr-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder-indigo-200/50 focus:outline-none focus:ring-2 focus:ring-white/50 focus:border-transparent transition-all"
            />
          </div>
        </div>

        <button
          type="submit"
          disabled={loading}
          className={`w-full py-3 px-4 bg-white text-indigo-600 font-semibold rounded-xl shadow-lg hover:bg-indigo-50 focus:outline-none focus:ring-2 focus:ring-white focus:ring-offset-2 focus:ring-offset-indigo-500 transition-all active:scale-[0.98] ${loading ? 'opacity-70 cursor-not-allowed' : ''}`}
        >
          {loading ? t.login_processing : t.login_email_continue}
        </button>
      </form>

      <div className="mt-8 relative">
        <div className="absolute inset-0 flex items-center">
          <div className="w-full border-t border-white/20" />
        </div>
        <div className="relative flex justify-center text-sm">
          <span className="px-2 bg-transparent text-indigo-100 bg-gradient-to-r from-[#8165cc] to-[#995ca7]">
            {t.login_social_divider}
          </span>
        </div>
      </div>

      <div className="mt-6 grid grid-cols-2 gap-4">
        <button
          onClick={() => signIn('kakao', { callbackUrl: '/' })}
          type="button"
          disabled={loading}
          className="w-full py-3 px-4 bg-[#FEE500] hover:bg-[#FEE500]/90 text-[#000000] font-semibold rounded-xl shadow-md transition-all active:scale-[0.98] flex items-center justify-center gap-2"
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
            <path d="M12 3C6.477 3 2 6.541 2 10.909c0 2.809 1.83 5.26 4.673 6.648-.22.825-.794 2.993-.822 3.125-.035.166.052.164.12.118.053-.035 3.32-2.222 4.622-3.1 1.108.156 2.253.238 3.407.238 5.523 0 10-3.541 10-7.909C24 6.541 19.523 3 12 3z" />
          </svg>
          Kakao
        </button>
        <button
          onClick={() => signIn('google', { callbackUrl: '/' })}
          type="button"
          disabled={loading}
          className="w-full py-3 px-4 bg-white/10 hover:bg-white/20 border border-white/20 text-white font-semibold rounded-xl shadow-md transition-all active:scale-[0.98] flex items-center justify-center gap-2"
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
            <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
            <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
            <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
            <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
          </svg>
          Google
        </button>
      </div>
    </>
  );
}
