import { NextRequest, NextResponse } from 'next/server'
import { getStudentToken, verifyStudentAccess } from '@/lib/student-auth'
import {

  buildStudentAnswerMap,
  buildStudentQuestionsPayload,
  getAssessmentById,
  getAttemptAnswers,
  listPassages,
  listQuestions,
  listSections,
  startAttempt,
} from '@/lib/student-assessments-db'

export const dynamic = 'force-dynamic'

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const assessmentId = parseInt(params.id, 10)
    const body = await request.json().catch(() => ({}))
    const centerId = parseInt(
      String(body.centerId ?? request.nextUrl.searchParams.get('centerId') ?? ''),
      10
    )
    if (!assessmentId || !centerId) {
      return NextResponse.json({ error: 'id and centerId are required' }, { status: 400 })
    }

    const token = getStudentToken(request)
    if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const auth = await verifyStudentAccess(token, centerId)
    if (!auth.authorized) return NextResponse.json({ error: auth.error }, { status: 403 })

    const assessment = await getAssessmentById(assessmentId, centerId)
    if (!assessment) {
      return NextResponse.json({ error: 'Assessment not found' }, { status: 404 })
    }

    const result = await startAttempt({
      assessment,
      studentId: auth.studentId!,
      centerId,
    })

    if (result.error || !result.attempt) {
      return NextResponse.json({ error: result.error || 'Unable to start' }, { status: result.status || 400 })
    }

    const [questions, sections, passages, answers] = await Promise.all([
      listQuestions(assessmentId),
      listSections(assessmentId),
      listPassages(assessmentId),
      getAttemptAnswers(result.attempt.id),
    ])

    const serverNow = new Date().toISOString()
    return NextResponse.json({
      attempt: {
        id: result.attempt.id,
        status: result.attempt.status,
        started_at: result.attempt.started_at,
        ends_at: result.attempt.ends_at,
        proctor_event_count: result.attempt.proctor_event_count,
        server_now: serverNow,
      },
      assessment: {
        id: assessment.id,
        title: assessment.title,
        mode: assessment.mode,
        directions: assessment.directions,
        duration_minutes: assessment.duration_minutes,
      },
      sections,
      passages,
      questions: buildStudentQuestionsPayload(questions, result.attempt, false),
      answers: buildStudentAnswerMap(answers),
    })
  } catch (error) {
    console.error('Student assessment start error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
