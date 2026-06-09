import NextAuth from 'next-auth'
import { NextResponse } from 'next/server'
import { authConfig } from '../auth.config'

const { auth } = NextAuth(authConfig)

export default auth((req) => {
  if (req.nextUrl.pathname === '/store/monitor') {
    console.log('[store-monitor-page-hit]', {
      at: new Date().toISOString(),
      ip: req.headers.get('x-forwarded-for') ?? req.headers.get('x-real-ip'),
      userAgent: req.headers.get('user-agent'),
      referer: req.headers.get('referer'),
      secFetchMode: req.headers.get('sec-fetch-mode'),
    })
  }

  return NextResponse.next()
})

export const config = {
  // https://nextjs.org/docs/app/building-your-application/routing/middleware#matcher
  matcher: ['/((?!api|_next/static|_next/image|.*\\.png$).*)'],
}
