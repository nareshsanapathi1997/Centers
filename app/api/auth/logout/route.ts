import { NextRequest, NextResponse } from 'next/server'
import {

  ADMIN_COOKIE,
  STUDENT_COOKIE,
  SUPER_ADMIN_COOKIE,
  clearAuthCookie,
  readToken,
} from '@/lib/auth-cookies'
import { verifyJwt } from '@/lib/jwt'
import { revokeAdminSession } from '@/lib/admin-sessions'
import { revokeStudentSession } from '@/lib/student-sessions'

export const dynamic = 'force-dynamic'

const SCOPES: Record<string, string> = {
  admin: ADMIN_COOKIE,
  'super-admin': SUPER_ADMIN_COOKIE,
  student: STUDENT_COOKIE,
}

async function revokeForCookie(cookieName: string, request: NextRequest) {
  const token = readToken(request, cookieName)
  if (!token) return
  const payload = verifyJwt<{ jti?: string; studentId?: number }>(token)
  if (!payload?.jti) return

  try {
    if (cookieName === STUDENT_COOKIE) {
      await revokeStudentSession(payload.jti, payload.studentId)
    } else {
      await revokeAdminSession(payload.jti)
    }
  } catch (error) {
    console.error('Session revoke on logout failed:', error)
  }
}

/**
 * Clears the httpOnly session cookie and revokes the matching server-side session.
 */
export async function POST(request: NextRequest) {
  const scope = new URL(request.url).searchParams.get('scope')
  const response = NextResponse.json({ success: true })

  if (scope && SCOPES[scope]) {
    await revokeForCookie(SCOPES[scope], request)
    return clearAuthCookie(response, SCOPES[scope])
  }

  for (const cookie of Object.values(SCOPES)) {
    await revokeForCookie(cookie, request)
    clearAuthCookie(response, cookie)
  }
  return response
}
