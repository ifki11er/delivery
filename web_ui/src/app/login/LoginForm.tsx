'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { signIn as clientSignIn } from 'next-auth/react';
import { Eye, EyeOff, LoaderCircle, Lock, Mail } from 'lucide-react';
import { useSearchParams } from 'next/navigation';
import { useI18n } from '@/i18n/I18nProvider';
import { signInWithGoogle, signInWithKakao } from '@/app/actions/auth';
import { usePlatform } from '@/hooks/usePlatform';
import { useFeedback } from '@/components/providers/FeedbackProvider';

type NativeGoogleSignInDetail = {
  idToken?: string;
  error?: string;
  errorCode?: string;
};

type LoginFormProps = {
  mode?: 'login' | 'register';
};

function GoogleMark() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
      <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
      <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
      <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
      <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
    </svg>
  );
}

export default function LoginForm({ mode = 'login' }: LoginFormProps) {
  const t = useI18n();
  const { confirm } = useFeedback();
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
  const submitText = isRegister ? (t.register_email_continue || '회원가입') : t.login_btn;
  const processingText = isRegister ? (t.register_processing || '회원가입 처리 중...') : t.login_processing;
  const submitButtonClass = isRegister
    ? 'bg-[#f59e0b] text-[#1f1300] shadow-[0_12px_28px_rgba(245,158,11,0.24)] hover:bg-[#fbbf24] focus:ring-[#f59e0b]'
    : 'bg-[#37d0bf] text-[#03143b] shadow-[0_12px_28px_rgba(55,208,191,0.22)] hover:bg-[#45dece] focus:ring-[#37d0bf]';

  useEffect(() => {
    setIsMounted(true);
  }, []);

  useEffect(() => {
    if (mode !== 'login') return;

    const handleAndroidBack = async () => {
      if (await confirm({
        title: '앱 종료',
        message: '종료하시겠습니까?',
        confirmText: '종료',
        cancelText: '취소',
        danger: true,
      })) {
        const closedByApp = window.AndroidBridge?.finishApp?.() ?? false;
        if (!closedByApp) {
          window.close();
        }
      }
    };

    window.addEventListener('worklink-android-back', handleAndroidBack);
    return () => window.removeEventListener('worklink-android-back', handleAndroidBack);
  }, [confirm, mode]);

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
        setErrorMsg(registerData.error || '회원가입 처리 중 오류가 발생했습니다.');
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
        setErrorMsg(statusData.error || t.login_invalid_credentials);
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
      {errorMsg ? (
        <div className="mb-4 animate-in rounded-2xl border border-red-300/30 bg-red-500/15 p-3 text-center text-xs font-bold text-red-100 whitespace-pre-line fade-in slide-in-from-top-4">
          {errorMsg}
        </div>
      ) : null}

      <form onSubmit={handleSubmit} className="space-y-4 sm:space-y-5">
        <div className="space-y-2">
          <label className="text-base font-black text-white/90 sm:text-lg" htmlFor="email">
            {t.login_email}
          </label>
          <div className="relative">
            <div className="absolute inset-y-0 left-0 flex items-center pl-5 pointer-events-none">
              <Mail className="h-5 w-5 text-[#37d0bf] sm:h-6 sm:w-6" />
            </div>
            <input
              id="email"
              name="email"
              type="email"
              placeholder="name@example.com"
              required
              className="h-12 w-full rounded-2xl border border-white/20 bg-[#09285a]/70 py-2 pr-4 pl-16 text-base font-bold text-white placeholder-white/40 shadow-[inset_0_0_0_1px_rgba(255,255,255,0.04)] transition-all focus:border-[#37d0bf]/70 focus:ring-2 focus:ring-[#37d0bf]/25 focus:outline-none sm:h-14 sm:text-lg"
            />
          </div>
        </div>

        <div className="space-y-2">
          <div className="flex items-center justify-between gap-3">
            <label className="text-base font-black text-white/90 sm:text-lg" htmlFor="password">
              {t.login_pw}
            </label>
          </div>
          <div className="relative">
            <div className="absolute inset-y-0 left-0 flex items-center pl-5 pointer-events-none">
              <Lock className="h-5 w-5 text-[#37d0bf] sm:h-6 sm:w-6" />
            </div>
            <input
              id="password"
              name="password"
              type={showPassword ? 'text' : 'password'}
              placeholder="********"
              required
              className="h-12 w-full rounded-2xl border border-white/20 bg-[#09285a]/70 py-2 pr-14 pl-16 text-base font-bold text-white placeholder-white/40 shadow-[inset_0_0_0_1px_rgba(255,255,255,0.04)] transition-all focus:border-[#37d0bf]/70 focus:ring-2 focus:ring-[#37d0bf]/25 focus:outline-none sm:h-14 sm:text-lg"
            />
            <button
              type="button"
              onClick={() => setShowPassword((value) => !value)}
              className="absolute inset-y-0 right-0 flex items-center pr-5 text-[#37d0bf] transition-colors hover:text-white"
              aria-label={showPassword ? '비밀번호 숨기기' : '비밀번호 보기'}
              title={showPassword ? '비밀번호 숨기기' : '비밀번호 보기'}
            >
              {showPassword ? <EyeOff className="h-5 w-5 sm:h-6 sm:w-6" /> : <Eye className="h-5 w-5 sm:h-6 sm:w-6" />}
            </button>
          </div>
          {!isRegister ? (
            <div className="flex justify-end space-x-2 pt-1">
              <Link href="/login/find-id" className="text-xs font-bold text-white/55 transition-colors hover:text-white sm:text-sm">
                {t.login_find_email}
              </Link>
              <span className="text-xs text-white/25 sm:text-sm">|</span>
              <Link href="/login/forgot" className="text-xs font-bold text-white/55 transition-colors hover:text-white sm:text-sm">
                {t.login_find_password}
              </Link>
            </div>
          ) : null}
        </div>

        <button
          type="submit"
          disabled={loading}
          className={`mt-2 h-[52px] w-full rounded-2xl px-4 py-3 text-lg font-black transition-all focus:ring-2 focus:ring-offset-2 focus:ring-offset-[#061c4a] focus:outline-none active:scale-[0.98] sm:h-14 sm:text-xl ${submitButtonClass} ${loading ? 'cursor-not-allowed opacity-70' : ''}`}
        >
          {loading ? processingText : submitText}
        </button>
      </form>

      <div className="mt-5 relative sm:mt-7">
        <div className="absolute inset-0 flex items-center">
          <div className="w-full border-t border-white/20" />
        </div>
        <div className="relative flex justify-center text-sm">
          <span className="bg-[#061d4c] px-4 font-bold text-white/55">
            {t.login_social_divider}
          </span>
        </div>
      </div>

      <div className="mt-5 grid grid-cols-2 gap-3 sm:mt-6 sm:gap-4">
        <form action={signInWithKakao} onSubmit={() => setSocialLoading('kakao')}>
          <button
            type="submit"
            disabled={loading || socialLoading !== null}
            className="relative flex h-12 w-full items-center justify-center gap-2 rounded-2xl bg-[#FEE500] px-4 font-black text-black shadow-md transition-all hover:bg-[#FEE500]/90 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-70 sm:h-14"
          >
            <span className={`flex items-center justify-center gap-2 ${socialLoading === 'kakao' ? 'opacity-0' : ''}`}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
                <path d="M12 3C6.477 3 2 6.541 2 10.909c0 2.809 1.83 5.26 4.673 6.648-.22.825-.794 2.993-.822 3.125-.035.166.052.164.12.118.053-.035 3.32-2.222 4.622-3.1 1.108.156 2.253.238 3.407.238 5.523 0 10-3.541 10-7.909C24 6.541 19.523 3 12 3z" />
              </svg>
              Kakao
            </span>
            {socialLoading === 'kakao' ? <LoaderCircle className="absolute h-4 w-4 animate-spin" /> : null}
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
            className="relative flex h-12 w-full items-center justify-center gap-2 rounded-2xl border border-white/70 bg-white px-4 font-black text-[#10234a] shadow-md transition-all hover:bg-gray-50 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-70 sm:h-14"
          >
            <span className={`flex items-center justify-center gap-2 ${nativeGoogleLoading ? 'opacity-0' : ''}`}>
              <GoogleMark />
              Google
            </span>
            {nativeGoogleLoading ? <LoaderCircle className="absolute h-4 w-4 animate-spin" /> : null}
          </button>
        ) : (
          <form action={signInWithGoogle} onSubmit={() => setSocialLoading('google')}>
            <button
              type="submit"
              disabled={loading || socialLoading !== null}
              className="relative flex h-12 w-full items-center justify-center gap-2 rounded-2xl border border-white/70 bg-white px-4 font-black text-[#10234a] shadow-md transition-all hover:bg-gray-50 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-70 sm:h-14"
            >
              <span className={`flex items-center justify-center gap-2 ${socialLoading === 'google' ? 'opacity-0' : ''}`}>
                <GoogleMark />
                Google
              </span>
              {socialLoading === 'google' ? <LoaderCircle className="absolute h-4 w-4 animate-spin" /> : null}
            </button>
          </form>
        )}
      </div>

      <div className="mt-5 text-center text-sm font-bold text-white/55 sm:mt-7 sm:text-base">
        {isRegister ? (t.register_has_account || '이미 계정이 있으신가요?') : t.login_no_account}
        <Link
          href={isRegister ? '/login' : '/login/register'}
          className="ml-2 font-black text-[#37d0bf] underline underline-offset-4 hover:text-white"
        >
          {isRegister ? t.login_btn : t.login_register}
        </Link>
      </div>
    </>
  );
}
