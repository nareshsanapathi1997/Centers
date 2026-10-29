import pool from './db'

// Socket.IO: emit real-time event when a notification is created (used by custom server)
const getSocketEmitter = () => {
  try {
    // require, not import: socket-server.js is CommonJS and shared with
    // server.js, and this must stay a runtime lookup so the module is optional.
    // eslint-disable-next-line @next/next/no-assign-module-variable
    const { emitNotification } = require('./socket-server.js')
    return emitNotification
  } catch {
    return null
  }
}

export interface Notification {
  user_type: 'admin' | 'super_admin' | 'student'
  user_id: number
  center_id?: number | null
  title: string
  message: string
  type?: 'info' | 'success' | 'warning' | 'error'
  link_url?: string | null
}

/**
 * Create a notification and emit real-time event so connected clients can refetch.
 */
export async function createNotification(notification: Notification): Promise<void> {
  try {
    if (notification.user_type === 'student') {
      const pref = await pool.query(
        `SELECT COALESCE(notify_in_app, true) AS notify_in_app FROM students WHERE id = $1`,
        [notification.user_id]
      )
      if (pref.rows[0] && pref.rows[0].notify_in_app === false) {
        return
      }
    }

    await pool.query(
      `INSERT INTO notifications (user_type, user_id, center_id, title, message, type, link_url)
       VALUES ($1, $2, $3, $4, $5, $6, $7)`,
      [
        notification.user_type,
        notification.user_id,
        notification.center_id || null,
        notification.title,
        notification.message,
        notification.type || 'info',
        notification.link_url || null,
      ]
    )
    const emit = getSocketEmitter()
    if (emit) {
      emit({
        userType: notification.user_type,
        userId: notification.user_id,
        centerId: notification.center_id ?? undefined,
      })
    }
  } catch (error) {
    console.error('Error creating notification:', error)
  }
}

/**
 * Get notifications and unread count in one round-trip.
 */
export async function getNotificationsWithUnreadCount(
  userType: 'admin' | 'super_admin' | 'student',
  userId: number,
  options: {
    unreadOnly?: boolean
    limit?: number
    offset?: number
  } = {},
): Promise<{ notifications: any[]; unreadCount: number }> {
  try {
    const conditions: string[] = ['user_type = $1', 'user_id = $2']
    const values: any[] = [userType, userId]
    let paramCount = 3

    if (options.unreadOnly) {
      conditions.push('is_read = false')
    }

    const whereClause = `WHERE ${conditions.join(' AND ')}`
    const limit = options.limit || 50
    const offset = options.offset || 0

    values.push(limit, offset)

    const result = await pool.query(
      `SELECT *,
        COUNT(*) FILTER (WHERE is_read = false) OVER () AS unread_total
       FROM notifications
       ${whereClause}
       ORDER BY created_at DESC
       LIMIT $${paramCount++} OFFSET $${paramCount++}`,
      values,
    )

    const rows = result.rows
    const unreadCount =
      rows.length > 0 ? parseInt(String(rows[0].unread_total), 10) || 0 : 0

    const notifications = rows.map(({ unread_total: _omit, ...row }) => row)

    return { notifications, unreadCount }
  } catch (error) {
    console.error('Error fetching notifications:', error)
    return { notifications: [], unreadCount: 0 }
  }
}

/**
 * Get notifications for a user
 */
export async function getNotifications(
  userType: 'admin' | 'super_admin' | 'student',
  userId: number,
  options: {
    unreadOnly?: boolean
    limit?: number
    offset?: number
  } = {}
): Promise<any[]> {
  try {
    const conditions: string[] = ['user_type = $1', 'user_id = $2']
    const values: any[] = [userType, userId]
    let paramCount = 3

    if (options.unreadOnly) {
      conditions.push(`is_read = false`)
    }

    const whereClause = `WHERE ${conditions.join(' AND ')}`
    const limit = options.limit || 50
    const offset = options.offset || 0

    values.push(limit, offset)

    const result = await pool.query(
      `SELECT * FROM notifications 
       ${whereClause}
       ORDER BY created_at DESC 
       LIMIT $${paramCount++} OFFSET $${paramCount++}`,
      values
    )

    return result.rows
  } catch (error) {
    console.error('Error fetching notifications:', error)
    return []
  }
}

/**
 * Mark notification as read
 */
export async function markNotificationAsRead(notificationId: number): Promise<void> {
  try {
    await pool.query(
      'UPDATE notifications SET is_read = true WHERE id = $1',
      [notificationId]
    )
  } catch (error) {
    console.error('Error marking notification as read:', error)
  }
}

/** Mark read only when the notification belongs to the given user. */
export async function markNotificationAsReadForUser(
  notificationId: number,
  userType: 'admin' | 'super_admin' | 'student',
  userId: number
): Promise<boolean> {
  try {
    const result = await pool.query(
      `UPDATE notifications SET is_read = true
       WHERE id = $1 AND user_type = $2 AND user_id = $3
       RETURNING id`,
      [notificationId, userType, userId]
    )
    return result.rows.length > 0
  } catch (error) {
    console.error('Error marking notification as read:', error)
    return false
  }
}

/** Mark unread only when the notification belongs to the given user. */
export async function markNotificationAsUnreadForUser(
  notificationId: number,
  userType: 'admin' | 'super_admin' | 'student',
  userId: number
): Promise<boolean> {
  try {
    const result = await pool.query(
      `UPDATE notifications SET is_read = false
       WHERE id = $1 AND user_type = $2 AND user_id = $3
       RETURNING id`,
      [notificationId, userType, userId]
    )
    return result.rows.length > 0
  } catch (error) {
    console.error('Error marking notification as unread:', error)
    return false
  }
}

