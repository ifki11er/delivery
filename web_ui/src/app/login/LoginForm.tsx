'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { signIn as clientSignIn } from 'next-auth/react';
import { Eye, EyeOff, LoaderCircle, Lock, Mail } from 'lucide-react';
import { useSearchParams } from 'next/navigation';
import { useI18n } from '@/i18n/I18nProvider';
import { signInWithGoogle, signInWithKakao } from '@/app/actions/auth';
import { usePlatform } from '@/hooks/usePlatform';

type NativeGoogleSignInDetail = {
  idToken?: string;
  error?: string;
  errorCode?: string;
};

type LoginFormProps = {
  mode?: 'login' | 'register';
};

export default function LoginForm({ mode = 'login' }: LoginFormProps) {
  const t = useI18n();
  const { platform } = usePlatform();
  const [isMounted, setIsMounted] = useState(false);
  const isApp = isMounted && platform === 'app';
  const searchParams = useSearchParams();
  const initialMessage = searchParams?.get('message');
  const [errorMsg, setErrorMsg] = useState(initialMessage || '');
  const [loading, setLoading] = useState(false);
  const [nativeGoogleLoading, setNativeGoogleLoading] = useState(false);
  const [socialLoading, setSocialLoading] = useState<'kakao' | 'google' | null>(null);
  const [showPassword, setShowPassword] = useState(false);
  const isRegister = mode === 'register';
  const submitText = isRegister
    ? (t.register_email_continue || '이메일로 회원가입')
    : t.login_email_continue;
  const processingText = isRegister
    ? (t.register_processing || '회원가입 처리 중...')
    : t.login_processing;

  useEffect(() => {
    setIsMounted(true);
  }, []);

  useEffect(() => {
    const handleNativeGoogleSignIn = async (event: Event) => {
      const customEvent = event as CustomEvent<NativeGoogleSignInDetail>;
      const idToken = customEvent.detail?.idToken;
      const error = customEvent.detail?.error;
      const errorCode = customEvent.detail?.errorCode;

      if (error || !idToken) {
        setNativeGoogleLoading(false);
        setSocialLoading(null);
        setErrorMsg(errorCode === '10' ? t.login_google_native_config_error : t.login_google_native_failed);
        return;
      }

      const res = await clientSignIn('google-native', {
        idToken,
        redirect: false,
      });

      if (res?.error) {
        setNativeGoogleLoading(false);
        setSocialLoading(null);
        setErrorMsg(t.login_google_native_failed);
        return;
      }

      window.location.href = '/';
    };

    window.addEventListener('android-google-sign-in', handleNativeGoogleSignIn);
    return () => window.removeEventListener('android-google-sign-in', handleNativeGoogleSignIn);
  }, [t.login_google_native_config_error, t.login_google_native_failed]);

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (loading) return;

    setLoading(true);
    setErrorMsg('');

    const formData = new FormData(event.currentTarget);
    const email = formData.get('email') as string;
    const password = formData.get('password') as string;

    if (isRegister) {
      const registerRes = await fetch('/api/auth/register-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });
      const registerData = await registerRes.json();

      if (!registerRes.ok) {
        const message = registerData.error || '회원가입 처리 중 오류가 발생했습니다.';
        setErrorMsg(message);
        setLoading(false);
        return;
      }
    } else {
      const statusRes = await fetch('/api/auth/email-status', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });
      const statusData = await statusRes.json();

      if (!statusRes.ok) {
        const message = statusData.error || t.login_invalid_credentials;
        setErrorMsg(message);
        setLoading(false);
        return;
      }
    }

    const res = await clientSignIn('credentials', {
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
        <div className="mb-6 animate-in rounded-xl border border-red-200 bg-red-50 p-4 text-center text-sm text-red-700 whitespace-pre-line fade-in slide-in-from-top-4">
          {errorMsg}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-5">
        <div className="space-y-1">
          <label className="text-sm font-medium text-gray-700" htmlFor="email">
            {t.login_email}
          </label>
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <Mail className="h-5 w-5 text-gray-400" />
            </div>
            <input
              id="email"
              name="email"
              type="email"
              placeholder="name@example.com"
              required
              className="w-full rounded-xl border border-gray-200 bg-gray-50 py-3 pr-4 pl-10 text-gray-900 placeholder-gray-400 transition-all focus:border-transparent focus:ring-2 focus:ring-gray-900/20 focus:outline-none"
            />
          </div>
        </div>

        <div className="space-y-1">
          <div className="flex justify-between items-center">
            <label className="text-sm font-medium text-gray-700" htmlFor="password">
              {t.login_pw}
            </label>
            <div className="flex space-x-2">
              <Link href="/login/find-id" className="text-xs text-gray-500 transition-colors hover:text-gray-900">
                {t.login_find_email}
              </Link>
              <span className="text-xs text-gray-300">|</span>
              <Link href="/login/forgot" className="text-xs text-gray-500 transition-colors hover:text-gray-900">
                {t.login_find_password}
              </Link>
            </div>
          </div>
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <Lock className="h-5 w-5 text-gray-400" />
            </div>
            <input
              id="password"
              name="password"
              type={showPassword ? 'text' : 'password'}
              placeholder="********"
              required
              className="w-full rounded-xl border border-gray-200 bg-gray-50 py-3 pr-12 pl-10 text-gray-900 placeholder-gray-400 transition-all focus:border-transparent focus:ring-2 focus:ring-gray-900/20 focus:outline-none"
            />
            <button
              type="button"
              onClick={() => setShowPassword((value) => !value)}
              className="absolute inset-y-0 right-0 flex items-center pr-3 text-gray-400 transition-colors hover:text-gray-900"
              aria-label={showPassword ? '비밀번호 숨기기' : '비밀번호 보기'}
              title={showPassword ? '비밀번호 숨기기' : '비밀번호 보기'}
            >
              {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
            </button>
          </div>
        </div>

        <button
          type="submit"
          disabled={loading}
          className={`w-full rounded-xl bg-gray-900 px-4 py-3 font-semibold text-white shadow-lg transition-all hover:bg-gray-800 focus:ring-2 focus:ring-gray-900 focus:ring-offset-2 focus:outline-none active:scale-[0.98] ${loading ? 'cursor-not-allowed opacity-70' : ''}`}
        >
          {loading ? processingText : submitText}
        </button>
      </form>

      <div className="mt-8 relative">
        <div className="absolute inset-0 flex items-center">
          <div className="w-full border-t border-gray-200" />
        </div>
        <div className="relative flex justify-center text-sm">
          <span className="bg-white px-2 text-gray-500">
            {t.login_social_divider}
          </span>
        </div>
      </div>

      <div className="mt-6 grid grid-cols-2 gap-4">
        <form action={signInWithKakao} onSubmit={() => setSocialLoading('kakao')}>
          <button
            type="submit"
            disabled={loading || socialLoading !== null}
            className="relative w-full py-3 px-4 bg-[#FEE500] hover:bg-[#FEE500]/90 text-[#000000] font-semibold rounded-xl shadow-md transition-all active:scale-[0.98] flex items-center justify-center gap-2 disabled:opacity-70 disabled:cursor-not-allowed"
          >
            <span className={`flex items-center justify-center gap-2 ${socialLoading === 'kakao' ? 'opacity-0' : ''}`}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
                <path d="M12 3C6.477 3 2 6.541 2 10.909c0 2.809 1.83 5.26 4.673 6.648-.22.825-.794 2.993-.822 3.125-.035.166.052.164.12.118.053-.035 3.32-2.222 4.622-3.1 1.108.156 2.253.238 3.407.238 5.523 0 10-3.541 10-7.909C24 6.541 19.523 3 12 3z" />
              </svg>
              Kakao
            </span>
            {socialLoading === 'kakao' && <LoaderCircle className="absolute h-4 w-4 animate-spin" />}
          </button>
        </form>

        {isApp ? (
          <button
            type="button"
            disabled={loading || socialLoading !== null || nativeGoogleLoading}
            onClick={() => {
              setErrorMsg('');
              setNativeGoogleLoading(true);
              setSocialLoading('google');
              if (!window.AndroidBridge?.signInWithGoogle) {
                setNativeGoogleLoading(false);
                setSocialLoading(null);
                setErrorMsg(t.login_google_native_failed);
                return;
              }
              window.AndroidBridge.signInWithGoogle();
            }}
            className="relative flex w-full items-center justify-center gap-2 rounded-xl border border-gray-200 bg-white px-4 py-3 font-semibold text-gray-700 shadow-md transition-all hover:bg-gray-50 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-70"
          >
            <span className={`flex items-center justify-center gap-2 ${nativeGoogleLoading ? 'opacity-0' : ''}`}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
                <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
                <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
                <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
                <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
              </svg>
              Google
            </span>
            {nativeGoogleLoading && <LoaderCircle className="absolute h-4 w-4 animate-spin" />}
          </button>
        ) : (
          <form action={signInWithGoogle} onSubmit={() => setSocialLoading('google')}>
            <button
              type="submit"
              disabled={loading || socialLoading !== null}
              className="relative flex w-full items-center justify-center gap-2 rounded-xl border border-gray-200 bg-white px-4 py-3 font-semibold text-gray-700 shadow-md transition-all hover:bg-gray-50 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-70"
            >
              <span className={`flex items-center justify-center gap-2 ${socialLoading === 'google' ? 'opacity-0' : ''}`}>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
                  <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
                  <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
                  <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
                </svg>
                Google
              </span>
              {socialLoading === 'google' && <LoaderCircle className="absolute h-4 w-4 animate-spin" />}
            </button>
          </form>
        )}
      </div>

      <div className="mt-6 text-center text-sm text-gray-500">
        {isRegister ? (t.register_has_account || '이미 계정이 있으신가요?') : t.login_no_account}
        <Link
          href={isRegister ? '/login' : '/login/register'}
          className="ml-2 font-bold text-gray-900 underline underline-offset-4 hover:text-gray-600"
        >
          {isRegister ? t.login_btn : t.login_register}
        </Link>
      </div>
    </>
  );
}
