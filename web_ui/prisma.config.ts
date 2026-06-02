import { defineConfig } from '@prisma/config'
import * as dotenv from 'dotenv'

// Prisma CLI가 .env.local을 인식할 수 있도록 수동으로 로드합니다.
dotenv.config({ path: '.env.local' })

export default defineConfig({
  earlyAccess: true,
  datasource: {
    url: process.env.DIRECT_URL || process.env.DATABASE_URL,
  },
})
