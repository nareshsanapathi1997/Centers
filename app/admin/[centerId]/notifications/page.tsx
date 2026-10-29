'use client'

import { authenticatedFetch } from '@/lib/admin-api'
import { useEffect, useMemo, useState, useCallback } from 'react'
import { useAdminFetch } from '@/lib/use-admin-fetch'
import AdminPageShell from '@/components/admin/AdminPageShell'
import AdminNotificationsListTable, {
  type AdminNotificationListItem,
} from '@/components/admin/AdminNotificationsListTable'
import PageHeader from '@/components/ui/PageHeader'
import ErrorState from '@/components/ui/ErrorState'
import LoadingSkeleton from '@/components/ui/LoadingSkeleton'
import { Input, Select } from '@/components/forms'
import { Bell, CheckCheck } from 'lucide-react'
import { useNotificationSocket } from '@/lib/useNotificationSocket'

type NotificationItem = AdminNotificationListItem

type NotificationsResponse = {
  notifications: NotificationItem[]
  unreadCount: number
}

export default function NotificationsPage({ params }: { params: { centerId: string } }) {
  const [sendingTest, setSendingTest] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState<'all' | 'unread' | 'read'>('all')
  const [currentPage, setCurrentPage] = useState(1)
  const [itemsPerPage] = useState(10)

  const {
    data,
    loading,
    refetch: fetchNotifications,
    error: fetchError,
  } = useAdminFetch<NotificationsResponse>(
    `admin-notifications-${params.centerId}`,
    `/api/admin/notifications?centerId=${params.centerId}&limit=100`,
    {
      auth: true,
      parse: (json) => {
        const payload = json as { notifications?: NotificationItem[]; unreadCount?: number }
        return {
          notifications: payload.notifications ?? [],
          unreadCount: payload.unreadCount ?? 0,
        }
      },
    },
  )
  const notifications = data?.notifications ?? []
  const unreadCount = data?.unreadCount ?? 0

  const refreshNotifications = useCallback(() => {
    void fetchNotifications(true)
  }, [fetchNotifications])

  useNotificationSocket(refreshNotifications)

  const filteredNotifications = useMemo(() => {
    return notifications.filter((notification) => {
      const matchesSearch =
        !searchQuery ||
        notification.title?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        notification.message?.toLowerCase().includes(searchQuery.toLowerCase())

      const matchesStatus =
        statusFilter === 'all' ||
        (statusFilter === 'unread' && !notification.is_read) ||
        (statusFilter === 'read' && notification.is_read)

      return matchesSearch && matchesStatus
    })
  }, [notifications, searchQuery, statusFilter])

  useEffect(() => {
    setCurrentPage(1)
  }, [searchQuery, statusFilter])

  const totalPages = Math.ceil(filteredNotifications.length / itemsPerPage)
  const startIndex = (currentPage - 1) * itemsPerPage
  const endIndex = startIndex + itemsPerPage
  const paginatedNotifications = filteredNotifications.slice(startIndex, endIndex)

  const sendTestNotification = async () => {
    setSendingTest(true)
    try {
      const res = await authenticatedFetch(`/api/admin/notifications/test?centerId=${params.centerId}`, {
        method: 'POST',
      })
      if (res.ok) await fetchNotifications(true)
    } finally {
      setSendingTest(false)
    }
  }

  const markAsRead = async (notificationId: number) => {
    try {
      await authenticatedFetch(`/api/admin/notifications?centerId=${params.centerId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ notificationId }),
      })
      void fetchNotifications(true)
    } catch (err) {
      console.error('Error marking notification as read:', err)
    }
  }

  const markAllAsRead = async () => {
    try {
      await authenticatedFetch(`/api/admin/notifications?centerId=${params.centerId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ markAll: true }),
      })
      void fetchNotifications(true)
    } catch (err) {
      console.error('Error marking all as read:', err)
    }
  }

  return (
    <AdminPageShell>
      <div className="space-y-6">
        <PageHeader
          title={
            <span className="flex items-center gap-2">
              <Bell className="h-7 w-7" />
              Notifications
            </span>
          }
          description="System alerts and updates for your center."
          breadcrumbs={[
            { label: 'Admin', href: `/admin/${params.centerId}` },
            { label: 'Notifications' },
          ]}
          actions={
            <>
              {unreadCount > 0 ? (
                <button
                  type="button"
                  onClick={() => void markAllAsRead()}
                  className="admin-btn admin-btn--primary admin-btn--sm"
                >
                  <CheckCheck className="h-4 w-4" />
                  Mark all read
                </button>
              ) : null}
              <button
                type="button"
                onClick={() => void sendTestNotification()}
                disabled={sendingTest}
                className="admin-btn admin-btn--secondary admin-btn--sm disabled:opacity-50"
              >
                {sendingTest ? 'Sending…' : 'Send test'}
              </button>
            </>
          }
        />

        <div className="admin-card flex flex-col gap-3 p-4 sm:flex-row sm:items-center">
          <div className="max-w-md flex-1">
            <Input
              type="search"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by title or message..."
              aria-label="Search notifications"
            />
          </div>
          <Select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as 'all' | 'unread' | 'read')}
            className="max-w-[10rem]"
            aria-label="Filter by status"
          >
            <option value="all">All</option>
            <option value="unread">Unread</option>
            <option value="read">Read</option>
          </Select>
          <span className="whitespace-nowrap text-sm text-[var(--cm-color-text-muted)]">
            {unreadCount > 0 ? `${unreadCount} unread` : 'All caught up'}
          </span>
        </div>

        {fetchError && !loading ? (
          <ErrorState error={fetchError} onRetry={() => void fetchNotifications(true)} />
        ) : loading && !data ? (
          <div className="admin-card p-8">
            <LoadingSkeleton variant="table" rows={5} />
          </div>
        ) : (
          <AdminNotificationsListTable
            items={paginatedNotifications}
            emptyHint="Notifications from Super Admin will appear here"
            hasActiveFilters={Boolean(searchQuery) || statusFilter !== 'all'}
            onMarkAsRead={markAsRead}
            currentPage={currentPage}
            totalPages={totalPages}
            totalItems={filteredNotifications.length}
            itemsPerPage={itemsPerPage}
            startIndex={startIndex}
            endIndex={endIndex}
            onPageChange={setCurrentPage}
          />
        )}
      </div>
    </AdminPageShell>
  )
}
