import Link from 'next/link'
import { login, signInWithKakao, signInWithGoogle } from '@/app/actions/auth'
import { Mail, Lock, KeyRound } from 'lucide-react'

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ message: string }>
}) {
  const resolvedSearchParams = await searchParams;
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-indigo-500 via-purple-500 to-pink-500 relative overflow-hidden p-4">
      {/* Decorative background elements */}
      <div className="absolute top-[-10%] left-[-10%] w-96 h-96 bg-white/10 rounded-full blur-3xl mix-blend-overlay"></div>
      <div className="absolute bottom-[-10%] right-[-10%] w-[30rem] h-[30rem] bg-blue-500/20 rounded-full blur-3xl mix-blend-overlay"></div>

      <div className="w-full max-w-md bg-white/10 backdrop-blur-xl border border-white/20 rounded-3xl shadow-[0_8px_32px_0_rgba(31,38,135,0.37)] overflow-hidden transition-all duration-300 hover:shadow-[0_8px_40px_0_rgba(31,38,135,0.45)] p-8 relative z-10">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-white/20 mb-4 shadow-inner">
            <KeyRound className="w-8 h-8 text-white" />
          </div>
          <h2 className="text-3xl font-bold text-white mb-2 tracking-tight">환영합니다</h2>
          <p className="text-indigo-100/80">계정에 로그인하여 계속하세요</p>
        </div>

        {resolvedSearchParams?.message && (
          <div className="bg-red-500/10 border border-red-500/50 text-red-100 p-4 rounded-xl mb-6 text-sm text-center animate-in fade-in slide-in-from-top-4">
            {resolvedSearchParams.message}
          </div>
        )}

        <form action={login} className="space-y-5">
          <div className="space-y-1">
            <label className="text-sm font-medium text-indigo-100" htmlFor="email">이메일</label>
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
              <label className="text-sm font-medium text-indigo-100" htmlFor="password">비밀번호</label>
              <a href="#" className="text-xs text-indigo-200 hover:text-white transition-colors">비밀번호 찾기</a>
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
            className="w-full py-3 px-4 bg-white text-indigo-600 font-semibold rounded-xl shadow-lg hover:bg-indigo-50 focus:outline-none focus:ring-2 focus:ring-white focus:ring-offset-2 focus:ring-offset-indigo-500 transition-all active:scale-[0.98]"
          >
            이메일로 계속하기 (로그인/가입)
          </button>
        </form>

        <div className="mt-8 relative">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-white/20"></div>
          </div>
          <div className="relative flex justify-center text-sm">
            <span className="px-2 bg-transparent text-indigo-100 bg-gradient-to-r from-[#8165cc] to-[#995ca7]">또는 소셜 로그인</span>
          </div>
        </div>

        <div className="mt-6 grid grid-cols-2 gap-4">
          <form action={signInWithKakao}>
            <button className="w-full py-3 px-4 bg-[#FEE500] hover:bg-[#FEE500]/90 text-[#000000] font-semibold rounded-xl shadow-md transition-all active:scale-[0.98] flex items-center justify-center gap-2">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
                <path d="M12 3C6.477 3 2 6.541 2 10.909c0 2.809 1.83 5.26 4.673 6.648-.22.825-.794 2.993-.822 3.125-.035.166.052.164.12.118.053-.035 3.32-2.222 4.622-3.1 1.108.156 2.253.238 3.407.238 5.523 0 10-3.541 10-7.909C24 6.541 19.523 3 12 3z"/>
              </svg>
              카카오
            </button>
          </form>
          <form action={signInWithGoogle}>
            <button className="w-full py-3 px-4 bg-white/10 hover:bg-white/20 border border-white/20 text-white font-semibold rounded-xl shadow-md transition-all active:scale-[0.98] flex items-center justify-center gap-2">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
                <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
                <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
                <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
              </svg>
              Google
            </button>
          </form>
        </div>
      </div>
    </div>
  )
}
