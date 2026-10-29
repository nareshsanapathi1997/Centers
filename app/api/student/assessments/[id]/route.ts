import { NextRequest, NextResponse } from 'next/server'
import { getStudentToken, verifyStudentAccess } from '@/lib/student-auth'
import {

  canShowResults,
  countStudentAttempts,
  getAssessmentById,
  getInProgressAttempt,
  isLiveWindowOpen,
  listQuestions,
  listSections,
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

    const [sections, questions, attemptCount, inProgress] = await Promise.all([
      listSections(assessmentId),
      listQuestions(assessmentId),
      countStudentAttempts(assessmentId, auth.studentId!),
      getInProgressAttempt(assessmentId, auth.studentId!),
    ])

    const now = new Date()
    return NextResponse.json({
      assessment: {
        id: assessment.id,
        title: assessment.title,
        description: assessment.description,
        mode: assessment.mode,
        duration_minutes: assessment.duration_minutes,
        max_attempts: assessment.max_attempts,
        starts_at: assessment.starts_at,
        ends_at: assessment.ends_at,
        show_results: assessment.show_results,
        shuffle_questions: assessment.shuffle_questions,
        shuffle_options: assessment.shuffle_options,
        course_title: assessment.course_title,
        directions: assessment.directions,
        is_free: Boolean(assessment.is_free),
        marks_correct: Number(assessment.marks_correct),
        marks_incorrect: Number(assessment.marks_incorrect),
      },
      sections: sections.map((s) => ({
        id: s.id,
        title: s.title,
        directions: s.directions,
        sort_order: s.sort_order,
        duration_minutes: s.duration_minutes,
      })),
      questionCount: questions.length,
      attemptCount,
      attemptsRemaining: Math.max(0, assessment.max_attempts - attemptCount),
      inProgressAttemptId: inProgress?.id ?? null,
      windowOpen: isLiveWindowOpen(assessment, now),
      resultsVisible: canShowResults(assessment, now),
    })
  } catch (error) {
    console.error('Student assessment GET error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
