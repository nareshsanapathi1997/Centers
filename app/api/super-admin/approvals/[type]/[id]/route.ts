import { NextRequest, NextResponse } from 'next/server'
import pool from '@/lib/db'
import { verifySuperAdminAccess } from '@/lib/auth'
import { logActivity } from '@/lib/activity-log'
import { notifyCenterAdminsAboutApprovalResult } from '@/lib/notifications'

export const dynamic = 'force-dynamic'

// PATCH - Approve or reject an item
export async function PATCH(
  request: NextRequest,
  { params }: { params: { type: string; id: string } }
) {
  try {
    const authResult = await verifySuperAdminAccess(request)
    if (!authResult.isValid) {
      return NextResponse.json({ error: authResult.error || 'Unauthorized' }, { status: 403 })
    }

    const body = await request.json()
    const { action, rejection_reason } = body // action: 'approve' or 'reject'

    if (!action || !['approve', 'reject'].includes(action)) {
      return NextResponse.json({ error: 'Invalid action. Must be "approve" or "reject"' }, { status: 400 })
    }

    const approvalStatus = action === 'approve' ? 'approved' : 'rejected'
    const tableName =
      params.type === 'news' ? 'news_items' : params.type === 'hero' ? 'hero_slides' : 'alerts'

    if (!['news', 'alerts', 'hero'].includes(params.type)) {
      return NextResponse.json({ error: 'Invalid type. Must be "news", "alerts", or "hero"' }, { status: 400 })
    }

    const updateQuery = `
      UPDATE ${tableName} 
      SET approval_status = $1,
          approved_by = $2,
          approved_at = CURRENT_TIMESTAMP,
          rejection_reason = $3,
          updated_at = CURRENT_TIMESTAMP
      WHERE id = $4
      RETURNING *
    `

    const result = await pool.query(updateQuery, [
      approvalStatus,
      authResult.adminId,
      rejection_reason || null,
      params.id,
    ])

    if (result.rows.length === 0) {
      return NextResponse.json({ error: 'Item not found' }, { status: 404 })
    }

    const item = result.rows[0]
    const entityTitle = item.title || (typeof item.message === 'string' ? item.message.substring(0, 80) : 'Item')

    const notifType = params.type === 'news' ? 'news' : params.type === 'hero' ? 'hero' : 'alert'

    if (item.center_id) {
      await notifyCenterAdminsAboutApprovalResult({
        centerId: item.center_id,
        type: notifType,
        title: entityTitle,
        action: action === 'approve' ? 'approved' : 'rejected',
        rejectionReason: body.rejection_reason ?? null,
      })
    }

    const entityType = params.type === 'news' ? 'news_item' : params.type === 'hero' ? 'hero_slide' : 'alert'

    await logActivity(
      {
        user_type: 'super_admin',
        user_id: authResult.adminId!,
        center_id: item.center_id,
        action: action === 'approve' ? 'approve' : 'reject',
        entity_type: entityType,
        entity_id: parseInt(params.id),
        entity_name: entityTitle,
      },
      request
    )

    return NextResponse.json({ success: true, item: result.rows[0] })
  } catch (error: any) {
    console.error('Error updating approval status:', error)
    return NextResponse.json(
      { error: 'Failed to update approval status', details: error.message },
      { status: 500 }
    )
  }
}
