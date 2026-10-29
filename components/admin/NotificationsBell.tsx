'use client'
import { authenticatedFetch } from '@/lib/admin-api'
import { superAdminFetch } from '@/lib/super-admin-api'

import { useEffect, useState, useRef, useCallback } from 'react'
import { Bell, Check } from 'lucide-react'
import Link from 'next/link'
import { useNotificationSocket } from '@/lib/useNotificationSocket'
import { withBasePath } from '@/lib/with-base-path'
import { resolveNotificationLinkForRouter } from '@/lib/admin-notification-link'
import {
  getCachedNotifications,
  setCachedNotifications,
  invalidateNotificationsCache,
  type AdminNotificationRow
} from '@/lib/admin-notifications-cache'

interface NotificationsBellProps {
  userType: 'admin' | 'super_admin'
  centerId?: string
  compact?: boolean
}

function roleFetch(userType: 'admin' | 'super_admin', url: string, options: RequestInit = {}) {
  return userType === 'admin' ? authenticatedFetch(url, options) : superAdminFetch(url, options)
}

export default function NotificationsBell({ userType, centerId, compact = false }: NotificationsBellProps) {
  const [notifications, setNotifications] = useState<AdminNotificationRow[]>([])
  const [unreadCount, setUnreadCount] = useState(0)
  const [isOpen, setIsOpen] = useState(false)
  const [loading, setLoading] = useState(true)
  const dropdownRef = useRef<HTMLDivElement>(null)
  const previousUnreadRef = useRef(0)
  const audioRef = useRef<HTMLAudioElement | null>(null)
  const soundEnabledRef = useRef(true)
  const [soundEnabled, setSoundEnabled] = useState(true)

  const fetchNotifications = useCallback(async (force = false) => {
    try {
            if (userType === 'admin' && !centerId) return

      const adminId = userType === 'admin'
        ? Number(localStorage.getItem('adminId') || 0)
        : Number(localStorage.getItem('superAdminId') || 0)

      if (adminId && !force) {
        const cached = getCachedNotifications(userType, adminId, centerId)
        if (cached) {
          setNotifications(cached.notifications)
          setUnreadCount(cached.unreadCount)
          previousUnreadRef.current = cached.unreadCount
          setLoading(false)
          return
        }
      }

      const url =
        userType === 'admin' && centerId
          ? `/api/admin/notifications?centerId=${centerId}&limit=10&unreadOnly=false`
          : userType === 'super_admin'
          ? '/api/super-admin/notifications?limit=10&unreadOnly=false'
          : null

      if (!url) return

      const response = await roleFetch(userType, url)

      if (response.ok) {
        const data = await response.json()
        const rows = (data.notifications || []) as AdminNotificationRow[]
        setNotifications(rows)

        const newUnread = data.unreadCount || 0
        if (soundEnabledRef.current && newUnread > previousUnreadRef.current && audioRef.current) {
          audioRef.current.play().catch(() => {})
        }
        previousUnreadRef.current = newUnread
        setUnreadCount(newUnread)

        if (adminId) {
          setCachedNotifications(userType, adminId, { notifications: rows, unreadCount: newUnread }, centerId)
        }
      } else if (response.status === 401 || response.status === 403) {
        // Token expired or unauthorized
      }
    } catch (error) {
      if (!(error instanceof TypeError && (error as Error).message?.includes?.('fetch'))) {
        console.error('Error fetching notifications:', error)
      }
    } finally {
      setLoading(false)
    }
  }, [userType, centerId])

  useNotificationSocket(() => {
    invalidateNotificationsCache(userType)
    void fetchNotifications(true)
  })

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      void fetchNotifications(false)
    }, 200)

    const poll = () => {
      if (document.visibilityState === 'visible') {
        void fetchNotifications(false)
      }
    }

    const interval = window.setInterval(poll, isOpen ? 30_000 : 60_000)

    const onVisibility = () => {
      if (document.visibilityState === 'visible') {
        void fetchNotifications(false)
      }
    }

    document.addEventListener('visibilitychange', onVisibility)

    return () => {
      window.clearTimeout(timeoutId)
      window.clearInterval(interval)
      document.removeEventListener('visibilitychange', onVisibility)
    }
  }, [fetchNotifications, isOpen])

  // Initialize sound preference and audio on client only (keeps server + first client render identical).
  useEffect(() => {
    const stored = localStorage.getItem('notifications_sound_enabled')
    if (stored !== null) {
      const enabled = stored === 'true'
      soundEnabledRef.current = enabled
      setSoundEnabled(enabled)
    }
    const audio = new Audio(withBasePath('/assets/notificationsound.wav'))
    audioRef.current = audio
  }, [])

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const markAsRead = async (notificationId: number) => {
    try {
      const url =
        userType === 'admin'
          ? `/api/admin/notifications?centerId=${centerId}`
          : '/api/super-admin/notifications'

      await roleFetch(userType, url, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ notificationId })
      })

      setNotifications((prev) =>
        prev.map((n) => (n.id === notificationId ? { ...n, is_read: true } : n))
      )
      setUnreadCount((prev) => Math.max(0, prev - 1))
    } catch (error) {
      console.error('Error marking notification as read:', error)
    }
  }

  const markAllAsRead = async () => {
    try {
      const url =
        userType === 'admin'
          ? `/api/admin/notifications?centerId=${centerId}`
          : '/api/super-admin/notifications'

      await roleFetch(userType, url, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ markAll: true })
      })

      setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })))
      setUnreadCount(0)
    } catch (error) {
      console.error('Error marking all as read:', error)
    }
  }

  const getNotificationColor = (type: string) => {
    const colors: Record<string, string> = {
      success: 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800',
      error: 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800',
      warning: 'bg-yellow-50 dark:bg-yellow-900/20 border-yellow-200 dark:border-yellow-800',
      info: 'bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800'
    }
    return colors[type] || colors.info
  }

  const triggerClassName = compact
    ? 'relative inline-flex h-8 w-8 items-center justify-center rounded-md text-gray-600 dark:text-gray-300 transition-colors hover:bg-white dark:hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500/40'
    : `
          relative flex h-10 w-10 items-center justify-center rounded-xl
          text-gray-600 dark:text-gray-300
          bg-gray-100/80 dark:bg-gray-700/80 hover:bg-gray-200 dark:hover:bg-gray-600
          border border-gray-200/80 dark:border-gray-600/80
          transition-all duration-200
          focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:ring-offset-2 focus:ring-offset-white dark:focus:ring-offset-gray-800
        `

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        aria-label="Notifications"
        className={triggerClassName}
      >
        <Bell className={`${compact ? 'w-4 h-4' : 'w-5 h-5'}`} strokeWidth={2} />
        {unreadCount > 0 && (
          <span className="absolute top-0 right-0 flex h-5 min-w-[1.25rem] items-center justify-center rounded-full bg-red-500 px-1.5 text-[11px] font-semibold text-white shadow-sm ring-2 ring-white dark:ring-gray-800">
            {unreadCount > 99 ? '99+' : unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {isOpen && (
        <div
          className="
            absolute right-0 mt-2 w-[min(22rem,calc(100vw-1rem))] max-w-[calc(100vw-1rem)]
            max-h-[min(32rem,calc(100dvh-4rem))]
            flex flex-col overflow-hidden
            rounded-2xl
            bg-white dark:bg-gray-800
            shadow-2xl ring-1 ring-black/5 dark:ring-white/10
            z-50
          "
          role="dialog"
          aria-label="Notifications panel"
        >
          {/* Header */}
          <div className="flex items-center justify-between gap-3 border-b border-gray-100 dark:border-gray-700/80 bg-gray-50/80 dark:bg-gray-800/80 px-4 py-3">
            <div className="flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-100 dark:bg-blue-900/40">
                <Bell className="h-4 w-4 text-blue-600 dark:text-blue-400" />
              </div>
              <div>
                <h3 className="text-sm font-semibold text-gray-900 dark:text-white">Notifications</h3>
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  {unreadCount > 0 ? `${unreadCount} unread` : 'All caught up'}
                </p>
              </div>
            </div>
            {unreadCount > 0 && (
              <button
                type="button"
                onClick={markAllAsRead}
                className="rounded-lg px-3 py-1.5 text-xs font-medium text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/30 transition-colors"
              >
                Mark all read
              </button>
            )}
          </div>

          {/* Sound toggle */}
          <div className="flex items-center justify-between gap-2 border-b border-gray-100 dark:border-gray-700/80 px-4 py-2.5 bg-white dark:bg-gray-800">
            <span className="text-xs text-gray-500 dark:text-gray-400">Sound</span>
            <label className="inline-flex cursor-pointer items-center gap-2">
              <span className="text-xs font-medium text-gray-700 dark:text-gray-300">
                {soundEnabled ? 'On' : 'Off'}
              </span>
              <input
                type="checkbox"
                checked={soundEnabled}
                onChange={(e) => {
                  const enabled = e.target.checked
                  soundEnabledRef.current = enabled
                  setSoundEnabled(enabled)
                  if (typeof window !== 'undefined') {
                    window.localStorage.setItem('notifications_sound_enabled', String(enabled))
                  }
                }}
                className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
              />
            </label>
          </div>

          {/* List */}
          <div className="overflow-y-auto flex-1 min-h-0">
            {loading ? (
              <div className="flex flex-col items-center justify-center py-12 px-4">
                <div className="h-9 w-9 animate-spin rounded-full border-2 border-gray-200 border-t-blue-500 dark:border-gray-600 dark:border-t-blue-400" />
                <p className="mt-3 text-sm text-gray-500 dark:text-gray-400">Loading…</p>
              </div>
            ) : notifications.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 px-4 text-center">
                <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-gray-100 dark:bg-gray-700/50">
                  <Bell className="h-7 w-7 text-gray-400 dark:text-gray-500" />
                </div>
                <p className="mt-3 text-sm font-medium text-gray-700 dark:text-gray-300">No notifications</p>
                <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">You’re all caught up</p>
              </div>
            ) : (
              <div className="divide-y divide-gray-100 dark:divide-gray-700/80">
                {notifications.map((notification) => (
                  <div
                    key={notification.id}
                    className={`px-4 py-3 transition-colors ${
                      !notification.is_read ? 'bg-blue-50/60 dark:bg-blue-900/20' : 'hover:bg-gray-50 dark:hover:bg-gray-700/40'
                    }`}
                  >
                    {notification.link_url ? (
                      <Link
                        href={resolveNotificationLinkForRouter(notification.link_url)}
                        onClick={() => {
                          if (!notification.is_read) markAsRead(notification.id)
                          setIsOpen(false)
                        }}
                        className="block"
                      >
                        <div className="flex gap-3">
                          <div className={`mt-0.5 h-2 w-2 shrink-0 rounded-full ${
                            notification.type === 'success' ? 'bg-green-500' :
                            notification.type === 'error' ? 'bg-red-500' :
                            notification.type === 'warning' ? 'bg-amber-500' : 'bg-blue-500'
                          }`} />
                          <div className="min-w-0 flex-1">
                            <div className="flex items-start justify-between gap-2">
                              <p className={`text-sm font-medium leading-snug ${
                                !notification.is_read ? 'text-gray-900 dark:text-white' : 'text-gray-700 dark:text-gray-300'
                              }`}>
                                {notification.title}
                              </p>
                              {!notification.is_read && (
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.preventDefault()
                                    e.stopPropagation()
                                    markAsRead(notification.id)
                                  }}
                                  className="shrink-0 rounded-md p-1 text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-600 hover:text-gray-600 dark:hover:text-gray-300"
                                  aria-label="Mark as read"
                                >
                                  <Check className="h-4 w-4" />
                                </button>
                              )}
                            </div>
                            <p className="mt-0.5 line-clamp-2 text-xs text-gray-600 dark:text-gray-400">
                              {notification.message}
                            </p>
                            <p className="mt-1 text-[11px] text-gray-400 dark:text-gray-500">
                              {new Date(notification.created_at).toLocaleString()}
                            </p>
                          </div>
                        </div>
                      </Link>
                    ) : (
                      <div className="flex gap-3">
                        <div className={`mt-0.5 h-2 w-2 shrink-0 rounded-full ${
                          notification.type === 'success' ? 'bg-green-500' :
                          notification.type === 'error' ? 'bg-red-500' :
                          notification.type === 'warning' ? 'bg-amber-500' : 'bg-blue-500'
                        }`} />
                        <div className="min-w-0 flex-1">
                          <p className={`text-sm font-medium ${
                            !notification.is_read ? 'text-gray-900 dark:text-white' : 'text-gray-700 dark:text-gray-300'
                          }`}>
                            {notification.title}
                          </p>
                          <p className="mt-0.5 text-xs text-gray-600 dark:text-gray-400">
                            {notification.message}
                          </p>
                          <p className="mt-1 text-[11px] text-gray-400 dark:text-gray-500">
                            {new Date(notification.created_at).toLocaleString()}
                          </p>
                          <div className="mt-2 flex gap-3">
                            {!notification.is_read && (
                              <button
                                type="button"
                                onClick={() => markAsRead(notification.id)}
                                className="inline-flex items-center gap-1 text-xs font-medium text-blue-600 dark:text-blue-400 hover:underline"
                              >
                                <Check className="h-3 w-3" />
                                Mark as read
                              </button>
                            )}
                            {notification.is_read && (
                              <button
                                type="button"
                                onClick={() => {
                                  const url = userType === 'admin' ? `/api/admin/notifications?centerId=${centerId}` : '/api/super-admin/notifications'
                                  roleFetch(userType, url, {
                                    method: 'PATCH',
                                    headers: { 'Content-Type': 'application/json' },
                                    body: JSON.stringify({ notificationId: notification.id, markUnread: true })
                                  }).catch(() => {})
                                  setNotifications((prev) =>
                                    prev.map((n) => (n.id === notification.id ? { ...n, is_read: false } : n))
                                  )
                                  setUnreadCount((prev) => prev + 1)
                                }}
                                className="text-xs text-gray-500 dark:text-gray-400 hover:underline"
                              >
                                Mark as unread
                              </button>
                            )}
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="border-t border-gray-100 dark:border-gray-700/80 bg-gray-50/80 dark:bg-gray-800/80 px-4 py-3">
            <Link
              href={
                userType === 'admin' && centerId
                  ? `/admin/${centerId}/notifications`
                  : userType === 'admin'
                  ? '/admin/login'
                  : '/super-admin/notifications'
              }
              onClick={() => setIsOpen(false)}
              className="block w-full rounded-xl bg-blue-600 py-2.5 text-center text-sm font-medium text-white hover:bg-blue-700 dark:bg-blue-500 dark:hover:bg-blue-600 transition-colors"
            >
              View all notifications
            </Link>
          </div>
        </div>
      )}
    </div>
  )
}
