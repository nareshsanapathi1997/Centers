import { NextRequest, NextResponse } from 'next/server'
import { getStudentToken, verifyStudentAccess } from '@/lib/student-auth'
import {

  listStudentSessions,
  revokeStudentSession,
  revokeAllStudentSessions,
} from '@/lib/student-sessions'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  try {
    const centerId = parseInt(request.nextUrl.searchParams.get('centerId') || '', 10)
    if (!centerId) {
      return NextResponse.json({ error: 'centerId is required' }, { status: 400 })
    }

    const token = getStudentToken(request)
    if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const auth = await verifyStudentAccess(token, centerId)
    if (!auth.authorized || !auth.studentId) {
      return NextResponse.json({ error: auth.error }, { status: 403 })
    }

    const sessions = await listStudentSessions(auth.studentId)
    return NextResponse.json({
      sessions: sessions.map((s) => ({
        id: s.id,
        jti: s.token_jti,
        userAgent: s.user_agent,
        ipAddress: s.ip_address,
        createdAt: s.created_at,
        expiresAt: s.expires_at,
        revoked: Boolean(s.revoked_at),
        current: s.token_jti === auth.jti,
      })),
      currentJti: auth.jti,
    })
  } catch (error) {
    console.error('Student sessions GET error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const centerId = parseInt(request.nextUrl.searchParams.get('centerId') || '', 10)
    const revokeAll = request.nextUrl.searchParams.get('all') === 'true'
    const jti = request.nextUrl.searchParams.get('jti')

    if (!centerId) {
      return NextResponse.json({ error: 'centerId is required' }, { status: 400 })
    }

    const token = getStudentToken(request)
    if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const auth = await verifyStudentAccess(token, centerId)
    if (!auth.authorized || !auth.studentId) {
      return NextResponse.json({ error: auth.error }, { status: 403 })
    }

    if (revokeAll) {
      await revokeAllStudentSessions(auth.studentId, auth.jti)
      return NextResponse.json({ message: 'Other sessions revoked' })
    }

    if (jti) {
      // Scope to the caller: without this any student could revoke another
      // student's session by supplying their jti.
      const revoked = await revokeStudentSession(jti, auth.studentId)
      if (!revoked) {
        return NextResponse.json({ error: 'Session not found' }, { status: 404 })
      }
      return NextResponse.json({ message: 'Session revoked' })
    }

    if (auth.jti) {
      await revokeStudentSession(auth.jti)
    }

    return NextResponse.json({ message: 'Logged out' })
  } catch (error) {
    console.error('Student sessions DELETE error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
