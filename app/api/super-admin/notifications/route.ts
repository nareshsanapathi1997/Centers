import { NextRequest, NextResponse } from 'next/server'
import { verifySuperAdminAuth } from '@/lib/super-admin-auth'
import {

  getNotificationsWithUnreadCount,
  markNotificationAsReadForUser,
  markNotificationAsUnreadForUser,
  markAllNotificationsAsRead,
} from '@/lib/notifications'

export const dynamic = 'force-dynamic'

// Get notifications
export async function GET(request: NextRequest) {
  try {
    const authResult = await verifySuperAdminAuth(request)
    if (!authResult.authorized) {
      return NextResponse.json(
        { error: authResult.error || 'Unauthorized' },
        { status: 403 }
      )
    }

    const { searchParams } = new URL(request.url)
    const unreadOnly = searchParams.get('unreadOnly') === 'true'
    const limit = parseInt(searchParams.get('limit') || '50')
    const offset = parseInt(searchParams.get('offset') || '0')

    const { notifications, unreadCount } = await getNotificationsWithUnreadCount(
      'super_admin',
      authResult.adminId!,
      { unreadOnly, limit, offset },
    )

    return NextResponse.json({ notifications, unreadCount })
  } catch (error) {
    console.error('Error fetching notifications:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// Mark notification as read
export async function PATCH(request: NextRequest) {
  try {
    const authResult = await verifySuperAdminAuth(request)
    if (!authResult.authorized) {
      return NextResponse.json(
        { error: authResult.error || 'Unauthorized' },
        { status: 403 }
      )
    }

    const { notificationId, markAll, markUnread } = await request.json()

    if (markAll) {
      await markAllNotificationsAsRead('super_admin', authResult.adminId!)
      return NextResponse.json({ message: 'All notifications marked as read' })
    } else {
      if (!notificationId) {
        return NextResponse.json({ error: 'Notification ID is required' }, { status: 400 })
      }

      if (markUnread) {
        const ok = await markNotificationAsUnreadForUser(notificationId, 'super_admin', authResult.adminId!)
        if (!ok) return NextResponse.json({ error: 'Notification not found' }, { status: 404 })
        return NextResponse.json({ message: 'Notification marked as unread' })
      } else {
        const ok = await markNotificationAsReadForUser(notificationId, 'super_admin', authResult.adminId!)
        if (!ok) return NextResponse.json({ error: 'Notification not found' }, { status: 404 })
        return NextResponse.json({ message: 'Notification marked as read' })
      }
    }
  } catch (error) {
    console.error('Error updating notification:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
