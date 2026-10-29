import { NextRequest, NextResponse } from 'next/server'

import { requireAdminPermission, httpMethodToAction } from '@/lib/admin-access'
import { createNotification } from '@/lib/notifications'
import { getAdminToken } from '@/lib/auth'

export const dynamic = 'force-dynamic'

/**
 * POST - Create a test notification for the current admin (so you can see something in the list).
 */
export async function POST(request: NextRequest) {
  try {
    const token = getAdminToken(request)
    if (!token) {
      return NextResponse.json({ error: 'No token provided' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const centerId = searchParams.get('centerId')
    if (!centerId) {
      return NextResponse.json({ error: 'Center ID is required' }, { status: 400 })
    }

    const perm = await requireAdminPermission(token, parseInt(centerId), 'enquiries', 'update')
    if (!perm.ok) return NextResponse.json({ error: perm.error }, { status: perm.status })

    await createNotification({
      user_type: 'admin',
      user_id: perm.adminId,
      center_id: parseInt(centerId),
      title: 'Test notification',
      message: 'This is a test. Real notifications will come from Super Admin.',
      type: 'info',
    })

    return NextResponse.json({ message: 'Test notification sent' })
  } catch (error) {
    console.error('Error creating test notification:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
