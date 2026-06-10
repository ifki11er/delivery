import { Suspense } from 'react';
import Image from 'next/image';
import { getI18n } from '@/i18n/server';
import LoginForm from './LoginForm';

export default async function LoginPage() {
  const t = (await getI18n()) as Record<string, string>;

  return (
    <div className="flex min-h-screen items-center justify-center p-4">
      <div className="relative z-10 w-full max-w-md overflow-hidden rounded-3xl border border-gray-100 bg-white p-8 shadow-xl">
        <div className="text-center mb-8">
          <div className="mb-4 inline-flex h-20 w-20 items-center justify-center overflow-hidden rounded-2xl">
            <Image
              src="/app_icon.png"
              alt="WorkLink"
              width={80}
              height={80}
              priority
              className="h-full w-full object-cover"
            />
          </div>
          <h2 className="text-3xl font-bold text-gray-900 mb-2 tracking-tight">{t.login_welcome}</h2>
          <p className="text-gray-500">{t.login_continue_desc}</p>
        </div>

        <Suspense fallback={<div className="mx-auto my-4 h-6 w-6 animate-spin rounded-full border-2 border-gray-200 border-t-gray-900" />}>
          <LoginForm mode="login" />
        </Suspense>
      </div>
    </div>
  );
}
