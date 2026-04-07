import { NextResponse, type NextRequest } from 'next/server'

const PROTECTED_PREFIXES = [
  '/dashboard',
  '/portfolio',
  '/documents',
  '/memos',
  '/notifications',
  '/settings',
  '/pipeline',
  '/approvals',
  '/tearsheet',
  '/search',
]

export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl
  const isProtected = PROTECTED_PREFIXES.some((p) => pathname.startsWith(p))

  if (!isProtected) return NextResponse.next()

  const authed = req.cookies.get('ayd_auth')?.value === '1'
  if (authed) return NextResponse.next()

  const url = req.nextUrl.clone()
  url.pathname = '/login'
  url.searchParams.set('next', pathname)
  return NextResponse.redirect(url)
}

export const config = {
  matcher: [
    '/dashboard/:path*',
    '/portfolio/:path*',
    '/documents/:path*',
    '/memos/:path*',
    '/notifications/:path*',
    '/settings/:path*',
    '/pipeline/:path*',
    '/approvals/:path*',
    '/tearsheet/:path*',
    '/search/:path*',
  ],
}
