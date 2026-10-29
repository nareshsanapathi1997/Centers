import { NextRequest, NextResponse } from 'next/server'
import { getStudentToken, verifyStudentAccess } from '@/lib/student-auth'
import {

  ensureAttemptNotTimedOut,
  getAttemptById,
  getReviewPayload,
} from '@/lib/student-assessments-db'

export const dynamic = 'force-dynamic'

export async function GET(
  request: NextRequest,
  { params }: { params: { attemptId: string } }
) {
  try {
    const attemptId = parseInt(params.attemptId, 10)
    const centerId = parseInt(request.nextUrl.searchParams.get('centerId') || '', 10)
    if (!attemptId || !centerId) {
      return NextResponse.json({ error: 'attemptId and centerId are required' }, { status: 400 })
    }

    const token = getStudentToken(request)
    if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const auth = await verifyStudentAccess(token, centerId)
    if (!auth.authorized) return NextResponse.json({ error: auth.error }, { status: 403 })

    let attempt = await getAttemptById(attemptId)
    if (!attempt || attempt.student_id !== auth.studentId || attempt.center_id !== centerId) {
      return NextResponse.json({ error: 'Attempt not found' }, { status: 404 })
    }

    attempt = await ensureAttemptNotTimedOut(attempt)
    if (attempt.status === 'in_progress') {
      return NextResponse.json({ error: 'Submit the attempt before review' }, { status: 403 })
    }

    const review = await getReviewPayload(attemptId)
    if (!review) return NextResponse.json({ error: 'Review unavailable' }, { status: 404 })

    return NextResponse.json(review)
  } catch (error) {
    console.error('Student review GET error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
