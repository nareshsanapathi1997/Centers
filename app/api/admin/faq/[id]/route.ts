import { NextRequest, NextResponse } from 'next/server'
import pool from '@/lib/db'
import { getAdminToken } from '@/lib/auth'
import { requireAdminPermission, httpMethodToAction } from '@/lib/admin-access'
import { logActivity } from '@/lib/activity-log'

export const dynamic = 'force-dynamic'

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const token = getAdminToken(request)
    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { question, answer, display_order, is_active } = body

    // Get the FAQ to verify center_id
    const faqResult = await pool.query('SELECT center_id FROM faqs WHERE id = $1', [params.id])
    
    if (faqResult.rows.length === 0) {
      return NextResponse.json({ error: 'FAQ not found' }, { status: 404 })
    }

    const centerId = faqResult.rows[0].center_id
    const perm = await requireAdminPermission(token, centerId, 'faq', httpMethodToAction(request.method))
    if (!perm.ok) return NextResponse.json({ error: perm.error }, { status: perm.status })

    const updateFields: string[] = []
    const updateValues: any[] = []
    let paramCount = 1

    if (question !== undefined) {
      updateFields.push(`question = $${paramCount++}`)
      updateValues.push(question)
    }
    if (answer !== undefined) {
      updateFields.push(`answer = $${paramCount++}`)
      updateValues.push(answer)
    }
    if (display_order !== undefined) {
      updateFields.push(`display_order = $${paramCount++}`)
      updateValues.push(display_order)
    }
    if (is_active !== undefined) {
      updateFields.push(`is_active = $${paramCount++}`)
      updateValues.push(is_active)
    }

    if (updateFields.length === 0) {
      return NextResponse.json({ error: 'No fields to update' }, { status: 400 })
    }

    updateFields.push(`updated_at = CURRENT_TIMESTAMP`)
    updateValues.push(params.id)

    const result = await pool.query(
      `UPDATE faqs SET ${updateFields.join(', ')} WHERE id = $${paramCount} RETURNING *`,
      updateValues
    )

    // Log activity
    await logActivity(
      {
        user_type: 'admin',
        user_id: perm.adminId,
        center_id: centerId,
        action: 'update',
        entity_type: 'faq',
        entity_id: parseInt(params.id),
        entity_name: question || result.rows[0].question?.substring(0, 50),
        details: body,
      },
      request
    )

    return NextResponse.json(result.rows[0])
  } catch (error) {
    console.error('Error updating FAQ:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const token = getAdminToken(request)
    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get the FAQ to verify center_id
    const faqResult = await pool.query('SELECT center_id FROM faqs WHERE id = $1', [params.id])
    
    if (faqResult.rows.length === 0) {
      return NextResponse.json({ error: 'FAQ not found' }, { status: 404 })
    }

    const centerId = faqResult.rows[0].center_id
    const perm = await requireAdminPermission(token, centerId, 'faq', httpMethodToAction(request.method))
    if (!perm.ok) return NextResponse.json({ error: perm.error }, { status: perm.status })

    // Get FAQ details before deletion
    const faqDetails = await pool.query('SELECT question FROM faqs WHERE id = $1', [params.id])

    await pool.query('DELETE FROM faqs WHERE id = $1', [params.id])

    // Log activity
    await logActivity(
      {
        user_type: 'admin',
        user_id: perm.adminId,
        center_id: centerId,
        action: 'delete',
        entity_type: 'faq',
        entity_id: parseInt(params.id),
        entity_name: faqDetails.rows[0]?.question?.substring(0, 50) || 'FAQ',
      },
      request
    )

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error deleting FAQ:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