/**
 * Mark notification as unread
 */
export async function markNotificationAsUnread(notificationId: number): Promise<void> {
  try {
    await pool.query(
      'UPDATE notifications SET is_read = false WHERE id = $1',
      [notificationId]
    )
  } catch (error) {
    console.error('Error marking notification as unread:', error)
  }
}

/**
 * Mark all notifications as read for a user
 */
export async function markAllNotificationsAsRead(
  userType: 'admin' | 'super_admin' | 'student',
  userId: number
): Promise<void> {
  try {
    await pool.query(
      'UPDATE notifications SET is_read = true WHERE user_type = $1 AND user_id = $2',
      [userType, userId]
    )
  } catch (error) {
    console.error('Error marking all notifications as read:', error)
  }
}

/**
 * Get unread notification count
 */
export async function getUnreadNotificationCount(
  userType: 'admin' | 'super_admin' | 'student',
  userId: number
): Promise<number> {
  try {
    const result = await pool.query(
      'SELECT COUNT(*) as count FROM notifications WHERE user_type = $1 AND user_id = $2 AND is_read = false',
      [userType, userId]
    )
    return parseInt(result.rows[0].count) || 0
  } catch (error) {
    console.error('Error getting unread notification count:', error)
    return 0
  }
}

/**
 * Notify all super admins when an admin creates or updates something that needs approval
 * (e.g. news item or alert). This makes the item appear in Super Admin's Notifications panel
 * as well as in Approvals.
 */
export async function notifySuperAdminsAboutApproval(params: {
  type: 'news' | 'alert' | 'hero'
  title: string
  centerId: number
}): Promise<void> {
  try {
    const { type, title, centerId } = params
    const label = type === 'news' ? 'News' : type === 'alert' ? 'Alert' : 'Hero slide'
    const centerResult = await pool.query('SELECT name FROM centers WHERE id = $1', [centerId])
    const centerName = centerResult.rows[0]?.name || 'A center'
    const superAdminsResult = await pool.query(
      'SELECT id FROM super_admins WHERE is_active = true',
      []
    )
    const superAdmins = superAdminsResult.rows as { id: number }[]
    const message = `${label} "${title}" from ${centerName} is pending approval.`
    for (const sa of superAdmins) {
      await createNotification({
        user_type: 'super_admin',
        user_id: sa.id,
        title: `Pending approval: ${label}`,
        message,
        type: 'warning',
        link_url: '/super-admin/approvals',
      })
    }
  } catch (error) {
    console.error('Error notifying super admins about approval:', error)
  }
}

/**
 * Notify all super admins when an admin adds or edits content that doesn't need approval
 * (e.g. hero section). Super admin sees it in their Notifications panel.
 */
export async function notifySuperAdminsAboutContentChange(params: {
  type: 'hero'
  action: 'create' | 'update' | 'delete'
  title: string
  centerId: number
}): Promise<void> {
  try {
    const { type, action, title, centerId } = params
    const centerResult = await pool.query('SELECT name FROM centers WHERE id = $1', [centerId])
    const centerName = centerResult.rows[0]?.name || 'A center'
    const superAdminsResult = await pool.query(
      'SELECT id FROM super_admins WHERE is_active = true',
      []
    )
    const superAdmins = superAdminsResult.rows as { id: number }[]
    const actionLabel = action === 'create' ? 'added' : action === 'update' ? 'updated' : 'deleted'
    const label = type === 'hero' ? 'Hero slide' : type
    const message = `${label} "${title || 'Untitled'}" from ${centerName} was ${actionLabel}.`
    const notifTitle = action === 'create' ? 'Hero slide added' : action === 'update' ? 'Hero slide updated' : 'Hero slide deleted'
    for (const sa of superAdmins) {
      await createNotification({
        user_type: 'super_admin',
        user_id: sa.id,
        title: notifTitle,
        message,
        type: 'info',
        link_url: '/super-admin/centers',
      })
    }
  } catch (error) {
    console.error('Error notifying super admins about content change:', error)
  }
}

/**
 * Notify all admins of a center when super admin approves or rejects their news/alert.
 * Admins see it in their Notifications panel (and bell).
 */
export async function notifyCenterAdminsAboutApprovalResult(params: {
  centerId: number
  type: 'news' | 'alert' | 'hero'
  title: string
  action: 'approved' | 'rejected'
  rejectionReason?: string | null
}): Promise<void> {
  try {
    const { centerId, type, title, action, rejectionReason } = params
    const label = type === 'news' ? 'News' : type === 'hero' ? 'Hero slide' : 'Alert'
    const adminsResult = await pool.query(
      'SELECT id FROM center_admins WHERE center_id = $1 AND is_active = true',
      [centerId]
    )
    const admins = adminsResult.rows as { id: number }[]
    const notifTitle = action === 'approved' ? `${label} approved` : `${label} rejected`
    const baseMessage = action === 'approved'
      ? `Your ${label.toLowerCase()} "${title}" was approved.`
      : `Your ${label.toLowerCase()} "${title}" was rejected.`
    const message = rejectionReason?.trim()
      ? `${baseMessage} Reason: ${rejectionReason.trim()}`
      : baseMessage
    const linkPath = type === 'news' ? 'news' : type === 'hero' ? 'hero' : 'news'
    const linkUrl = `/admin/${centerId}/${linkPath}`

    for (const admin of admins) {
      await createNotification({
        user_type: 'admin',
        user_id: admin.id,
        center_id: centerId,
        title: notifTitle,
        message,
        type: action === 'approved' ? 'success' : 'warning',
        link_url: linkUrl,
      })
    }
  } catch (error) {
    console.error('Error notifying center admins about approval result:', error)
  }
}
