'use client'

import { useEffect, useMemo, useState, useCallback } from 'react'
import { useQuery } from '@tanstack/react-query'
import { superAdminFetch } from '@/lib/super-admin-api'
import SuperAdminPageShell from '@/components/admin/SuperAdminPageShell'
import AdminNotificationsListTable, {
  type AdminNotificationListItem,
} from '@/components/admin/AdminNotificationsListTable'
import PageHeader from '@/components/ui/PageHeader'
import ErrorState from '@/components/ui/ErrorState'
import LoadingSkeleton from '@/components/ui/LoadingSkeleton'
import { Input, Select } from '@/components/forms'
import { Bell, CheckCheck } from 'lucide-react'
import { useNotificationSocket } from '@/lib/useNotificationSocket'

export default function SuperAdminNotificationsPage() {
  const [searchQuery, setSearchQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState<'all' | 'unread' | 'read'>('all')
  const [currentPage, setCurrentPage] = useState(1)
  const [itemsPerPage] = useState(10)

  const notificationsQuery = useQuery({
    queryKey: ['super-admin', 'notifications'],
    queryFn: async () => {
      const response = await superAdminFetch('/api/super-admin/notifications?limit=100')
      if (!response.ok) {
        const err = await response.json().catch(() => ({}))
        throw new Error(err.error || 'Failed to load notifications')
      }
      const data = await response.json()
      return {
        notifications: (data.notifications || []) as AdminNotificationListItem[],
        unreadCount: (data.unreadCount || 0) as number,
      }
    },
  })

  const { refetch } = notificationsQuery
  const refreshNotifications = useCallback(() => {
    void refetch()
  }, [refetch])

  useNotificationSocket(refreshNotifications)

  const notifications = notificationsQuery.data?.notifications ?? []
  const unreadCount = notificationsQuery.data?.unreadCount ?? 0

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

  const totalPages = Math.max(1, Math.ceil(filteredNotifications.length / itemsPerPage))
  const startIndex = (currentPage - 1) * itemsPerPage
  const endIndex = startIndex + itemsPerPage
  const paginatedNotifications = filteredNotifications.slice(startIndex, endIndex)

  const markAsRead = async (notificationId: number) => {
    try {
      await superAdminFetch('/api/super-admin/notifications', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ notificationId }),
      })
      void notificationsQuery.refetch()
    } catch (err) {
      console.error('Error marking notification as read:', err)
    }
  }

  const markAllAsRead = async () => {
    try {
      await superAdminFetch('/api/super-admin/notifications', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ markAll: true }),
      })
      void notificationsQuery.refetch()
    } catch (err) {
      console.error('Error marking all as read:', err)
    }
  }

  return (
    <SuperAdminPageShell>
      <div className="space-y-6">
        <PageHeader
          title={
            <span className="flex items-center gap-2">
              <Bell className="h-7 w-7" />
              Notifications
            </span>
          }
          description="Approval updates and system alerts from center admins."
          breadcrumbs={[
            { label: 'Super Admin', href: '/super-admin' },
            { label: 'Notifications' },
          ]}
          actions={
            unreadCount > 0 ? (
              <button
                type="button"
                onClick={() => void markAllAsRead()}
                className="admin-btn admin-btn--primary admin-btn--sm"
              >
                <CheckCheck className="h-4 w-4" />
                Mark all read
              </button>
            ) : null
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

        {notificationsQuery.error && !notificationsQuery.data ? (
          <ErrorState error={notificationsQuery.error} onRetry={() => void notificationsQuery.refetch()} />
        ) : notificationsQuery.isLoading && !notificationsQuery.data ? (
          <div className="admin-card p-8">
            <LoadingSkeleton variant="table" rows={5} />
          </div>
        ) : (
          <AdminNotificationsListTable
            items={paginatedNotifications}
            emptyHint="Pending approvals and content updates will appear here"
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
    </SuperAdminPageShell>
  )
}
