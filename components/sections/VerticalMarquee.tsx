'use client'

import { forwardRef, useEffect, useImperativeHandle, useRef } from 'react'
import { withBasePath, withBasePathHref } from '@/lib/with-base-path'
import { NewsItem } from '@/types'
import './VerticalMarquee.css'

/** Auto-scroll and loop only when there are more than this many items */
export const MARQUEE_AUTO_SCROLL_MIN_COUNT = 5

export type VerticalMarqueeHandle = {
  nudge: (delta: number) => void
}

interface VerticalMarqueeProps {
  items: NewsItem[]
  type: 'news' | 'notifications'
  centerId?: number
  centerSlug?: string
  /** When false, nav is rendered in the card header instead */
  showSideNav?: boolean
}

const VerticalMarquee = forwardRef<VerticalMarqueeHandle, VerticalMarqueeProps>(function VerticalMarquee(
  {
    items,
    type,
    centerId,
    centerSlug,
    showSideNav = true,
  },
  ref,
) {
  const trackRef = useRef<HTMLDivElement>(null)
  const pausedRef = useRef(false)
  const yRef = useRef(0)
  const rafRef = useRef<number | null>(null)

  const uniqueItems = items.filter(
    (item, index, self) => index === self.findIndex((t) => t.id === item.id && t.title === item.title)
  )
  const depsKey = uniqueItems.map((item) => item.id).join(',')
  const shouldAutoScroll = uniqueItems.length > MARQUEE_AUTO_SCROLL_MIN_COUNT
  const canLoop = shouldAutoScroll
  const showNav = showSideNav && shouldAutoScroll

  const itemHref = (item: NewsItem) => {
    if (item.link_url?.trim()) {
      return withBasePathHref(item.link_url)
    }
    return centerSlug ? withBasePath(`/${centerSlug}/news/${item.id}`) : '#'
  }

  const trackClick = async (itemId: number) => {
    if (!centerId) return

    try {
      await fetch(withBasePath('/api/analytics/track'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          centerId,
          itemType: type === 'notifications' ? 'notification' : 'news',
          itemId,
          actionType: 'click',
        }),
      })
    } catch (error) {
      console.error('Error tracking click:', error)
    }
  }

  useEffect(() => {
    yRef.current = 0
    if (trackRef.current) {
      trackRef.current.style.transform = 'translate3d(0, 0, 0)'
    }
  }, [depsKey])

  useEffect(() => {
    const reduceMotion =
      typeof window !== 'undefined' &&
      window.matchMedia &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches

    if (reduceMotion || !shouldAutoScroll) return undefined

    // Match prelogin home marquee (~0.45px/frame); lower = slower scroll
    const speed = 0.35

    const tick = () => {
      if (!pausedRef.current && trackRef.current) {
        const first = trackRef.current.querySelector('.vertical-marquee-segment')
        const half = first instanceof HTMLElement ? first.offsetHeight : 0
        if (half > 0) {
          yRef.current -= speed
          if (-yRef.current >= half) {
            yRef.current += half
          }
          trackRef.current.style.transform = `translate3d(0, ${yRef.current}px, 0)`
        }
      }
      rafRef.current = requestAnimationFrame(tick)
    }

    rafRef.current = requestAnimationFrame(tick)
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current)
    }
  }, [depsKey, shouldAutoScroll])

  const nudge = (delta: number) => {
    if (!trackRef.current) return
    const first = trackRef.current.querySelector('.vertical-marquee-segment')
    const half = first instanceof HTMLElement ? first.offsetHeight : 0
    if (half <= 0) return

    yRef.current += delta
    while (yRef.current > 0) yRef.current -= half
    while (-yRef.current >= half) yRef.current += half
    trackRef.current.style.transform = `translate3d(0, ${yRef.current}px, 0)`
  }

  useImperativeHandle(ref, () => ({ nudge }), [depsKey])

  const renderItems = (suffix: string, hidden = false) =>
    uniqueItems.map((item) => (
      <a
        key={`${suffix}-${item.id}`}
        href={itemHref(item)}
        className={`marquee-item ${type === 'notifications' ? 'notifications-item' : ''}`}
        tabIndex={hidden ? -1 : undefined}
        aria-hidden={hidden || undefined}
        data-content-kind={type === 'notifications' ? 'notification' : 'news'}
        data-item-id={item.id}
        data-item-title={item.title || ''}
        onClick={() => trackClick(item.id)}
      >
        <i className="ri-checkbox-circle-fill marquee-item-icon" aria-hidden="true" />
        <span>{item.title}</span>
        {item.is_new ? <span className="new-badge">New</span> : null}
      </a>
    ))

  if (uniqueItems.length === 0) {
    return (
      <div className="marquee-wrapper vertical" id={`${type}Marquee`}>
        <div className="marquee-content vertical">
          <a
            href="#"
            className={`marquee-item ${type === 'notifications' ? 'notifications-item' : ''}`}
            style={{ opacity: 0.5 }}
          >
            <i className="ri-checkbox-circle-fill marquee-item-icon" aria-hidden="true" />
            <span>No {type === 'notifications' ? 'notifications' : 'news items'} available</span>
          </a>
        </div>
      </div>
    )
  }

  const navLabel = type === 'notifications' ? 'Scroll notifications' : 'Scroll news and events'

  return (
    <div
      className={`marquee-wrapper vertical${showNav ? ' vertical-marquee-with-nav home-marquee-with-nav' : ''}`}
      id={`${type}Marquee`}
    >
      <div
        className="vertical-marquee-viewport home-marquee-viewport"
        onMouseEnter={() => {
          if (shouldAutoScroll) pausedRef.current = true
        }}
        onMouseLeave={() => {
          if (shouldAutoScroll) pausedRef.current = false
        }}
      >
        <div ref={trackRef} className="vertical-marquee-track home-marquee-track">
          <div className="vertical-marquee-segment home-marquee-segment">
            {renderItems('a')}
            {canLoop ? <div className="marquee-loop-spacer" aria-hidden="true" /> : null}
          </div>
          {canLoop ? (
            <div className="vertical-marquee-segment home-marquee-segment" aria-hidden="true">
              {renderItems('b', true)}
              <div className="marquee-loop-spacer" aria-hidden="true" />
            </div>
          ) : null}
        </div>
      </div>
      {showNav ? (
        <div className="vertical-marquee-nav home-marquee-nav" role="group" aria-label={navLabel}>
          <button
            type="button"
            className="vertical-marquee-arrow home-marquee-arrow"
            onClick={() => nudge(72)}
            aria-label="Scroll up (previous items)"
            title="Previous"
          >
            <i className="ri-arrow-up-s-line" aria-hidden />
          </button>
          <button
            type="button"
            className="vertical-marquee-arrow home-marquee-arrow"
            onClick={() => nudge(-72)}
            aria-label="Scroll down (next items)"
            title="Next"
          >
            <i className="ri-arrow-down-s-line" aria-hidden />
          </button>
        </div>
      ) : null}
    </div>
  )
})

export default VerticalMarquee
