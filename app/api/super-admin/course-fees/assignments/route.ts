import { NextRequest, NextResponse } from 'next/server'
import { verifySuperAdminAuth } from '@/lib/super-admin-auth'
import { assignCourseToCenters, listAssignments, removeAssignment } from '@/lib/course-fees-db'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  try {
    const authResult = await verifySuperAdminAuth(request)
    if (!authResult.authorized) {
      return NextResponse.json({ error: authResult.error || 'Unauthorized' }, { status: 403 })
    }

    const courseMasterId = request.nextUrl.searchParams.get('courseMasterId')
    const centerId = request.nextUrl.searchParams.get('centerId')
    const rows = await listAssignments({
      courseMasterId: courseMasterId ? Number(courseMasterId) : undefined,
      centerId: centerId ? Number(centerId) : undefined,
    })
    return NextResponse.json(rows)
  } catch (error) {
    console.error('Error fetching assignments:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const authResult = await verifySuperAdminAuth(request)
    if (!authResult.authorized) {
      return NextResponse.json({ error: authResult.error || 'Unauthorized' }, { status: 403 })
    }

    const body = await request.json()
    const courseMasterId = Number(body.course_master_id)
    const centerIds: number[] = Array.isArray(body.center_ids)
      ? body.center_ids.map(Number).filter(Boolean)
      : body.center_id
        ? [Number(body.center_id)]
        : []

    if (!courseMasterId || centerIds.length === 0) {
      return NextResponse.json({ error: 'course_master_id and center_ids are required' }, { status: 400 })
    }

    const rows = await assignCourseToCenters(courseMasterId, centerIds, {
      allow_center_override: body.allow_center_override,
      admin_can_customize: body.admin_can_customize,
    })
    return NextResponse.json(rows, { status: 201 })
  } catch (error) {
    console.error('Error assigning course:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const authResult = await verifySuperAdminAuth(request)
    if (!authResult.authorized) {
      return NextResponse.json({ error: authResult.error || 'Unauthorized' }, { status: 403 })
    }

    const courseMasterId = Number(request.nextUrl.searchParams.get('courseMasterId'))
    const centerId = Number(request.nextUrl.searchParams.get('centerId'))
    if (!courseMasterId || !centerId) {
      return NextResponse.json({ error: 'courseMasterId and centerId are required' }, { status: 400 })
    }

    await removeAssignment(courseMasterId, centerId)
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error removing assignment:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
