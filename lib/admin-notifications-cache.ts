export type AdminNotificationRow = {
  id: number
  title: string
  message: string
  type: 'info' | 'success' | 'warning' | 'error'
  link_url?: string
  is_read: boolean
  created_at: string
}

type NotificationSnapshot = {
  notifications: AdminNotificationRow[]
  unreadCount: number
  fetchedAt: number
}

const SNAPSHOT_TTL_MS = 30_000
const snapshots = new Map<string, NotificationSnapshot>()

function snapshotKey(userType: 'admin' | 'super_admin', userId: number, centerId?: string): string {
  return `${userType}:${userId}:${centerId ?? 'global'}`
}

export function getCachedNotifications(
  userType: 'admin' | 'super_admin',
  userId: number,
  centerId?: string,
): NotificationSnapshot | null {
  const key = snapshotKey(userType, userId, centerId)
  const entry = snapshots.get(key)
  if (!entry || Date.now() - entry.fetchedAt > SNAPSHOT_TTL_MS) return null
  return entry
}

export function setCachedNotifications(
  userType: 'admin' | 'super_admin',
  userId: number,
  payload: { notifications: AdminNotificationRow[]; unreadCount: number },
  centerId?: string,
): void {
  snapshots.set(snapshotKey(userType, userId, centerId), {
    ...payload,
    fetchedAt: Date.now(),
  })
}

export function invalidateNotificationsCache(userType?: 'admin' | 'super_admin'): void {
  if (!userType) {
    snapshots.clear()
    return
  }
  Array.from(snapshots.keys()).forEach((key) => {
    if (key.startsWith(`${userType}:`)) snapshots.delete(key)
  })
}
