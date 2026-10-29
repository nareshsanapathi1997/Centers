import { NextRequest, NextResponse } from 'next/server'
import { getStudentToken, verifyStudentAccess } from '@/lib/student-auth'
import {

  buildStudentAnswerMap,
  buildStudentQuestionsPayload,
  canShowResults,
  ensureAttemptNotTimedOut,
  getAssessmentById,
  getAttemptAnswers,
  getAttemptById,
  listPassages,
  listQuestions,
  listSections,
  saveAnswers,
} from '@/lib/student-assessments-db'

export const dynamic = 'force-dynamic'

async function authorizeAttempt(request: NextRequest, attemptId: number, centerId: number) {
  const token = getStudentToken(request)
  if (!token) return { ok: false as const, status: 401, error: 'Unauthorized' }

  const auth = await verifyStudentAccess(token, centerId)
  if (!auth.authorized) return { ok: false as const, status: 403, error: auth.error || 'Forbidden' }

  let attempt = await getAttemptById(attemptId)
  if (!attempt || attempt.student_id !== auth.studentId || attempt.center_id !== centerId) {
    return { ok: false as const, status: 404, error: 'Attempt not found' }
  }

  attempt = await ensureAttemptNotTimedOut(attempt)
  return { ok: true as const, studentId: auth.studentId!, attempt }
}

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

    const auth = await authorizeAttempt(request, attemptId, centerId)
    if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status })

    const assessment = await getAssessmentById(auth.attempt.assessment_id, centerId)
    if (!assessment) return NextResponse.json({ error: 'Assessment not found' }, { status: 404 })

    const [questions, sections, passages, answers] = await Promise.all([
      listQuestions(assessment.id),
      listSections(assessment.id),
      listPassages(assessment.id),
      getAttemptAnswers(attemptId),
    ])

    return NextResponse.json({
      attempt: {
        id: auth.attempt.id,
        status: auth.attempt.status,
        started_at: auth.attempt.started_at,
        ends_at: auth.attempt.ends_at,
        submitted_at: auth.attempt.submitted_at,
        score: auth.attempt.status === 'in_progress' ? null : auth.attempt.score,
        max_score: auth.attempt.status === 'in_progress' ? null : auth.attempt.max_score,
        proctor_event_count: auth.attempt.proctor_event_count,
        server_now: new Date().toISOString(),
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
      questions: buildStudentQuestionsPayload(
        questions,
        auth.attempt,
        auth.attempt.status !== 'in_progress' && canShowResults(assessment)
      ),
      answers: buildStudentAnswerMap(answers),
    })
  } catch (error) {
    console.error('Student attempt GET error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: { attemptId: string } }
) {
  try {
    const attemptId = parseInt(params.attemptId, 10)
    const body = await request.json()
    const centerId = parseInt(body.centerId, 10)
    if (!attemptId || !centerId) {
      return NextResponse.json({ error: 'attemptId and centerId are required' }, { status: 400 })
    }

    const auth = await authorizeAttempt(request, attemptId, centerId)
    if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status })

    if (auth.attempt.status !== 'in_progress') {
      return NextResponse.json({ error: 'Attempt is locked' }, { status: 403 })
    }

    const answers = Array.isArray(body.answers) ? body.answers : []
    const mapped = answers
      .map((a: {
        questionId?: number
        question_id?: number
        selectedOptionId?: string | null
        selected_option_id?: string | null
        selectedOptionIds?: string[] | null
        selected_option_ids?: string[] | null
        numericAnswer?: number | string | null
        numeric_answer?: number | string | null
      }) => ({
        questionId: Number(a.questionId ?? a.question_id),
        selectedOptionId:
          a.selectedOptionId !== undefined
            ? a.selectedOptionId
            : a.selected_option_id !== undefined
              ? a.selected_option_id
              : null,
        selectedOptionIds:
          a.selectedOptionIds !== undefined
            ? a.selectedOptionIds
            : a.selected_option_ids !== undefined
              ? a.selected_option_ids
              : null,
        numericAnswer:
          a.numericAnswer !== undefined
            ? a.numericAnswer
            : a.numeric_answer !== undefined
              ? a.numeric_answer
              : null,
      }))
      .filter((a: { questionId: number }) => Number.isFinite(a.questionId))

    const result = await saveAnswers(attemptId, mapped)
    if (!result.ok) {
      return NextResponse.json(
        { error: result.error, attempt: result.attempt },
        { status: result.status || 400 }
      )
    }

    return NextResponse.json({
      message: 'Saved',
      server_now: new Date().toISOString(),
      ends_at: result.attempt?.ends_at || auth.attempt.ends_at,
    })
  } catch (error) {
    console.error('Student attempt PUT error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
