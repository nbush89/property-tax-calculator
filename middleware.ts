import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

/**
 * Protect /admin routes (except /admin/login).
 * Set ADMIN_PUBLISH_PASSWORD + ADMIN_PUBLISH_TOKEN after login (see app/admin/login/actions).
 * Dev bypass: if both unset, /admin is open (local only).
 */
export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

  if (!pathname.startsWith('/admin')) {
    return NextResponse.next()
  }

  if (pathname === '/admin/login' || pathname.startsWith('/admin/login/')) {
    return NextResponse.next()
  }

  const devOpen =
    process.env.NODE_ENV === 'development' &&
    !process.env.ADMIN_PUBLISH_PASSWORD &&
    !process.env.ADMIN_PUBLISH_TOKEN

  if (devOpen) {
    return NextResponse.next()
  }

  const token = request.cookies.get('admin_session')?.value
  const expected = process.env.ADMIN_PUBLISH_TOKEN

  if (!expected || token !== expected) {
    const url = request.nextUrl.clone()
    url.pathname = '/admin/login'
    url.searchParams.set('from', pathname)
    return NextResponse.redirect(url)
  }

  return NextResponse.next()
}

export const config = {
  matcher: ['/admin', '/admin/:path*'],
}
