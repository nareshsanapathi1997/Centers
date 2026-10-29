'use client'

import Link from 'next/link'
import { useMemo, useRef, type RefObject } from 'react'
import { withBasePathHref } from '@/lib/with-base-path'
import { useVerticalMarquee } from '@/hooks/useVerticalMarquee'
import type { NewsItem } from '@/types'

interface NewsDetailSidebarClientProps {
  centerSlug: string
  newsItems: NewsItem[]
  notifications: NewsItem[]
}

function itemHref(centerSlug: string, item: NewsItem): string {
  if (item.link_url?.trim()) {
    return withBasePathHref(item.link_url)
  }
  if (centerSlug) {
    return `/${centerSlug}/news/${item.id}`
  }
  return `/news/${item.id}`
}

function TickerItem({ centerSlug, item }: { centerSlug: string; item: NewsItem }) {
  const href = itemHref(centerSlug, item)
  const isExternal = href.startsWith('http') || href.startsWith('//')

  if (isExternal) {
    return (
      <li>
        <a href={href} target="_blank" rel="noopener noreferrer">
          <i className="ri-notification-3-fill" aria-hidden="true" />
          <span>{item.title}</span>
        </a>
      </li>
    )
  }

  return (
    <li>
      <Link href={href}>
        <i className="ri-notification-3-fill" aria-hidden="true" />
        <span>{item.title}</span>
      </Link>
    </li>
  )
}

function SidebarPanel({
  title,
  items,
  centerSlug,
  marqueeRef,
  emptyMessage,
}: {
  title: string
  items: NewsItem[]
  centerSlug: string
  marqueeRef: RefObject<HTMLDivElement | null>
  emptyMessage: string
}) {
  return (
    <div className="nd-sidebar__panel">
      <h4 className="nd-sidebar__title">
        <span>{title}</span>
      </h4>
      <div className="nd-sidebar__ticker-wrap">
        <div className="nd-sidebar__ticker-box">
          <div className="nd-sidebar__marquee" ref={marqueeRef as RefObject<HTMLDivElement>}>
            <div className="marquee-list">
              {items.length > 0 ? (
                <ul className="nd-sidebar__list">
                  {items.map((item) => (
                    <TickerItem key={item.id} centerSlug={centerSlug} item={item} />
                  ))}
                </ul>
              ) : (
                <ul className="nd-sidebar__list">
                  <li>
                    <span className="nd-sidebar__empty">{emptyMessage}</span>
                  </li>
                </ul>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default function NewsDetailSidebarClient({
  centerSlug,
  newsItems,
  notifications,
}: NewsDetailSidebarClientProps) {
  const notificationsRef = useRef<HTMLDivElement>(null)
  const eventsRef = useRef<HTMLDivElement>(null)

  const marqueeDeps = useMemo(
    () => [newsItems.map((i) => i.id).join(','), notifications.map((i) => i.id).join(',')],
    [newsItems, notifications],
  )

  useVerticalMarquee(20, marqueeDeps, {
    notifications: notificationsRef,
    events: eventsRef,
  })

  return (
    <aside className="nd-sidebar">
      <div className="nd-sidebar__wrap">
        <SidebarPanel
          title="Notifications/Results"
          items={notifications}
          centerSlug={centerSlug}
          marqueeRef={notificationsRef}
          emptyMessage="No notifications available at the moment."
        />
        <SidebarPanel
          title="EduSphere Events"
          items={newsItems}
          centerSlug={centerSlug}
          marqueeRef={eventsRef}
          emptyMessage="No events available at the moment."
        />
      </div>
    </aside>
  )
}
