import { Suspense } from 'react';
import { getI18n } from '@/i18n/server';
import LoginForm from './LoginForm';
import AuthShell from './AuthShell';

export default async function LoginPage() {
  const t = (await getI18n()) as Record<string, string>;

  return (
    <AuthShell subtitle={t.login_continue_desc}>
      <Suspense fallback={<div className="mx-auto my-4 h-6 w-6 animate-spin rounded-full border-2 border-white/20 border-t-white" />}>
        <LoginForm mode="login" />
      </Suspense>
    </AuthShell>
  );
}
