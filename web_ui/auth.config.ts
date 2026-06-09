import type { NextAuthConfig } from "next-auth";
import Kakao from "next-auth/providers/kakao";
import Google from "next-auth/providers/google";

type Role = "CUSTOMER" | "OWNER" | "ADMIN" | "EMPLOYEE";

function isRole(value: unknown): value is Role {
  return value === "CUSTOMER" || value === "OWNER" || value === "ADMIN" || value === "EMPLOYEE";
}

function nullableString(value: unknown) {
  return typeof value === "string" ? value : null;
}

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
    signIn: "/login",
  },
  callbacks: {
    authorized({ auth, request: { nextUrl } }) {
      const isLoggedIn = Boolean(auth?.user);
      const isAuthPage = nextUrl.pathname.startsWith("/login");
      const isOnboardingPage = nextUrl.pathname.startsWith("/onboarding");
      const isApiRoute = nextUrl.pathname.startsWith("/api");

      if (!isLoggedIn && !isAuthPage) return false;

      if (isLoggedIn && isAuthPage) {
        return Response.redirect(new URL("/", nextUrl));
      }

      if (isLoggedIn && !isApiRoute) {
        const isEmployee = auth?.user?.role === "EMPLOYEE";
        const hasMissingInfo = !isEmployee && (!auth?.user?.name || !auth.user.phoneNumber);

        if (hasMissingInfo && !isOnboardingPage) {
          return Response.redirect(new URL("/onboarding", nextUrl));
        }

        if (!hasMissingInfo && isOnboardingPage) {
          return Response.redirect(new URL("/", nextUrl));
        }
      }

      return true;
    },
    async session({ session, token }) {
      if (session.user && token.sub) {
        session.user.id = token.sub;
      }
      if (session.user && isRole(token.role)) {
        session.user.role = token.role;
      }
      if (session.user) {
        session.user.phoneNumber = nullableString(token.phoneNumber);
        session.user.name = nullableString(token.name) ?? session.user.name ?? null;
      }
      return session;
    },
    async jwt({ token, user, trigger, session }) {
      if (user) {
        token.sub = user.id;
        token.role = user.role;
        token.phoneNumber = user.phoneNumber ?? null;
        token.name = user.name ?? null;
      }
      if (trigger === "update" && session) {
        const userUpdate = typeof session.user === "object" && session.user ? session.user : session;
        token.name = nullableString(userUpdate.name) ?? token.name ?? null;
        token.phoneNumber = nullableString(userUpdate.phoneNumber) ?? token.phoneNumber ?? null;
        if (isRole(userUpdate.role)) {
          token.role = userUpdate.role;
        }
      }
      return token;
    },
  },
  session: {
    strategy: "jwt",
  },
} satisfies NextAuthConfig;
