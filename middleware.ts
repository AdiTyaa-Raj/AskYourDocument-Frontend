import { NextResponse, type NextRequest } from 'next/server'

const PROTECTED_PREFIXES = ['/documents', '/ai-chat', '/users', '/roles', '/tenants']

export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl
  const isProtected = PROTECTED_PREFIXES.some((p) => pathname.startsWith(p))

  if (!isProtected) return NextResponse.next()

  const authed = req.cookies.get('ayd_auth')?.value === '1'
  if (authed) return NextResponse.next()

  const url = req.nextUrl.clone()
  url.pathname = '/login'
  url.searchParams.set('next', pathname)
  // Prevent Next.js from caching the unauthenticated redirect response.
  // Without this, navigating to the protected page immediately after login can reuse a cached redirect.
  const res = NextResponse.redirect(url)
  res.headers.set('x-middleware-cache', 'no-cache')
  res.headers.set('Cache-Control', 'no-store')
  return res
}

export const config = {
  matcher: [
    '/documents/:path*',
    '/ai-chat/:path*',
    '/users/:path*',
    '/roles/:path*',
    '/tenants/:path*',
  ],
}
