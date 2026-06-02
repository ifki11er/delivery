import type { NextAuthConfig } from 'next-auth'
import Kakao from 'next-auth/providers/kakao'
import Google from 'next-auth/providers/google'

export const authConfig = {
  providers: [
    Kakao({
      clientId: process.env.AUTH_KAKAO_ID,
      clientSecret: process.env.AUTH_KAKAO_SECRET,
    }),
    Google({
      clientId: process.env.AUTH_GOOGLE_ID,
      clientSecret: process.env.AUTH_GOOGLE_SECRET,
    }),
  ],
  pages: {
    signIn: '/login',
  },
  callbacks: {
    authorized({ auth, request: { nextUrl } }) {
      const isLoggedIn = !!auth?.user;
      const isAuthPage = nextUrl.pathname.startsWith('/login');

      // 로그인 안 한 상태로 다른 페이지 접근 시 로그인 페이지로 리다이렉트 (false 반환 시 signIn 페이지로 감)
      if (!isLoggedIn && !isAuthPage) {
        return false;
      }
      
      // 이미 로그인 한 상태로 로그인/가입 페이지 접근 시 메인으로 리다이렉트
      if (isLoggedIn && isAuthPage) {
        return Response.redirect(new URL('/', nextUrl));
      }

      return true;
    },
    async session({ session, user, token }) {
      if (session.user && token?.sub) {
        session.user.id = token.sub
      }
      if (session.user && token?.role) {
        session.user.role = token.role as 'CUSTOMER' | 'OWNER' | 'ADMIN'
      }
      return session
    },
    async jwt({ token, user, trigger, session }) {
      if (user) {
        token.sub = user.id
        token.role = user.role
      }
      // 세션 업데이트(강제 갱신 등)를 지원하려면 아래와 같이 작성 가능
      if (trigger === 'update' && session?.role) {
        token.role = session.role
      }
      return token
    },
  },
  session: {
    strategy: 'jwt',
  },
} satisfies NextAuthConfig
