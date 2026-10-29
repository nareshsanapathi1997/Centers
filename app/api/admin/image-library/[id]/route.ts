import { NextRequest, NextResponse } from 'next/server'
import { verifyAdminAccess, getAdminToken } from '@/lib/auth'
import pool from '@/lib/db'
import { logActivity } from '@/lib/activity-log'

export const dynamic = 'force-dynamic'

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const token = getAdminToken(request)
    if (!token) {
      return NextResponse.json({ error: 'No token provided' }, { status: 401 })
    }

    const id = parseInt(params.id)
    const imageResult = await pool.query('SELECT center_id FROM image_library WHERE id = $1', [id])

    if (imageResult.rows.length === 0) {
      return NextResponse.json({ error: 'Image not found' }, { status: 404 })
    }

    const centerId = imageResult.rows[0].center_id
    const authResult = await verifyAdminAccess(token, centerId)
    if (!authResult.authorized) {
      return NextResponse.json({ error: authResult.error || 'Unauthorized' }, { status: 403 })
    }

    await pool.query('DELETE FROM image_library WHERE id = $1', [id])

    await logActivity(
      {
        user_type: 'admin',
        user_id: authResult.adminId!,
        center_id: centerId,
        action: 'delete',
        entity_type: 'image_library',
        entity_id: id,
      },
      { headers: request.headers }
    )

    return NextResponse.json({ message: 'Image deleted successfully' })
  } catch (error) {
    console.error('Error deleting image:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
