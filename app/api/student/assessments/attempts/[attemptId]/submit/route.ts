import { NextRequest, NextResponse } from 'next/server'
import { getStudentToken, verifyStudentAccess } from '@/lib/student-auth'
import {

  canShowResults,
  getAssessmentById,
  getAttemptById,
  getReviewPayload,
  submitAttempt,
} from '@/lib/student-assessments-db'

export const dynamic = 'force-dynamic'

export async function POST(
  request: NextRequest,
  { params }: { params: { attemptId: string } }
) {
  try {
    const attemptId = parseInt(params.attemptId, 10)
    const body = await request.json().catch(() => ({}))
    const centerId = parseInt(
      String(body.centerId ?? request.nextUrl.searchParams.get('centerId') ?? ''),
      10
    )
    if (!attemptId || !centerId) {
      return NextResponse.json({ error: 'attemptId and centerId are required' }, { status: 400 })
    }

    const token = getStudentToken(request)
    if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const auth = await verifyStudentAccess(token, centerId)
    if (!auth.authorized) return NextResponse.json({ error: auth.error }, { status: 403 })

    const existing = await getAttemptById(attemptId)
    if (!existing || existing.student_id !== auth.studentId || existing.center_id !== centerId) {
      return NextResponse.json({ error: 'Attempt not found' }, { status: 404 })
    }

    const result = await submitAttempt(attemptId)
    if (result.error || !result.attempt) {
      return NextResponse.json({ error: result.error || 'Submit failed' }, { status: result.status || 400 })
    }

    const assessment = await getAssessmentById(result.attempt.assessment_id, centerId)
    const show = assessment ? canShowResults(assessment) : false
    const review = show ? await getReviewPayload(attemptId) : null

    return NextResponse.json({
      attempt: {
        id: result.attempt.id,
        status: result.attempt.status,
        score: show ? result.attempt.score : null,
        max_score: show ? result.attempt.max_score : null,
        rank: show ? result.attempt.rank : null,
        submitted_at: result.attempt.submitted_at,
      },
      resultsVisible: show,
      review,
    })
  } catch (error) {
    console.error('Student attempt submit error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
