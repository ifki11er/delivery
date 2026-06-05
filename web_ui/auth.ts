import NextAuth from "next-auth";
import { PrismaAdapter } from "@auth/prisma-adapter";
import Credentials from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { authConfig } from "./auth.config";

type GoogleTokenInfo = {
  sub?: string;
  aud?: string;
  email?: string;
  email_verified?: string | boolean;
  name?: string;
  picture?: string;
};

async function verifyGoogleIdToken(idToken: string) {
  const res = await fetch(`https://oauth2.googleapis.com/tokeninfo?id_token=${encodeURIComponent(idToken)}`, {
    cache: "no-store",
  });

  if (!res.ok) return null;

  const tokenInfo = (await res.json()) as GoogleTokenInfo;
  const expectedAudience = process.env.AUTH_GOOGLE_ID;
  const emailVerified = tokenInfo.email_verified === true || tokenInfo.email_verified === "true";

  if (!expectedAudience || tokenInfo.aud !== expectedAudience || !tokenInfo.sub || !tokenInfo.email || !emailVerified) {
    return null;
  }

  return {
    providerAccountId: tokenInfo.sub,
    email: tokenInfo.email.trim().toLowerCase(),
    name: tokenInfo.name ?? null,
    image: tokenInfo.picture ?? null,
  };
}

export const { handlers, auth, signIn, signOut } = NextAuth({
  adapter: PrismaAdapter(prisma),
  ...authConfig,
  providers: [
    ...authConfig.providers,
    Credentials({
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) return null;

        const email = String(credentials.email).trim().toLowerCase();
        const password = String(credentials.password);

        const user = await prisma.user.findUnique({ where: { email } });
        if (!user) {
          const hashedPassword = await bcrypt.hash(password, 10);
          return prisma.user.create({
            data: {
              email,
              password: hashedPassword,
            },
          });
        }

        if (!user.password) return null;
        if (user.deletedAt || user.status === "WITHDRAWN") return null;
        if (user.status === "SUSPENDED") {
          throw new Error("Account is suspended.");
        }

        const passwordsMatch = await bcrypt.compare(password, user.password);
        return passwordsMatch ? user : null;
      },
    }),
    Credentials({
      id: "google-native",
      name: "Google Native",
      credentials: {
        idToken: { label: "Google ID Token", type: "text" },
      },
      async authorize(credentials) {
        const idToken = typeof credentials?.idToken === "string" ? credentials.idToken : "";
        if (!idToken) return null;

        const googleUser = await verifyGoogleIdToken(idToken);
        if (!googleUser) return null;

        const existingAccount = await prisma.account.findUnique({
          where: {
            provider_providerAccountId: {
              provider: "google",
              providerAccountId: googleUser.providerAccountId,
            },
          },
          include: { user: true },
        });

        if (existingAccount?.user) {
          if (existingAccount.user.deletedAt || existingAccount.user.status === "WITHDRAWN") return null;
          if (existingAccount.user.status === "SUSPENDED") throw new Error("Account is suspended.");
          return existingAccount.user;
        }

        const user = await prisma.user.upsert({
          where: { email: googleUser.email },
          update: {
            name: googleUser.name ?? undefined,
            image: googleUser.image ?? undefined,
            emailVerified: new Date(),
          },
          create: {
            email: googleUser.email,
            name: googleUser.name,
            image: googleUser.image,
            emailVerified: new Date(),
          },
        });

        if (user.deletedAt || user.status === "WITHDRAWN") return null;
        if (user.status === "SUSPENDED") throw new Error("Account is suspended.");

        await prisma.account.upsert({
          where: {
            provider_providerAccountId: {
              provider: "google",
              providerAccountId: googleUser.providerAccountId,
            },
          },
          update: {
            userId: user.id,
            id_token: idToken,
          },
          create: {
            userId: user.id,
            type: "oauth",
            provider: "google",
            providerAccountId: googleUser.providerAccountId,
            id_token: idToken,
          },
        });

        return user;
      },
    }),
  ],
});
