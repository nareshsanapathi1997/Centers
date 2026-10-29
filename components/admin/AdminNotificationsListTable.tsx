'use client'

import Pagination from '@/components/admin/Pagination'
import AdminNotificationLink from '@/components/admin/AdminNotificationLink'
import { Bell, Check } from 'lucide-react'

export type AdminNotificationListItem = {
  id: number
  title: string
  message: string
  type?: 'info' | 'success' | 'warning' | 'error' | string
  link_url?: string | null
  is_read: boolean
  created_at: string
}

const TYPE_STYLES: Record<string, string> = {
  info: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400',
  success: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400',
  warning: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400',
  error: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400',
}

interface AdminNotificationsListTableProps {
  items: AdminNotificationListItem[]
  emptyMessage?: string
  emptyHint?: string
  hasActiveFilters?: boolean
  onMarkAsRead: (id: number) => void
  currentPage: number
  totalPages: number
  totalItems: number
  itemsPerPage: number
  startIndex: number
  endIndex: number
  onPageChange: (page: number) => void
}

export default function AdminNotificationsListTable({
  items,
  emptyMessage = 'No notifications found',
  emptyHint = 'Notifications will appear here',
  hasActiveFilters = false,
  onMarkAsRead,
  currentPage,
  totalPages,
  totalItems,
  itemsPerPage,
  startIndex,
  endIndex,
  onPageChange,
}: AdminNotificationsListTableProps) {
  return (
    <div className="admin-card overflow-hidden">
      <div className="admin-data-table-wrap">
        <table className="admin-data-table divide-y divide-gray-200 dark:divide-gray-700">
          <thead className="bg-gray-50 dark:bg-gray-700/60">
            <tr>
              <th className="text-left text-xs font-semibold uppercase text-gray-600 dark:text-gray-300 w-[18%]">
                Title
              </th>
              <th className="hidden md:table-cell text-left text-xs font-semibold uppercase text-gray-600 dark:text-gray-300">
                Message
              </th>
              <th className="hidden md:table-cell text-left text-xs font-semibold uppercase text-gray-600 dark:text-gray-300 w-20">
                Type
              </th>
              <th className="hidden md:table-cell text-left text-xs font-semibold uppercase text-gray-600 dark:text-gray-300 w-36">
                Date
              </th>
              <th className="text-left text-xs font-semibold uppercase text-gray-600 dark:text-gray-300 w-20">
                Status
              </th>
              <th className="admin-data-table__actions text-xs font-semibold uppercase text-gray-600 dark:text-gray-300">
                Action
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
            {items.length === 0 ? (
              <tr>
                <td colSpan={6} className="py-12 text-center">
                  <div className="flex flex-col items-center gap-2">
                    <Bell className="w-8 h-8 text-gray-400" />
                    <p className="text-gray-600 dark:text-gray-400 font-medium">{emptyMessage}</p>
                    <p className="text-sm text-gray-500 dark:text-gray-500">
                      {hasActiveFilters ? 'Try changing your search or filter' : emptyHint}
                    </p>
                  </div>
                </td>
              </tr>
            ) : (
              items.map((notification) => (
                <tr
                  key={notification.id}
                  className={`hover:bg-gray-50 dark:hover:bg-gray-700/40 ${
                    !notification.is_read ? 'bg-blue-50/40 dark:bg-blue-900/10' : ''
                  }`}
                >
                  <td>
                    <div className="flex items-start gap-2 min-w-0">
                      <Bell
                        className={`w-4 h-4 mt-0.5 shrink-0 ${
                          notification.is_read ? 'text-gray-400' : 'text-blue-600 dark:text-blue-400'
                        }`}
                      />
                      <span
                        className={`text-sm admin-data-table__cell-truncate ${
                          notification.is_read
                            ? 'font-medium text-gray-700 dark:text-gray-300'
                            : 'font-semibold text-gray-900 dark:text-white'
                        }`}
                        title={notification.title}
                      >
                        {notification.title}
                      </span>
                    </div>
                  </td>
                  <td className="hidden md:table-cell">
                    <p
                      className="text-sm text-gray-600 dark:text-gray-400 admin-data-table__cell-truncate"
                      title={notification.message}
                    >
                      {notification.message}
                    </p>
                    {notification.link_url ? (
                      <AdminNotificationLink
                        href={notification.link_url}
                        onNavigate={() => {
                          if (!notification.is_read) onMarkAsRead(notification.id)
                        }}
                      />
                    ) : null}
                  </td>
                  <td className="hidden md:table-cell">
                    <span
                      className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium capitalize ${
                        TYPE_STYLES[notification.type || 'info'] || TYPE_STYLES.info
                      }`}
                    >
                      {notification.type || 'info'}
                    </span>
                  </td>
                  <td className="hidden md:table-cell text-sm text-gray-600 dark:text-gray-400 whitespace-nowrap">
                    {new Date(notification.created_at).toLocaleString()}
                  </td>
                  <td>
                    {notification.is_read ? (
                      <span className="inline-flex px-2 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300">
                        Read
                      </span>
                    ) : (
                      <span className="inline-flex px-2 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400">
                        Unread
                      </span>
                    )}
                  </td>
                  <td className="admin-data-table__actions">
                    {!notification.is_read ? (
                      <button aria-label="Confirm"
                        type="button"
                        onClick={() => onMarkAsRead(notification.id)}
                        className="admin-btn admin-btn--icon admin-btn--icon-edit"
                        title="Mark as read"
                      >
                        <Check className="w-4 h-4" />
                      </button>
                    ) : (
                      <span className="text-xs text-gray-400">—</span>
                    )}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {totalItems > itemsPerPage ? (
        <Pagination
          currentPage={currentPage}
          totalPages={totalPages}
          totalItems={totalItems}
          itemsPerPage={itemsPerPage}
          startIndex={startIndex}
          endIndex={endIndex}
          onPageChange={onPageChange}
        />
      ) : null}
    </div>
  )
}
