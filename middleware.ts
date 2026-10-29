import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { jwtVerify } from 'jose/jwt/verify'
import { ADMIN_COOKIE, STUDENT_COOKIE, SUPER_ADMIN_COOKIE } from '@/lib/auth-cookies'

/**
 * Edge-side session gate for authenticated page routes.
 *
 * This is defence in depth, not the only check: each API route still verifies
 * the caller and its center scope. It exists so an unauthenticated request
 * never reaches an admin page at all, which the previous no-op middleware
 * allowed.
 *
 * Verification uses `jose` because `jsonwebtoken` cannot run on the Edge
 * runtime. The secret and algorithm are read inline rather than imported from
 * `lib/jwt-secret` so the Edge bundle has no cross-module resolution to get
 * wrong; they must stay in step with that module.
 */

const JWT_ALGORITHM = 'HS256'

const secretKey = new TextEncoder().encode(
  process.env.JWT_SECRET?.trim() || 'dev-only-insecure-secret'
)

/** Paths under /admin and /super-admin that must stay reachable when signed out. */
const PUBLIC_ADMIN_SEGMENTS = ['login', 'forgot-password', 'reset-password']

/** Segments under /[slug]/student that must stay reachable when signed out. */
const PUBLIC_STUDENT_SEGMENTS = [
  'login',
  'register',
  'forgot-password',
  'reset-password',
  'verify-email',
]

async function isValidToken(token: string | undefined, requireSuperAdmin = false) {
  if (!token) return false
  try {
    const { payload } = await jwtVerify(token, secretKey, {
      algorithms: [JWT_ALGORITHM],
    })
    if (requireSuperAdmin && payload.isSuperAdmin !== true) return false
    return true
  } catch {
    return false
  }
}

function redirectToLogin(request: NextRequest, loginPath: string) {
  const url = request.nextUrl.clone()
  url.pathname = loginPath
  url.search = ''
  // Let the login screen send the user back where they were headed.
  url.searchParams.set('next', request.nextUrl.pathname)
  return NextResponse.redirect(url)
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl
  const segments = pathname.split('/').filter(Boolean)

  // /super-admin/*
  if (segments[0] === 'super-admin') {
    if (segments.length === 1 || PUBLIC_ADMIN_SEGMENTS.includes(segments[1])) {
      return NextResponse.next()
    }
    const token = request.cookies.get(SUPER_ADMIN_COOKIE)?.value
    if (!(await isValidToken(token, true))) {
      return redirectToLogin(request, '/super-admin/login')
    }
    return NextResponse.next()
  }

  // /admin/*
  if (segments[0] === 'admin') {
    if (segments.length === 1 || PUBLIC_ADMIN_SEGMENTS.includes(segments[1])) {
      return NextResponse.next()
    }
    const token = request.cookies.get(ADMIN_COOKIE)?.value
    if (!(await isValidToken(token))) {
      return redirectToLogin(request, '/admin/login')
    }
    return NextResponse.next()
  }

  // /[slug]/student/* — page routes only.
  //
  // `api` is excluded explicitly: the `/:slug/student/:path*` matcher also
  // matches `/api/student/...`, and redirecting those to a login *page* broke
  // every student API call. API routes do their own token checks.
  if (segments[1] === 'student' && segments[0] !== 'api') {
    const sub = segments[2]
    if (!sub || PUBLIC_STUDENT_SEGMENTS.includes(sub)) {
      return NextResponse.next()
    }
    const token = request.cookies.get(STUDENT_COOKIE)?.value
    if (!(await isValidToken(token))) {
      return redirectToLogin(request, `/${segments[0]}/student/login`)
    }
    return NextResponse.next()
  }

  return NextResponse.next()
}

export const config = {
  matcher: [
    '/admin/:path*',
    '/super-admin/:path*',
    // Negative lookahead keeps API and Next internals out of the page gate.
    '/((?!api|_next|assets|uploads)[^/]+)/student/:path*',
  ],
}
