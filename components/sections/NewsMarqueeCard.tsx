'use client'

import { useMemo, useRef } from 'react'
import type { NewsItem } from '@/types'
import VerticalMarquee, { type VerticalMarqueeHandle } from './VerticalMarquee'

interface NewsMarqueeCardProps {
  title: string
  iconClass: string
  items: NewsItem[]
  type: 'news' | 'notifications'
  centerId: number
  centerSlug: string
  emptyMessage: string
}

function uniqueNewsItems(items: NewsItem[]) {
  return items.filter(
    (item, index, self) => index === self.findIndex((t) => t.id === item.id && t.title === item.title),
  )
}

export default function NewsMarqueeCard({
  title,
  iconClass,
  items,
  type,
  centerId,
  centerSlug,
  emptyMessage,
}: NewsMarqueeCardProps) {
  const marqueeRef = useRef<VerticalMarqueeHandle>(null)
  const uniqueItems = useMemo(() => uniqueNewsItems(items), [items])
  const navLabel = type === 'notifications' ? 'Scroll notifications' : 'Scroll news and events'

  return (
    <div className="marquee-card-wrapper">
      <div className="marquee-card-header marquee-card-header--with-controls">
        <h2 className="marquee-card-title">
          <span
            className={`marquee-card-title-icon-wrap${type === 'notifications' ? ' marquee-card-title-icon-wrap--notifications' : ''}`}
            aria-hidden="true"
          >
            <i className={`marquee-card-title-icon ${iconClass}`} />
          </span>
          <span>{title}</span>
        </h2>
        <div className="marquee-card-header-nav" role="group" aria-label={navLabel}>
          <button
            type="button"
            className="vertical-marquee-arrow home-marquee-arrow marquee-header-arrow"
            onClick={() => marqueeRef.current?.nudge(72)}
            aria-label="Scroll up (previous items)"
            title="Previous"
          >
            <i className="ri-arrow-up-s-line" aria-hidden />
          </button>
          <button
            type="button"
            className="vertical-marquee-arrow home-marquee-arrow marquee-header-arrow"
            onClick={() => marqueeRef.current?.nudge(-72)}
            aria-label="Scroll down (next items)"
            title="Next"
          >
            <i className="ri-arrow-down-s-line" aria-hidden />
          </button>
        </div>
      </div>
      {uniqueItems.length > 0 ? (
        <VerticalMarquee
          ref={marqueeRef}
          items={items}
          type={type}
          centerId={centerId}
          centerSlug={centerSlug}
          showSideNav={false}
        />
      ) : (
        <div className="marquee-wrapper vertical" id={`${type}Marquee`}>
          <div className="marquee-list">
            <p
              className={`marquee-item mb-0${type === 'notifications' ? ' notifications-item' : ''}`}
              role="status"
              style={{ opacity: 0.7 }}
            >
              <i className="ri-checkbox-circle-fill marquee-item-icon" aria-hidden="true" />
              <span>{emptyMessage}</span>
            </p>
          </div>
        </div>
      )}
    </div>
  )
}
