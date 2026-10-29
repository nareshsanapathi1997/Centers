'use client'

import Link from 'next/link'
import { useCallback, useEffect, useRef, useState } from 'react'
import { Bell, CheckCheck } from 'lucide-react'
import { studentFetch } from '@/lib/student-api'
import { useNotificationSocket } from '@/lib/useNotificationSocket'

interface Props {
  centerId: number
  centerSlug: string
}

interface NotificationRow {
  id: number
  title: string
  message: string
  type: string
  link_url: string | null
  is_read: boolean
  created_at: string
}

export default function StudentNotificationsBell({ centerId, centerSlug }: Props) {
  const [open, setOpen] = useState(false)
  const [notifications, setNotifications] = useState<NotificationRow[]>([])
  const [unreadCount, setUnreadCount] = useState(0)
  const panelRef = useRef<HTMLDivElement>(null)

  const load = useCallback(async () => {
    const res = await studentFetch(`/api/student/notifications?centerId=${centerId}&limit=15`)
    if (!res.ok) return
    const data = await res.json()
    setNotifications(data.notifications || [])
    setUnreadCount(data.unreadCount || 0)
  }, [centerId])

  useEffect(() => {
    load()
    const interval = setInterval(load, 60_000)
    return () => clearInterval(interval)
  }, [load])

  useNotificationSocket(() => {
    load()
  })

  useEffect(() => {
    if (!open) return
    const onClick = (e: MouseEvent) => {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', onClick)
    return () => document.removeEventListener('mousedown', onClick)
  }, [open])

  const markRead = async (id: number) => {
    await studentFetch('/api/student/notifications', {
      method: 'PATCH',
      body: JSON.stringify({ centerId, notificationId: id }),
    })
    load()
  }

  const markAllRead = async () => {
    await studentFetch('/api/student/notifications', {
      method: 'PATCH',
      body: JSON.stringify({ centerId, markAll: true }),
    })
    load()
  }

  return (
    <div className="relative" ref={panelRef}>
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="relative p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300"
        aria-label="Notifications"
      >
        <Bell className="w-5 h-5" />
        {unreadCount > 0 && (
          <span className="absolute top-1 right-1 min-w-[18px] h-[18px] px-1 rounded-full bg-red-500 text-white text-[10px] font-bold flex items-center justify-center">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 top-full mt-2 w-[min(20rem,calc(100vw-1.5rem))] max-w-[calc(100vw-1.5rem)] sm:w-[min(24rem,calc(100vw-1.5rem))] bg-white dark:bg-slate-900 rounded-xl shadow-xl border border-slate-200 dark:border-slate-700 z-50 overflow-hidden">
          <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100 dark:border-slate-700">
            <span className="font-semibold text-slate-900 dark:text-slate-100">Notifications</span>
            {unreadCount > 0 && (
              <button
                type="button"
                onClick={markAllRead}
                className="text-xs text-indigo-600 dark:text-indigo-400 hover:underline flex items-center gap-1"
              >
                <CheckCheck className="w-3.5 h-3.5" />
                Mark all read
              </button>
            )}
          </div>
          <div className="max-h-80 overflow-y-auto">
            {notifications.length === 0 ? (
              <p className="px-4 py-8 text-center text-sm text-slate-500 dark:text-slate-400">No notifications yet.</p>
            ) : (
              notifications.map((n) => (
                <div
                  key={n.id}
                  className={`px-4 py-3 border-b border-slate-50 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/80 ${!n.is_read ? 'bg-indigo-50/40 dark:bg-indigo-950/40' : ''}`}
                >
                  <div className="flex justify-between gap-2">
                    <p className="text-sm font-medium text-slate-900 dark:text-slate-100">{n.title}</p>
                    {!n.is_read && (
                      <button
                        type="button"
                        onClick={() => markRead(n.id)}
                        className="text-[10px] text-indigo-600 dark:text-indigo-400 shrink-0"
                      >
                        Mark read
                      </button>
                    )}
                  </div>
                  <p className="text-xs text-slate-600 dark:text-slate-400 mt-0.5 line-clamp-2">{n.message}</p>
                  {n.link_url && (
                    <Link
                      href={n.link_url.startsWith('/') ? n.link_url : `/${centerSlug}/student/dashboard`}
                      className="text-xs text-indigo-600 dark:text-indigo-400 mt-1 inline-block hover:underline"
                      onClick={() => setOpen(false)}
                    >
                      View →
                    </Link>
                  )}
                </div>
              ))
            )}
          </div>
          <Link
            href={`/${centerSlug}/student/notifications`}
            className="block text-center text-sm text-indigo-600 dark:text-indigo-400 py-3 border-t border-slate-100 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800"
            onClick={() => setOpen(false)}
          >
            View all notifications
          </Link>
        </div>
      )}
    </div>
  )
}
