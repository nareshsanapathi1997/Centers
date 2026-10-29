import { NextRequest, NextResponse } from 'next/server'
import { getAdminToken } from '@/lib/auth'
import { requireAdminPermission, httpMethodToAction } from '@/lib/admin-access'
import {

  createPassage,
  deletePassage,
  getAssessmentById,
  listPassages,
  updatePassage,
} from '@/lib/student-assessments-db'

export const dynamic = 'force-dynamic'

async function authorize(request: NextRequest, centerId: number) {
  const token = getAdminToken(request)
  if (!token) return { ok: false as const, status: 401, error: 'Unauthorized' }
  const perm = await requireAdminPermission(token, centerId, 'assessments', httpMethodToAction(request.method))
  if (!perm.ok) return { ok: false as const, status: perm.status, error: perm.error }
  return { ok: true as const }
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

    const passages = await listPassages(assessmentId)
    return NextResponse.json({ passages })
  } catch (error) {
    console.error('Admin passages GET error:', error)
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

    const assessment = await getAssessmentById(assessmentId, centerId)
    if (!assessment) return NextResponse.json({ error: 'Not found' }, { status: 404 })

    if (!body.content?.trim() && !(body.title || '').trim()) {
      return NextResponse.json({ error: 'Passage content or title is required' }, { status: 400 })
    }

    const passage = await createPassage({
      assessmentId,
      sectionId: body.sectionId != null && body.sectionId !== '' ? parseInt(body.sectionId, 10) : null,
      title: body.title ?? null,
      content: body.content || '',
      mediaUrls: Array.isArray(body.mediaUrls) ? body.mediaUrls : [],
      sortOrder: body.sortOrder != null ? parseInt(body.sortOrder, 10) : 0,
    })

    return NextResponse.json({ passage })
  } catch (error) {
    console.error('Admin passages POST error:', error)
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
    const passageId = parseInt(body.passageId, 10)
    if (!assessmentId || !centerId || !passageId) {
      return NextResponse.json({ error: 'id, centerId, and passageId are required' }, { status: 400 })
    }

    const auth = await authorize(request, centerId)
    if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status })

    const assessment = await getAssessmentById(assessmentId, centerId)
    if (!assessment) return NextResponse.json({ error: 'Not found' }, { status: 404 })

    const passage = await updatePassage(passageId, assessmentId, {
      sectionId:
        body.sectionId !== undefined
          ? body.sectionId != null && body.sectionId !== ''
            ? parseInt(body.sectionId, 10)
            : null
          : undefined,
      title: body.title,
      content: body.content,
      mediaUrls: body.mediaUrls,
      sortOrder: body.sortOrder != null ? parseInt(body.sortOrder, 10) : undefined,
    })

    if (!passage) return NextResponse.json({ error: 'Passage not found' }, { status: 404 })
    return NextResponse.json({ passage })
  } catch (error) {
    console.error('Admin passages PUT error:', error)
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
    const passageId = parseInt(request.nextUrl.searchParams.get('passageId') || '', 10)
    if (!assessmentId || !centerId || !passageId) {
      return NextResponse.json({ error: 'id, centerId, and passageId are required' }, { status: 400 })
    }

    const auth = await authorize(request, centerId)
    if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status })

    const assessment = await getAssessmentById(assessmentId, centerId)
    if (!assessment) return NextResponse.json({ error: 'Not found' }, { status: 404 })

    const deleted = await deletePassage(passageId, assessmentId)
    if (!deleted) return NextResponse.json({ error: 'Passage not found' }, { status: 404 })
    return NextResponse.json({ message: 'Deleted' })
  } catch (error) {
    console.error('Admin passages DELETE error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
