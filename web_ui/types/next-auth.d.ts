import { DefaultSession } from 'next-auth'
import { Role as PrismaRole } from '@prisma/client'

type AppRole = PrismaRole | 'EMPLOYEE'

declare module 'next-auth' {
  interface Session {
    user: {
      id: string
      role: AppRole
      phoneNumber?: string | null
    } & DefaultSession['user']
  }

  interface User {
    role: AppRole
    phoneNumber?: string | null
  }
}

declare module 'next-auth/jwt' {
  interface JWT {
    id: string
    role: AppRole
    phoneNumber?: string | null
    name?: string | null
  }
}
