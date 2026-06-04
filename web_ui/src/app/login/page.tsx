import { Suspense } from 'react';
import { KeyRound } from 'lucide-react';
import { getI18n } from '@/i18n/server';
import LoginForm from './LoginForm';

export default async function LoginPage() {
  const t = (await getI18n()) as Record<string, string>;

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-indigo-500 via-purple-500 to-pink-500 relative overflow-hidden p-4">
      <div className="absolute top-[-10%] left-[-10%] w-96 h-96 bg-white/10 rounded-full blur-3xl mix-blend-overlay" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[30rem] h-[30rem] bg-blue-500/20 rounded-full blur-3xl mix-blend-overlay" />

      <div className="w-full max-w-md bg-white/10 backdrop-blur-xl border border-white/20 rounded-3xl shadow-[0_8px_32px_0_rgba(31,38,135,0.37)] overflow-hidden transition-all duration-300 hover:shadow-[0_8px_40px_0_rgba(31,38,135,0.45)] p-8 relative z-10">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-white/20 mb-4 shadow-inner">
            <KeyRound className="w-8 h-8 text-white" />
          </div>
          <h2 className="text-3xl font-bold text-white mb-2 tracking-tight">{t.login_welcome}</h2>
          <p className="text-indigo-100/80">{t.login_continue_desc}</p>
        </div>

        <Suspense fallback={<div className="mx-auto my-4 h-6 w-6 rounded-full border-2 border-white/30 border-t-white animate-spin" />}>
          <LoginForm />
        </Suspense>
      </div>
    </div>
  );
}
