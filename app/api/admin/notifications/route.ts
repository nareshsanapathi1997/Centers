import { NextRequest, NextResponse } from 'next/server'
import { verifyAdminAccess, getAdminToken } from '@/lib/auth'
import {

  getNotificationsWithUnreadCount,
  markNotificationAsReadForUser,
  markNotificationAsUnreadForUser,
  markAllNotificationsAsRead,
} from '@/lib/notifications'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  try {
    const token = getAdminToken(request)
    if (!token) {
      return NextResponse.json({ error: 'No token provided' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const centerId = searchParams.get('centerId')
    const unreadOnly = searchParams.get('unreadOnly') === 'true'

    if (!centerId) {
      return NextResponse.json({ error: 'Center ID is required' }, { status: 400 })
    }

    const authResult = await verifyAdminAccess(token, parseInt(centerId))
    if (!authResult.authorized) {
      return NextResponse.json({ error: authResult.error || 'Unauthorized' }, { status: 403 })
    }

    const limit = parseInt(searchParams.get('limit') || '50')
    const offset = parseInt(searchParams.get('offset') || '0')

    const { notifications, unreadCount } = await getNotificationsWithUnreadCount('admin', authResult.adminId!, {
      unreadOnly,
      limit,
      offset,
    })

    return NextResponse.json({ notifications, unreadCount })
  } catch (error) {
    console.error('Error fetching notifications:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const token = getAdminToken(request)
    if (!token) {
      return NextResponse.json({ error: 'No token provided' }, { status: 401 })
    }

    const { notificationId, markAll, markUnread } = await request.json()
    const { searchParams } = new URL(request.url)
    const centerId = searchParams.get('centerId')

    if (markAll) {
      if (!centerId) {
        return NextResponse.json({ error: 'Center ID is required' }, { status: 400 })
      }

      const authResult = await verifyAdminAccess(token, parseInt(centerId))
      if (!authResult.authorized) {
        return NextResponse.json({ error: authResult.error || 'Unauthorized' }, { status: 403 })
      }

      await markAllNotificationsAsRead('admin', authResult.adminId!)
      return NextResponse.json({ message: 'All notifications marked as read' })
    }

    if (!notificationId) {
      return NextResponse.json({ error: 'Notification ID is required' }, { status: 400 })
    }

    if (!centerId) {
      return NextResponse.json({ error: 'Center ID is required' }, { status: 400 })
    }

    const authResult = await verifyAdminAccess(token, parseInt(centerId))
    if (!authResult.authorized || !authResult.adminId) {
      return NextResponse.json({ error: authResult.error || 'Unauthorized' }, { status: 403 })
    }

    if (markUnread) {
      const ok = await markNotificationAsUnreadForUser(notificationId, 'admin', authResult.adminId)
      if (!ok) return NextResponse.json({ error: 'Notification not found' }, { status: 404 })
      return NextResponse.json({ message: 'Notification marked as unread' })
    }

    const ok = await markNotificationAsReadForUser(notificationId, 'admin', authResult.adminId)
    if (!ok) return NextResponse.json({ error: 'Notification not found' }, { status: 404 })
    return NextResponse.json({ message: 'Notification marked as read' })
  } catch (error) {
    console.error('Error updating notification:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
