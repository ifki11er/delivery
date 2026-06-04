import NextAuth from 'next-auth'
import { PrismaAdapter } from '@auth/prisma-adapter'
import { prisma } from '@/lib/prisma'
import { authConfig } from './auth.config'
import Credentials from 'next-auth/providers/credentials'
import bcrypt from 'bcryptjs'

export const { handlers, auth, signIn, signOut } = NextAuth({
  adapter: PrismaAdapter(prisma),
  ...authConfig,
  providers: [
    ...authConfig.providers,
    Credentials({
      credentials: {
        email: { label: 'Email', type: 'email' },
        password: { label: 'Password', type: 'password' },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) return null

        const email = credentials.email as string
        const password = credentials.password as string

        let user = await prisma.user.findUnique({
          where: { email },
        })

        // 🚀 사용자가 없으면 자동 회원가입 처리 (Upsert 방식)
        if (!user) {
          const hashedPassword = await bcrypt.hash(password, 10)
          user = await prisma.user.create({
            data: { email, password: hashedPassword },
          })
          return user
        }

        // 사용자가 존재하면 탈퇴 및 정지 여부, 비밀번호 검증
        if (user.deletedAt || user.status === 'WITHDRAWN') return null
        if (user.status === 'SUSPENDED') throw new Error('계정이 정지되었습니다.')
        if (!user.password) return null

        const passwordsMatch = await bcrypt.compare(password, user.password)

        if (passwordsMatch) return user

        return null
      },
    }),
  ],
})
