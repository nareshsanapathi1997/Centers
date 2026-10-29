'use client'

import { useEffect, type RefObject } from 'react'

type MarqueeRefs = Record<string, RefObject<HTMLDivElement | null>>

const MARQUEE_STYLE_ID = 'nd-sidebar-marquee-keyframes'

function ensureMarqueeKeyframes() {
  if (typeof document === 'undefined' || document.getElementById(MARQUEE_STYLE_ID)) return

  const style = document.createElement('style')
  style.id = MARQUEE_STYLE_ID
  style.textContent = `
    @keyframes nd-sidebar-marquee-scroll {
      0% { transform: translateY(0); }
      100% { transform: translateY(-50%); }
    }
  `
  document.head.appendChild(style)
}

/** Vertical auto-scroll marquee (prelogin Courses.jsx sidebar). */
export function useVerticalMarquee(
  scrollSpeed: number,
  dependencies: unknown[],
  refs: MarqueeRefs,
) {
  useEffect(() => {
    const cleanupFunctions: Array<() => void> = []
    let isMounted = true

    const timer = window.setTimeout(() => {
      if (!isMounted) return
      ensureMarqueeKeyframes()

      Object.values(refs).forEach((el) => {
        if (!el.current || !isMounted) return

        const list = el.current.querySelector('.marquee-list')
        if (!list || !(list instanceof HTMLElement)) return

        el.current.querySelectorAll('.marquee-inner').forEach((wrapper) => wrapper.remove())

        const run = () => {
          if (!isMounted || !el.current) return

          const items = list.querySelectorAll('li')
          if (items.length === 0) {
            window.setTimeout(run, 50)
            return
          }

          list.style.display = 'none'

          const wrapper = document.createElement('div')
          wrapper.className = 'marquee-inner'
          wrapper.style.position = 'relative'
          wrapper.style.overflow = 'hidden'
          wrapper.style.height = 'auto'
          wrapper.style.minHeight = '60px'

          if (items.length > 1) {
            const content = document.createElement('div')
            content.style.display = 'flex'
            content.style.flexDirection = 'column'
            content.style.height = 'auto'

            const clone1 = list.cloneNode(true) as HTMLElement
            const clone2 = list.cloneNode(true) as HTMLElement
            clone1.style.display = 'block'
            clone2.style.display = 'block'

            content.appendChild(clone1)
            content.appendChild(clone2)
            wrapper.appendChild(content)

            requestAnimationFrame(() => {
              const contentHeight = clone1.offsetHeight || 300
              const duration = Math.max(5, contentHeight / scrollSpeed)
              content.style.animation = `nd-sidebar-marquee-scroll ${duration}s linear infinite`
            })
          } else {
            const clone = list.cloneNode(true) as HTMLElement
            clone.style.display = 'block'
            wrapper.appendChild(clone)
          }

          el.current.appendChild(wrapper)

          cleanupFunctions.push(() => {
            wrapper.remove()
            list.style.display = 'block'
          })
        }

        run()
      })
    }, 200)

    return () => {
      isMounted = false
      window.clearTimeout(timer)
      cleanupFunctions.forEach((cleanup) => cleanup())
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [scrollSpeed, ...dependencies])
}
