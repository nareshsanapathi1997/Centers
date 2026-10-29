import { NextRequest, NextResponse } from 'next/server'
import { getAdminToken } from '@/lib/auth'
import { requireAdminPermission, httpMethodToAction } from '@/lib/admin-access'
import {

  createSection,
  deleteSection,
  getAssessmentById,
  listSections,
  updateSection,
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

    const sections = await listSections(assessmentId)
    return NextResponse.json({ sections })
  } catch (error) {
    console.error('Admin sections GET error:', error)
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

    if (!body.title?.trim()) {
      return NextResponse.json({ error: 'title is required' }, { status: 400 })
    }

    const section = await createSection({
      assessmentId,
      title: body.title,
      directions: body.directions ?? null,
      sortOrder: body.sortOrder != null ? parseInt(body.sortOrder, 10) : 0,
      durationMinutes:
        body.durationMinutes != null && body.durationMinutes !== ''
          ? parseInt(body.durationMinutes, 10)
          : null,
    })

    return NextResponse.json({ section })
  } catch (error) {
    console.error('Admin sections POST error:', error)
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
    const sectionId = parseInt(body.sectionId, 10)
    if (!assessmentId || !centerId || !sectionId) {
      return NextResponse.json({ error: 'id, centerId, and sectionId are required' }, { status: 400 })
    }

    const auth = await authorize(request, centerId)
    if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status })

    const assessment = await getAssessmentById(assessmentId, centerId)
    if (!assessment) return NextResponse.json({ error: 'Not found' }, { status: 404 })

    const section = await updateSection(sectionId, assessmentId, {
      title: body.title,
      directions: body.directions !== undefined ? body.directions : undefined,
      sortOrder: body.sortOrder != null ? parseInt(body.sortOrder, 10) : undefined,
      durationMinutes:
        body.durationMinutes !== undefined
          ? body.durationMinutes != null && body.durationMinutes !== ''
            ? parseInt(body.durationMinutes, 10)
            : null
          : undefined,
    })

    if (!section) return NextResponse.json({ error: 'Section not found' }, { status: 404 })
    return NextResponse.json({ section })
  } catch (error) {
    console.error('Admin sections PUT error:', error)
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
    const sectionId = parseInt(request.nextUrl.searchParams.get('sectionId') || '', 10)
    if (!assessmentId || !centerId || !sectionId) {
      return NextResponse.json({ error: 'id, centerId, and sectionId are required' }, { status: 400 })
    }

    const auth = await authorize(request, centerId)
    if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status })

    const assessment = await getAssessmentById(assessmentId, centerId)
    if (!assessment) return NextResponse.json({ error: 'Not found' }, { status: 404 })

    const deleted = await deleteSection(sectionId, assessmentId)
    if (!deleted) return NextResponse.json({ error: 'Section not found' }, { status: 404 })
    return NextResponse.json({ message: 'Deleted' })
  } catch (error) {
    console.error('Admin sections DELETE error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
