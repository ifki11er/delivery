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
      const isOnboardingPage = nextUrl.pathname.startsWith('/onboarding');
      const isApiRoute = nextUrl.pathname.startsWith('/api');

      // 로그인 안 한 상태로 다른 페이지 접근 시 로그인 페이지로 리다이렉트
      if (!isLoggedIn && !isAuthPage) {
        return false;
      }
      
      // 이미 로그인 한 상태로 로그인 페이지 접근 시 메인으로 리다이렉트
      if (isLoggedIn && isAuthPage) {
        return Response.redirect(new URL('/', nextUrl));
      }

      // 로그인 유저 온보딩 처리 (이름 또는 전화번호 누락 시)
      if (isLoggedIn && !isApiRoute) {
        const hasMissingInfo = !auth.user.name || !(auth.user as any).phoneNumber;
        
        if (hasMissingInfo && !isOnboardingPage) {
          return Response.redirect(new URL('/onboarding', nextUrl));
        }
        
        // 정보가 다 있는데 온보딩 페이지로 접근하면 홈으로
        if (!hasMissingInfo && isOnboardingPage) {
          return Response.redirect(new URL('/', nextUrl));
        }
      }

      return true;
    },
    async session({ session, user, token }) {
      if (session.user && token?.sub) {
        session.user.id = token.sub;
      }
      if (session.user && token?.role) {
        session.user.role = token.role as 'CUSTOMER' | 'OWNER' | 'ADMIN';
      }
      if (session.user && token?.phoneNumber !== undefined) {
        (session.user as any).phoneNumber = token.phoneNumber as string | null;
      }
      if (session.user && token?.name !== undefined) {
        session.user.name = token.name as string | null;
      }
      return session;
    },
    async jwt({ token, user, trigger, session }) {
      if (user) {
        token.sub = user.id;
        token.role = user.role;
        token.phoneNumber = (user as any).phoneNumber;
        token.name = user.name;
      }
      if (trigger === 'update' && session) {
        if (session.role) token.role = session.role;
        if (session.name) token.name = session.name;
        if (session.phoneNumber !== undefined) token.phoneNumber = session.phoneNumber;
      }
      return token;
    },
  },
  session: {
    strategy: 'jwt',
  },
} satisfies NextAuthConfig
