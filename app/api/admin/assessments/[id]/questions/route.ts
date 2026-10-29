import { NextRequest, NextResponse } from 'next/server'
import { getAdminToken } from '@/lib/auth'
import { requireAdminPermission, httpMethodToAction } from '@/lib/admin-access'
import { isAssessmentQuestionType } from '@/lib/assessment-content'
import {

  createQuestion,
  deleteQuestion,
  getAssessmentById,
  listQuestions,
  updateQuestion,
  validateQuestionInput,
  type McqOption,
  type AssessmentQuestionType,
} from '@/lib/student-assessments-db'

export const dynamic = 'force-dynamic'

async function authorize(request: NextRequest, centerId: number) {
  const token = getAdminToken(request)
  if (!token) return { ok: false as const, status: 401, error: 'Unauthorized' }
  const perm = await requireAdminPermission(token, centerId, 'assessments', httpMethodToAction(request.method))
  if (!perm.ok) return { ok: false as const, status: perm.status, error: perm.error }
  return { ok: true as const }
}

async function loadOwnedAssessment(assessmentId: number, centerId: number) {
  return getAssessmentById(assessmentId, centerId)
}

function resolveQuestionType(body: any): AssessmentQuestionType {
  if (isAssessmentQuestionType(body.questionType)) return body.questionType
  if (isAssessmentQuestionType(body.question_type)) return body.question_type
  return 'single_choice'
}

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

    const auth = await authorize(request, centerId)
    if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status })

    const assessment = await loadOwnedAssessment(assessmentId, centerId)
    if (!assessment) return NextResponse.json({ error: 'Not found' }, { status: 404 })

    const questions = await listQuestions(assessmentId)
    return NextResponse.json({ questions })
  } catch (error) {
    console.error('Admin questions GET error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const assessmentId = parseInt(params.id, 10)
    const body = await request.json()
    const centerId = parseInt(body.centerId, 10)
    if (!assessmentId || !centerId) {
      return NextResponse.json({ error: 'id and centerId are required' }, { status: 400 })
    }

    const auth = await authorize(request, centerId)
    if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status })

    const assessment = await loadOwnedAssessment(assessmentId, centerId)
    if (!assessment) return NextResponse.json({ error: 'Not found' }, { status: 404 })

    if (!body.prompt?.trim()) {
      return NextResponse.json({ error: 'prompt is required' }, { status: 400 })
    }

    const questionType = resolveQuestionType(body)
    const options = (body.options || []) as McqOption[]
    const correctOptionId = body.correctOptionId != null ? String(body.correctOptionId) : null
    const correctOptionIds = Array.isArray(body.correctOptionIds)
      ? body.correctOptionIds.map(String)
      : null
    const correctNumeric =
      body.correctNumeric !== undefined && body.correctNumeric !== ''
        ? Number(body.correctNumeric)
        : null

    const validationError = validateQuestionInput({
      questionType,
      options,
      correctOptionId,
      correctOptionIds,
      correctNumeric,
    })
    if (validationError) {
      return NextResponse.json({ error: validationError }, { status: 400 })
    }

    const question = await createQuestion({
      assessmentId,
      sectionId: body.sectionId != null && body.sectionId !== '' ? parseInt(body.sectionId, 10) : null,
      passageId: body.passageId != null && body.passageId !== '' ? parseInt(body.passageId, 10) : null,
      questionType,
      prompt: body.prompt,
      options,
      correctOptionId,
      correctOptionIds,
      correctNumeric,
      mediaUrls: Array.isArray(body.mediaUrls) ? body.mediaUrls : [],
      marks: body.marks != null && body.marks !== '' ? Number(body.marks) : null,
      explanation: body.explanation,
      sortOrder: body.sortOrder != null ? parseInt(body.sortOrder, 10) : 0,
    })

    return NextResponse.json({ question })
  } catch (error) {
    console.error('Admin questions POST error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const assessmentId = parseInt(params.id, 10)
    const body = await request.json()
    const centerId = parseInt(body.centerId, 10)
    const questionId = parseInt(body.questionId, 10)
    if (!assessmentId || !centerId || !questionId) {
      return NextResponse.json({ error: 'id, centerId, and questionId are required' }, { status: 400 })
    }

    const auth = await authorize(request, centerId)
    if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status })

    const assessment = await loadOwnedAssessment(assessmentId, centerId)
    if (!assessment) return NextResponse.json({ error: 'Not found' }, { status: 404 })

    const questionType = resolveQuestionType(body)
    const options = body.options as McqOption[] | undefined
    const correctOptionId =
      body.correctOptionId !== undefined ? String(body.correctOptionId || '') : undefined
    const correctOptionIds = Array.isArray(body.correctOptionIds)
      ? body.correctOptionIds.map(String)
      : undefined
    const correctNumeric =
      body.correctNumeric !== undefined
        ? body.correctNumeric !== '' && body.correctNumeric != null
          ? Number(body.correctNumeric)
          : null
        : undefined

    if (body.prompt != null || options || correctOptionId !== undefined || correctOptionIds || correctNumeric !== undefined) {
      const validationError = validateQuestionInput({
        questionType,
        options: options || [],
        correctOptionId: correctOptionId ?? null,
        correctOptionIds: correctOptionIds ?? null,
        correctNumeric: correctNumeric ?? null,
      })
      if (validationError) {
        return NextResponse.json({ error: validationError }, { status: 400 })
      }
    }

    const question = await updateQuestion(questionId, assessmentId, {
      sectionId: body.sectionId !== undefined
        ? body.sectionId != null && body.sectionId !== ''
          ? parseInt(body.sectionId, 10)
          : null
        : undefined,
      passageId: body.passageId !== undefined
        ? body.passageId != null && body.passageId !== ''
          ? parseInt(body.passageId, 10)
          : null
        : undefined,
      questionType,
      prompt: body.prompt,
      options,
      correctOptionId,
      correctOptionIds,
      correctNumeric,
      mediaUrls: body.mediaUrls,
      marks: body.marks !== undefined ? (body.marks != null && body.marks !== '' ? Number(body.marks) : null) : undefined,
      explanation: body.explanation,
      sortOrder: body.sortOrder != null ? parseInt(body.sortOrder, 10) : undefined,
    })

    if (!question) return NextResponse.json({ error: 'Question not found' }, { status: 404 })
    return NextResponse.json({ question })
  } catch (error) {
    console.error('Admin questions PUT error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const assessmentId = parseInt(params.id, 10)
    const centerId = parseInt(request.nextUrl.searchParams.get('centerId') || '', 10)
    const questionId = parseInt(request.nextUrl.searchParams.get('questionId') || '', 10)
    if (!assessmentId || !centerId || !questionId) {
      return NextResponse.json({ error: 'id, centerId, and questionId are required' }, { status: 400 })
    }

    const auth = await authorize(request, centerId)
    if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status })

    const assessment = await loadOwnedAssessment(assessmentId, centerId)
    if (!assessment) return NextResponse.json({ error: 'Not found' }, { status: 404 })

    const deleted = await deleteQuestion(questionId, assessmentId)
    if (!deleted) return NextResponse.json({ error: 'Question not found' }, { status: 404 })
    return NextResponse.json({ message: 'Deleted' })
  } catch (error) {
    console.error('Admin questions DELETE error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
