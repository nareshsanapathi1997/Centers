import { NextRequest, NextResponse } from 'next/server'
import { verifySuperAdminAuth } from '@/lib/super-admin-auth'
import { createDiscounts, deleteDiscount, listDiscounts } from '@/lib/course-fees-db'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  try {
    const authResult = await verifySuperAdminAuth(request)
    if (!authResult.authorized) {
      return NextResponse.json({ error: authResult.error || 'Unauthorized' }, { status: 403 })
    }

    const courseMasterId = request.nextUrl.searchParams.get('courseMasterId')
    const centerId = request.nextUrl.searchParams.get('centerId')
    const rows = await listDiscounts({
      courseMasterId: courseMasterId ? Number(courseMasterId) : undefined,
      centerId: centerId ? Number(centerId) : undefined,
    })
    return NextResponse.json(rows)
  } catch (error) {
    console.error('Error fetching discounts:', error)
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
    if (!body.course_master_id || !body.name || !body.discount_type || body.discount_value == null) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    const centerIds = Array.isArray(body.center_ids)
      ? body.center_ids.map((id: unknown) => Number(id)).filter((id: number) => Number.isFinite(id) && id > 0)
      : body.center_id
        ? [Number(body.center_id)]
        : []

    if (!centerIds.length) {
      return NextResponse.json({ error: 'Choose at least one centre. Promos are centre-scoped (global promos are no longer supported).' }, { status: 400 })
    }

    const created = await createDiscounts({
      course_master_id: Number(body.course_master_id),
      center_ids: centerIds,
      name: body.name,
      discount_type: body.discount_type,
      discount_value: Number(body.discount_value),
      coupon_code: body.coupon_code || null,
      is_active: body.is_active !== false,
    })
    return NextResponse.json(created, { status: 201 })
  } catch (error) {
    console.error('Error creating discount:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const authResult = await verifySuperAdminAuth(request)
    if (!authResult.authorized) {
      return NextResponse.json({ error: authResult.error || 'Unauthorized' }, { status: 403 })
    }

    const id = Number(request.nextUrl.searchParams.get('id'))
    if (!id) return NextResponse.json({ error: 'id is required' }, { status: 400 })

    await deleteDiscount(id)
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error deleting discount:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
