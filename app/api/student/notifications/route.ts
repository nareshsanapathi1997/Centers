import { NextRequest, NextResponse } from 'next/server'
import { getStudentToken, verifyStudentAccess } from '@/lib/student-auth'
import {

  getNotificationsWithUnreadCount,
  markNotificationAsReadForUser,
  markAllNotificationsAsRead,
} from '@/lib/notifications'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  try {
    const centerId = parseInt(request.nextUrl.searchParams.get('centerId') || '', 10)
    if (!centerId) {
      return NextResponse.json({ error: 'centerId is required' }, { status: 400 })
    }

    const token = getStudentToken(request)
    if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const auth = await verifyStudentAccess(token, centerId)
    if (!auth.authorized) return NextResponse.json({ error: auth.error }, { status: 403 })

    const unreadOnly = request.nextUrl.searchParams.get('unreadOnly') === 'true'
    const limit = parseInt(request.nextUrl.searchParams.get('limit') || '30', 10)

    const { notifications, unreadCount } = await getNotificationsWithUnreadCount(
      'student',
      auth.studentId!,
      { unreadOnly, limit }
    )

    return NextResponse.json({ notifications, unreadCount })
  } catch (error) {
    console.error('Student notifications GET error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const body = await request.json()
    const centerId = parseInt(body.centerId, 10)
    if (!centerId) {
      return NextResponse.json({ error: 'centerId is required' }, { status: 400 })
    }

    const token = getStudentToken(request)
    if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const auth = await verifyStudentAccess(token, centerId)
    if (!auth.authorized) return NextResponse.json({ error: auth.error }, { status: 403 })

    if (body.markAll) {
      await markAllNotificationsAsRead('student', auth.studentId!)
      return NextResponse.json({ message: 'All marked as read' })
    }

    if (body.notificationId) {
      const ok = await markNotificationAsReadForUser(body.notificationId, 'student', auth.studentId!)
      if (!ok) {
        return NextResponse.json({ error: 'Notification not found' }, { status: 404 })
      }
      return NextResponse.json({ message: 'Marked as read' })
    }

    return NextResponse.json({ error: 'notificationId or markAll required' }, { status: 400 })
  } catch (error) {
    console.error('Student notifications PATCH error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
