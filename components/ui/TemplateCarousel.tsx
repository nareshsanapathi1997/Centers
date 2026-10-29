'use client'

import {
  forwardRef,
  useCallback,
  useEffect,
  useImperativeHandle,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react'

export type CarouselResponsive = Record<number, { items: number; margin?: number }>

export type TemplateCarouselHandle = {
  prev: () => void
  next: () => void
  pauseAutoplay: () => void
  resumeAutoplay: () => void
}

export interface TemplateCarouselProps {
  id?: string
  className?: string
  children: ReactNode
  margin?: number
  nav?: boolean
  dots?: boolean
  loop?: boolean
  autoplay?: boolean
  autoplayTimeout?: number
  autoplayHoverPause?: boolean
  autoplayPaused?: boolean
  responsive?: CarouselResponsive
  mode?: 'slide' | 'fade'
  suppressHydrationWarning?: boolean
}

function childArray(children: ReactNode): ReactNode[] {
  const items = Array.isArray(children) ? children : [children]
  return items.filter((child) => child != null && child !== false)
}

function resolveCarouselLayout(
  width: number,
  responsive: CarouselResponsive | undefined,
  fallbackItems: number,
  fallbackMargin: number,
): { items: number; margin: number } {
  if (!responsive) {
    return { items: fallbackItems, margin: fallbackMargin }
  }

  const breakpoints = Object.keys(responsive)
    .map(Number)
    .sort((a, b) => b - a)

  for (const breakpoint of breakpoints) {
    if (width >= breakpoint) {
      return {
        items: responsive[breakpoint].items,
        margin: responsive[breakpoint].margin ?? fallbackMargin,
      }
    }
  }

  const smallest = breakpoints[breakpoints.length - 1]
  return {
    items: responsive[smallest]?.items ?? fallbackItems,
    margin: responsive[smallest]?.margin ?? fallbackMargin,
  }
}

const TemplateCarousel = forwardRef<TemplateCarouselHandle, TemplateCarouselProps>(function TemplateCarousel(
  {
    id,
    className = '',
    children,
    margin = 20,
    nav = false,
    dots = false,
    loop = false,
    autoplay = false,
    autoplayTimeout = 5000,
    autoplayHoverPause = true,
    autoplayPaused = false,
    responsive,
    mode = 'slide',
    suppressHydrationWarning,
  },
  ref,
) {
  const items = useMemo(() => childArray(children), [children])
  const count = items.length
  const [index, setIndex] = useState(0)
  const [hovering, setHovering] = useState(false)
  const [paused, setPaused] = useState(false)
  // Keep the first client render identical to SSR. The real viewport is applied
  // after hydration, avoiding layout/style mismatches at tablet widths.
  const [viewportWidth, setViewportWidth] = useState(1200)
  const rootRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const update = () => setViewportWidth(window.innerWidth)
    update()
    window.addEventListener('resize', update)
    return () => window.removeEventListener('resize', update)
  }, [])

  const { items: itemsPerView, margin: itemMargin } = useMemo(
    () => resolveCarouselLayout(viewportWidth || 1200, responsive, 1, margin),
    [viewportWidth, responsive, margin],
  )

  const maxIndex = Math.max(0, count - itemsPerView)
  const canLoop = loop && count > itemsPerView
  const slideable = count > itemsPerView || (loop && count > 1)
  const showNav = nav && slideable
  const showDots = dots && slideable

  const goTo = useCallback(
    (nextIndex: number) => {
      if (count <= itemsPerView) return
      setIndex((current) => {
        if (canLoop) {
          if (nextIndex < 0) return maxIndex
          if (nextIndex > maxIndex) return 0
          return nextIndex
        }
        return Math.min(maxIndex, Math.max(0, nextIndex))
      })
    },
    [canLoop, count, itemsPerView, maxIndex],
  )

  const prev = useCallback(() => goTo(index - 1), [goTo, index])
  const next = useCallback(() => goTo(index + 1), [goTo, index])

  useImperativeHandle(
    ref,
    () => ({
      prev,
      next,
      pauseAutoplay: () => setPaused(true),
      resumeAutoplay: () => setPaused(false),
    }),
    [next, prev],
  )

  useEffect(() => {
    if (index > maxIndex) setIndex(maxIndex)
  }, [index, maxIndex])

  useEffect(() => {
    if (!autoplay || count <= itemsPerView) return
    if (paused || autoplayPaused || (autoplayHoverPause && hovering)) return

    const timer = window.setInterval(() => {
      setIndex((current) => {
        if (canLoop) return current >= maxIndex ? 0 : current + 1
        return current >= maxIndex ? 0 : current + 1
      })
    }, autoplayTimeout)

    return () => window.clearInterval(timer)
  }, [
    autoplay,
    autoplayTimeout,
    autoplayHoverPause,
    autoplayPaused,
    canLoop,
    count,
    hovering,
    itemsPerView,
    maxIndex,
    paused,
  ])

  const slideOffset = useMemo(() => {
    if (mode === 'fade' || count === 0) return 0
    const itemWidth = 100 / itemsPerView
    return index * itemWidth
  }, [count, index, itemsPerView, mode])

  const isHeroCarousel = className.includes('hero-slider-one')
  const rootClassName = [
    'owl-carousel',
    'template-carousel',
    'owl-loaded',
    mode === 'fade' ? 'template-carousel--fade' : '',
    showNav && !isHeroCarousel ? 'section-carousel-nav' : '',
    className,
  ]
    .filter(Boolean)
    .join(' ')

  if (count === 0) {
    return (
      <div
        id={id}
        ref={rootRef}
        className={rootClassName}
        suppressHydrationWarning={suppressHydrationWarning}
      />
    )
  }

  return (
    <div
      id={id}
      ref={rootRef}
      className={rootClassName}
      suppressHydrationWarning={suppressHydrationWarning}
      onMouseEnter={autoplayHoverPause ? () => setHovering(true) : undefined}
      onMouseLeave={autoplayHoverPause ? () => setHovering(false) : undefined}
    >
      <div className="owl-stage-outer">
        <div
          className="owl-stage"
          style={
            mode === 'fade'
              ? undefined
              : {
                  transform: `translate3d(-${slideOffset}%, 0px, 0px)`,
                  transition: 'transform 0.45s ease',
                  marginLeft: itemMargin ? `-${itemMargin / 2}px` : undefined,
                  marginRight: itemMargin ? `-${itemMargin / 2}px` : undefined,
                }
          }
        >
          {items.map((item, itemIndex) => {
            const isActive =
              mode === 'fade'
                ? itemIndex === index
                : itemIndex >= index && itemIndex < index + itemsPerView

            return (
              <div
                key={itemIndex}
                className={`owl-item${isActive ? ' active' : ''}`}
                style={
                  mode === 'slide'
                    ? {
                        width: `${100 / itemsPerView}%`,
                        paddingLeft: itemMargin / 2,
                        paddingRight: itemMargin / 2,
                      }
                    : undefined
                }
              >
                {item}
              </div>
            )
          })}
        </div>
      </div>

      {showNav && (
        <div className="owl-nav">
          <button type="button" className="owl-prev" onClick={prev} aria-label="Previous slide">
            <i className="ri-arrow-left-s-line" aria-hidden="true" />
          </button>
          <button type="button" className="owl-next" onClick={next} aria-label="Next slide">
            <i className="ri-arrow-right-s-line" aria-hidden="true" />
          </button>
        </div>
      )}

      {showDots && (
        <div className="owl-dots">
          {Array.from({ length: maxIndex + 1 }, (_, dotIndex) => (
            <button
              key={dotIndex}
              type="button"
              className={`owl-dot${dotIndex === index ? ' active' : ''}`}
              onClick={() => goTo(dotIndex)}
              aria-label={`Go to slide ${dotIndex + 1}`}
            >
              <span />
            </button>
          ))}
        </div>
      )}
    </div>
  )
})

export default TemplateCarousel
