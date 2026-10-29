import { NextRequest, NextResponse } from 'next/server'
import pool from '@/lib/db'
import { getAdminToken } from '@/lib/auth'
import { requireAdminPermission, httpMethodToAction } from '@/lib/admin-access'
import { logActivity } from '@/lib/activity-log'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  try {
    const token = getAdminToken(request)
    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const searchParams = request.nextUrl.searchParams
    const centerId = parseInt(searchParams.get('centerId') || '0')

    if (!centerId) {
      return NextResponse.json({ error: 'centerId is required' }, { status: 400 })
    }

    const perm = await requireAdminPermission(token, centerId, 'about', httpMethodToAction(request.method))
    if (!perm.ok) return NextResponse.json({ error: perm.error }, { status: perm.status })

    const result = await pool.query(
      'SELECT * FROM faqs WHERE center_id = $1 ORDER BY display_order, created_at DESC',
      [centerId]
    )

    return NextResponse.json(result.rows)
  } catch (error: any) {
    console.error('Error fetching FAQs:', error)
    // If table doesn't exist, return empty array
    if (error.code === '42P01') {
      return NextResponse.json([])
    }
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const token = getAdminToken(request)
    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { center_id, question, answer, display_order, is_active } = body

    if (!center_id || !question || !answer) {
      return NextResponse.json({ error: 'center_id, question, and answer are required' }, { status: 400 })
    }
    const perm = await requireAdminPermission(token, center_id, 'faq', httpMethodToAction(request.method))
    if (!perm.ok) return NextResponse.json({ error: perm.error }, { status: perm.status })

    const result = await pool.query(
      `INSERT INTO faqs (center_id, question, answer, display_order, is_active)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING *`,
      [center_id, question, answer, display_order || 0, is_active !== false]
    )

    const newFAQ = result.rows[0]

    // Log activity
    await logActivity(
      {
        user_type: 'admin',
        user_id: perm.adminId,
        center_id: center_id,
        action: 'create',
        entity_type: 'faq',
        entity_id: newFAQ.id,
        entity_name: question.substring(0, 50),
      },
      request
    )

    return NextResponse.json(newFAQ, { status: 201 })
  } catch (error: any) {
    console.error('Error creating FAQ:', error)
    if (error.code === '42P01') {
      return NextResponse.json({ error: 'FAQs table does not exist. Please run migration script.' }, { status: 500 })
    }
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
