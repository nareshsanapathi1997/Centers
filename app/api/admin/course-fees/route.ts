import { NextRequest, NextResponse } from 'next/server'

import { requireAdminPermission, httpMethodToAction } from '@/lib/admin-access'
import { getAdminToken } from '@/lib/auth'
import {
  listCenterAssignedCourses,
  listMainCoursesForCenter,
  upsertBatchCenterFee,
  upsertCenterFee,
} from '@/lib/course-fees-db'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  try {
    const token = getAdminToken(request)
    if (!token) return NextResponse.json({ error: 'No token provided' }, { status: 401 })

    const centerId = Number(request.nextUrl.searchParams.get('centerId'))
    if (!centerId) return NextResponse.json({ error: 'centerId is required' }, { status: 400 })

    const perm = await requireAdminPermission(token, centerId, 'course_fees', httpMethodToAction(request.method))
    if (!perm.ok) return NextResponse.json({ error: perm.error }, { status: perm.status })

    const courses = await listCenterAssignedCourses(centerId)
    const mainCourses = await listMainCoursesForCenter(centerId)
    return NextResponse.json({ mainCourses, courses })
  } catch (error) {
    console.error('Error fetching center course fees:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const token = getAdminToken(request)
    if (!token) return NextResponse.json({ error: 'No token provided' }, { status: 401 })

    const body = await request.json()
    const centerId = Number(body.center_id)
    const courseMasterId = Number(body.course_master_id)
    if (!centerId || !courseMasterId) {
      return NextResponse.json({ error: 'center_id and course_master_id are required' }, { status: 400 })
    }

    const perm = await requireAdminPermission(token, centerId, 'course_fees', httpMethodToAction(request.method))
    if (!perm.ok) return NextResponse.json({ error: perm.error }, { status: perm.status })

    const batchId = body.batch_id ? Number(body.batch_id) : null
    if (batchId) {
      const saved = await upsertBatchCenterFee(batchId, courseMasterId, centerId, {
        ...body,
        configured_by: body.configured_by || 'center',
        status: body.status || 'saved',
      })
      return NextResponse.json(saved)
    }

    const saved = await upsertCenterFee(courseMasterId, centerId, {
      ...body,
      configured_by: body.configured_by || 'center',
      status: body.status || 'saved',
    })
    return NextResponse.json(saved)
  } catch (error) {
    console.error('Error saving center fee:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
