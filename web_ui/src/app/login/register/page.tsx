import { Suspense } from 'react';
import { getI18n } from '@/i18n/server';
import LoginForm from '../LoginForm';
import AuthShell from '../AuthShell';

export default async function RegisterPage() {
  const t = (await getI18n()) as Record<string, string>;

  return (
    <AuthShell subtitle={t.register_continue_desc || '계정을 만들고 서비스를 시작하세요'}>
      <Suspense fallback={<div className="mx-auto my-4 h-6 w-6 rounded-full border-2 border-white/30 border-t-white animate-spin" />}>
        <LoginForm mode="register" />
      </Suspense>
    </AuthShell>
  );
}
