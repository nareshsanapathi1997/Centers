import { NextRequest, NextResponse } from 'next/server'
import { getAdminToken } from '@/lib/auth'
import { requireAdminPermission, httpMethodToAction } from '@/lib/admin-access'
import { getCenterFee, resolveCenterFee, upsertCenterFee } from '@/lib/course-fees-db'

export const dynamic = 'force-dynamic'

type RouteContext = { params: Promise<{ courseId: string }> }

export async function GET(request: NextRequest, context: RouteContext) {
  try {
    const token = getAdminToken(request)
    if (!token) return NextResponse.json({ error: 'No token provided' }, { status: 401 })

    const centerId = Number(request.nextUrl.searchParams.get('centerId'))
    if (!centerId) return NextResponse.json({ error: 'centerId is required' }, { status: 400 })

    const perm = await requireAdminPermission(token, centerId, 'course_fees', httpMethodToAction(request.method))
    if (!perm.ok) return NextResponse.json({ error: perm.error }, { status: perm.status })

    const { courseId } = await context.params
    const batchIdParam = request.nextUrl.searchParams.get('batchId')
    const batchId = batchIdParam ? Number(batchIdParam) : null
    const fee = await getCenterFee(Number(courseId), centerId)
    const resolved = await resolveCenterFee(
      Number(courseId),
      centerId,
      batchId && Number.isFinite(batchId) ? batchId : null
    )
    return NextResponse.json({ center_fee: fee, resolved })
  } catch (error) {
    console.error('Error fetching center fee detail:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function PUT(request: NextRequest, context: RouteContext) {
  try {
    const token = getAdminToken(request)
    if (!token) return NextResponse.json({ error: 'No token provided' }, { status: 401 })

    const body = await request.json()
    const centerId = Number(body.center_id)
    if (!centerId) return NextResponse.json({ error: 'center_id is required' }, { status: 400 })

    const perm = await requireAdminPermission(token, centerId, 'course_fees', httpMethodToAction(request.method))
    if (!perm.ok) return NextResponse.json({ error: perm.error }, { status: perm.status })

    const { courseId } = await context.params
    const saved = await upsertCenterFee(Number(courseId), centerId, body)
    return NextResponse.json(saved)
  } catch (error) {
    console.error('Error updating center fee:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
