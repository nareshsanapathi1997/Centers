import { NextRequest, NextResponse } from 'next/server'
import { verifyEmailToken, createEmailVerificationToken } from '@/lib/student-email-verification'
import { getStudentToken, verifyStudentAccess } from '@/lib/student-auth'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  try {
    const studentId = parseInt(request.nextUrl.searchParams.get('studentId') || '', 10)
    const token = request.nextUrl.searchParams.get('token') || ''

    if (!studentId || !token) {
      return NextResponse.json({ error: 'Invalid verification link' }, { status: 400 })
    }

    const result = await verifyEmailToken(studentId, token)
    if (!result.valid) {
      return NextResponse.json({ error: result.error }, { status: 400 })
    }

    return NextResponse.json({ message: 'Email verified successfully' })
  } catch (error) {
    console.error('Verify email error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const { centerId } = await request.json()
    const cid = parseInt(centerId, 10)
    if (!cid) {
      return NextResponse.json({ error: 'centerId is required' }, { status: 400 })
    }

    const token = getStudentToken(request)
    if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const auth = await verifyStudentAccess(token, cid)
    if (!auth.authorized || !auth.studentId) {
      return NextResponse.json({ error: auth.error }, { status: 403 })
    }

    const sent = await createEmailVerificationToken(auth.studentId)
    if (!sent) {
      return NextResponse.json({ error: 'No email on file or already verified' }, { status: 400 })
    }

    return NextResponse.json({ message: 'Verification email sent' })
  } catch (error) {
    console.error('Resend verification error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
