import { NextRequest, NextResponse } from 'next/server'
import { getAdminToken } from '@/lib/auth'
import { requireAdminPermission, httpMethodToAction } from '@/lib/admin-access'
import {

  createAssessment,
  listAdminAssessments,
  type AssessmentMode,
  type ShowResults,
} from '@/lib/student-assessments-db'

export const dynamic = 'force-dynamic'

const MODES: AssessmentMode[] = ['practice', 'mock', 'live']
const SHOW_RESULTS: ShowResults[] = ['immediate', 'after_end', 'never']

export async function GET(request: NextRequest) {
  try {
    const centerId = parseInt(request.nextUrl.searchParams.get('centerId') || '', 10)
    if (!centerId) {
      return NextResponse.json({ error: 'centerId is required' }, { status: 400 })
    }

    const token = getAdminToken(request)
    if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const perm = await requireAdminPermission(token, centerId, 'assessments', httpMethodToAction(request.method))
    if (!perm.ok) return NextResponse.json({ error: perm.error }, { status: perm.status })

    const assessments = await listAdminAssessments(centerId)
    return NextResponse.json({ assessments })
  } catch (error) {
    console.error('Admin assessments GET error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const centerId = parseInt(body.centerId, 10)
    if (!centerId) {
      return NextResponse.json({ error: 'centerId is required' }, { status: 400 })
    }

    const token = getAdminToken(request)
    if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const perm = await requireAdminPermission(token, centerId, 'assessments', httpMethodToAction(request.method))
    if (!perm.ok) return NextResponse.json({ error: perm.error }, { status: perm.status })

    const mode = body.mode as AssessmentMode
    if (!MODES.includes(mode)) {
      return NextResponse.json({ error: 'mode must be practice, mock, or live' }, { status: 400 })
    }
    if (!body.courseMasterId || !body.title?.trim()) {
      return NextResponse.json({ error: 'courseMasterId and title are required' }, { status: 400 })
    }
    if (body.showResults && !SHOW_RESULTS.includes(body.showResults)) {
      return NextResponse.json({ error: 'Invalid showResults value' }, { status: 400 })
    }
    if (mode === 'live' && (!body.startsAt || !body.endsAt)) {
      return NextResponse.json({ error: 'Live exams require startsAt and endsAt' }, { status: 400 })
    }

    const assessment = await createAssessment({
      centerId,
      courseMasterId: parseInt(body.courseMasterId, 10),
      batchId: body.batchId != null ? parseInt(body.batchId, 10) : null,
      mode,
      title: body.title,
      description: body.description,
      durationMinutes: parseInt(body.durationMinutes, 10) || 60,
      maxAttempts: parseInt(body.maxAttempts, 10) || (mode === 'practice' ? 3 : 1),
      startsAt: body.startsAt || null,
      endsAt: body.endsAt || null,
      shuffleQuestions: Boolean(body.shuffleQuestions),
      shuffleOptions: Boolean(body.shuffleOptions),
      showResults: body.showResults || 'immediate',
      isPublished: Boolean(body.isPublished),
      isFree: Boolean(body.isFree),
      marksCorrect: body.marksCorrect != null ? Number(body.marksCorrect) : 1,
      marksIncorrect: body.marksIncorrect != null ? Number(body.marksIncorrect) : 0,
      createdBy: perm.adminId,
    })

    return NextResponse.json({ assessment })
  } catch (error) {
    console.error('Admin assessments POST error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
