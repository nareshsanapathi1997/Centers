import { NextRequest, NextResponse } from 'next/server'
import { getAdminToken } from '@/lib/auth'
import { requireAdminPermission, httpMethodToAction } from '@/lib/admin-access'
import {

  deleteAssessment,
  getAssessmentById,
  listPassages,
  listQuestions,
  listSections,
  updateAssessment,
  type AssessmentMode,
  type ShowResults,
} from '@/lib/student-assessments-db'

export const dynamic = 'force-dynamic'

const MODES: AssessmentMode[] = ['practice', 'mock', 'live']
const SHOW_RESULTS: ShowResults[] = ['immediate', 'after_end', 'never']

async function authorize(request: NextRequest, centerId: number) {
  const token = getAdminToken(request)
  if (!token) return { ok: false as const, status: 401, error: 'Unauthorized' }
  const perm = await requireAdminPermission(token, centerId, 'assessments', httpMethodToAction(request.method))
  if (!perm.ok) return { ok: false as const, status: perm.status, error: perm.error }
  return { ok: true as const, adminId: perm.adminId }
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

    const assessment = await getAssessmentById(assessmentId, centerId)
    if (!assessment) return NextResponse.json({ error: 'Not found' }, { status: 404 })

    const [sections, questions, passages] = await Promise.all([
      listSections(assessmentId),
      listQuestions(assessmentId),
      listPassages(assessmentId),
    ])

    return NextResponse.json({ assessment, sections, questions, passages })
  } catch (error) {
    console.error('Admin assessment GET error:', error)
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
    if (!assessmentId || !centerId) {
      return NextResponse.json({ error: 'id and centerId are required' }, { status: 400 })
    }

    const auth = await authorize(request, centerId)
    if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status })

    if (body.mode && !MODES.includes(body.mode)) {
      return NextResponse.json({ error: 'Invalid mode' }, { status: 400 })
    }
    if (body.showResults && !SHOW_RESULTS.includes(body.showResults)) {
      return NextResponse.json({ error: 'Invalid showResults' }, { status: 400 })
    }

    const assessment = await updateAssessment(assessmentId, centerId, {
      courseMasterId: body.courseMasterId != null ? parseInt(body.courseMasterId, 10) : undefined,
      batchId: body.batchId !== undefined ? (body.batchId != null ? parseInt(body.batchId, 10) : null) : undefined,
      mode: body.mode,
      title: body.title,
      description: body.description,
      directions: body.directions,
      durationMinutes: body.durationMinutes != null ? parseInt(body.durationMinutes, 10) : undefined,
      maxAttempts: body.maxAttempts != null ? parseInt(body.maxAttempts, 10) : undefined,
      startsAt: body.startsAt,
      endsAt: body.endsAt,
      shuffleQuestions: body.shuffleQuestions,
      shuffleOptions: body.shuffleOptions,
      showResults: body.showResults,
      isPublished: body.isPublished,
      isFree: body.isFree,
      marksCorrect: body.marksCorrect != null ? Number(body.marksCorrect) : undefined,
      marksIncorrect: body.marksIncorrect != null ? Number(body.marksIncorrect) : undefined,
    })

    if (!assessment) return NextResponse.json({ error: 'Not found' }, { status: 404 })
    return NextResponse.json({ assessment })
  } catch (error) {
    console.error('Admin assessment PUT error:', error)
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
    if (!assessmentId || !centerId) {
      return NextResponse.json({ error: 'id and centerId are required' }, { status: 400 })
    }

    const auth = await authorize(request, centerId)
    if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status })

    const deleted = await deleteAssessment(assessmentId, centerId)
    if (!deleted) return NextResponse.json({ error: 'Not found' }, { status: 404 })
    return NextResponse.json({ message: 'Deleted' })
  } catch (error) {
    console.error('Admin assessment DELETE error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
