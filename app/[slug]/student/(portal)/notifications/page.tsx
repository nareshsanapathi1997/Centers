'use client'

import { useQuery } from '@tanstack/react-query'
import Link from 'next/link'
import { Bell, CheckCheck } from 'lucide-react'
import { studentFetch } from '@/lib/student-api'
import { useStudentPortal } from '@/components/student/StudentPortalContext'
import StudentPageFrame from '@/components/student/StudentPageFrame'
import StudentEmptyState from '@/components/student/StudentEmptyState'
import StudentErrorState from '@/components/student/StudentErrorState'

export default function StudentNotificationsPage() {
  const { centerId, centerSlug: slug } = useStudentPortal()

  const notificationsQuery = useQuery({
    queryKey: ['student', 'notifications', centerId],
    queryFn: async () => {
      const res = await studentFetch(`/api/student/notifications?centerId=${centerId}&limit=50`)
      const data = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(data.error || 'Unable to load notifications')
      return {
        notifications: (data.notifications || []) as any[],
        unreadCount: (data.unreadCount || 0) as number,
      }
    },
  })

  const markRead = async (id: number) => {
    await studentFetch('/api/student/notifications', {
      method: 'PATCH',
      body: JSON.stringify({ centerId, notificationId: id }),
    })
    void notificationsQuery.refetch()
  }

  const markAllRead = async () => {
    await studentFetch('/api/student/notifications', {
      method: 'PATCH',
      body: JSON.stringify({ centerId, markAll: true }),
    })
    void notificationsQuery.refetch()
  }

  const notifications = notificationsQuery.data?.notifications ?? []
  const unreadCount = notificationsQuery.data?.unreadCount ?? 0

  return (
    <StudentPageFrame
      title="Notifications"
      subtitle={
        notificationsQuery.isLoading
          ? 'Loading…'
          : unreadCount > 0
            ? `${unreadCount} unread`
            : 'All caught up'
      }
      breadcrumbs={[
        { label: 'Dashboard', href: `/${slug}/student/dashboard` },
        { label: 'Notifications' },
      ]}
      actions={
        !notificationsQuery.isLoading && unreadCount > 0 ? (
          <button type="button" onClick={markAllRead} className="sp-btn sp-btn--ghost sp-btn--sm">
            <CheckCheck aria-hidden style={{ width: 16, height: 16, marginRight: 6 }} />
            Mark all read
          </button>
        ) : null
      }
      loading={notificationsQuery.isLoading}
      loadingLabel="Loading notifications"
    >
      {notificationsQuery.isError ? (
        <StudentErrorState
          error={notificationsQuery.error}
          onRetry={() => void notificationsQuery.refetch()}
        />
      ) : null}

      {!notificationsQuery.isError && notifications.length === 0 ? (
        <StudentEmptyState
          icon={Bell}
          title="No notifications"
          message="Updates from your centre will show up here."
        />
      ) : null}

      {!notificationsQuery.isError && notifications.length > 0 ? (
        <div className="sp-stack">
          {notifications.map((n) => (
            <div
              key={n.id}
              className="sp-card-plain"
              style={
                n.is_read
                  ? undefined
                  : {
                      borderColor: 'var(--sp-accent)',
                      background:
                        'linear-gradient(180deg, var(--sp-muted) 0%, var(--sp-accent-soft) 100%)',
                    }
              }
            >
              <div className="sp-item" style={{ padding: 0, border: 0 }}>
                <div className="sp-item__main">
                  <div className="sp-item__title-row">
                    <h3 className="sp-item__title" style={{ fontSize: '0.975rem' }}>
                      {n.title}
                    </h3>
                    {!n.is_read ? <span className="sp-badge sp-badge--mock">New</span> : null}
                  </div>
                  <p className="sp-item__desc">{n.message}</p>
                  <div className="sp-item__meta">
                    <span className="sp-chip sp-chip--muted">
                      {new Date(n.created_at).toLocaleString('en-IN')}
                    </span>
                  </div>
                  {n.link_url ? (
                    <Link
                      href={n.link_url.startsWith('/') ? n.link_url : `/${slug}/student/dashboard`}
                      className="sp-empty__link"
                      style={{ justifySelf: 'start' }}
                    >
                      View details →
                    </Link>
                  ) : null}
                </div>
                {!n.is_read ? (
                  <div className="sp-item__aside">
                    <button
                      type="button"
                      onClick={() => markRead(n.id)}
                      className="sp-btn sp-btn--ghost sp-btn--sm"
                    >
                      Mark read
                    </button>
                  </div>
                ) : null}
              </div>
            </div>
          ))}
        </div>
      ) : null}
    </StudentPageFrame>
  )
}
