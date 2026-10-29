import { NextRequest, NextResponse } from 'next/server'

/**
 * Session cookies for the three audiences.
 *
 * The cookie is the only client-held credential: httpOnly so XSS cannot read
 * it, and it is what `middleware.ts` checks at the edge. Login responses do
 * not include the JWT in the JSON body.
 */
export const ADMIN_COOKIE = 'cm_admin_token'
export const SUPER_ADMIN_COOKIE = 'cm_super_admin_token'
export const STUDENT_COOKIE = 'cm_student_token'

const SEVEN_DAYS = 60 * 60 * 24 * 7
const THIRTY_DAYS = 60 * 60 * 24 * 30

function basePath(): string {
  const raw = process.env.NEXT_PUBLIC_BASE_PATH?.trim()
  return raw && raw !== '/' ? raw : '/'
}

function cookieOptions(maxAge: number) {
  return {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax' as const,
    path: basePath(),
    maxAge,
  }
}

export function setAdminCookie(response: NextResponse, token: string): NextResponse {
  response.cookies.set(ADMIN_COOKIE, token, cookieOptions(SEVEN_DAYS))
  return response
}

export function setSuperAdminCookie(response: NextResponse, token: string): NextResponse {
  response.cookies.set(SUPER_ADMIN_COOKIE, token, cookieOptions(SEVEN_DAYS))
  return response
}

export function setStudentCookie(response: NextResponse, token: string): NextResponse {
  response.cookies.set(STUDENT_COOKIE, token, cookieOptions(THIRTY_DAYS))
  return response
}

export function clearAuthCookie(response: NextResponse, name: string): NextResponse {
  response.cookies.set(name, '', { ...cookieOptions(0), maxAge: 0 })
  return response
}

/**
 * Read a bearer token from the Authorization header, falling back to the
 * cookie. Header first keeps existing localStorage clients working unchanged.
 */
export function readToken(request: NextRequest, cookieName: string): string | null {
  const authHeader = request.headers.get('authorization')
  if (authHeader?.startsWith('Bearer ')) {
    const fromHeader = authHeader.substring(7).trim()
    if (fromHeader) return fromHeader
  }
  return request.cookies.get(cookieName)?.value || null
}
