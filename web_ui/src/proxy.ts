import NextAuth from 'next-auth'
import { NextResponse } from 'next/server'
import { authConfig } from '../auth.config'

const { auth } = NextAuth(authConfig)

export default auth((req) => {
  const legacyAppRoutes: Record<string, string> = {
    '/store/monitor': '/app#monitor',
    '/store/employees': '/app#employees',
    '/store/mini-receipt': '/app#miniReceipt',
    '/mypage': '/app#mypage',
    '/settings': '/app#settings',
    '/store/manage': '/app#storeManage',
    '/store/menu-language': '/app#menuLanguage',
    '/store/blacklist': '/app#blacklist',
  }

  const nextPath = legacyAppRoutes[req.nextUrl.pathname]
  if (nextPath) {
    return NextResponse.redirect(new URL(nextPath, req.url))
  }

  return NextResponse.next()
})

export const config = {
  // https://nextjs.org/docs/app/building-your-application/routing/middleware#matcher
  matcher: ['/((?!api|_next/static|_next/image|.*\\.png$).*)'],
}
