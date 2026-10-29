import { NextRequest, NextResponse } from 'next/server'
import { getStudentToken, verifyStudentAccess } from '@/lib/student-auth'
import {

  canShowResults,
  getAssessmentById,
  getLeaderboard,
  studentCanAccessAssessment,
} from '@/lib/student-assessments-db'

export const dynamic = 'force-dynamic'

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const assessmentId = parseInt(params.id, 10)
    const centerId = parseInt(request.nextUrl.searchParams.get('centerId') || '', 10)
    if (!assessmentId || !centerId) {
      return NextResponse.json({ error: 'id and centerId are required' }, { status: 400 })
    }

    const token = getStudentToken(request)
    if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const auth = await verifyStudentAccess(token, centerId)
    if (!auth.authorized) return NextResponse.json({ error: auth.error }, { status: 403 })

    const assessment = await getAssessmentById(assessmentId, centerId)
    if (!assessment || !assessment.is_published) {
      return NextResponse.json({ error: 'Assessment not found' }, { status: 404 })
    }

    const canAccess = await studentCanAccessAssessment(auth.studentId!, centerId, assessment)
    if (!canAccess) {
      return NextResponse.json({ error: 'Not enrolled for this course' }, { status: 403 })
    }

    if (!canShowResults(assessment)) {
      return NextResponse.json({ error: 'Leaderboard not available yet' }, { status: 403 })
    }

    const leaderboard = await getLeaderboard(assessmentId, 50)
    return NextResponse.json({
      leaderboard: leaderboard.map((row) => ({
        rank: row.display_rank,
        student_name: row.student_name,
        score: row.score,
        max_score: row.max_score,
        submitted_at: row.submitted_at,
        is_self: row.student_id === auth.studentId,
      })),
    })
  } catch (error) {
    console.error('Student leaderboard GET error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
