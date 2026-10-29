'use client'

import { useEffect } from 'react'

function setSiteHeaderHeight(header: HTMLElement) {
  const height = Math.ceil(header.getBoundingClientRect().height)
  if (height > 0) {
    document.documentElement.style.setProperty('--site-header-h', `${height}px`)
  }
}

/** Adds `.sticky` to `.header-wrap` after scrolling — replaces main.js sticky header. */
export default function StickyHeader() {
  useEffect(() => {
    const header = document.querySelector<HTMLElement>('.header-wrap')
    if (!header) return

    let spacer: HTMLDivElement | null = null

    const setSpacer = (active: boolean) => {
      if (active) {
        if (!spacer) {
          spacer = document.createElement('div')
          spacer.className = 'header-sticky-spacer'
          spacer.setAttribute('aria-hidden', 'true')
          spacer.style.height = `${header.offsetHeight}px`
          header.insertAdjacentElement('afterend', spacer)
        } else {
          spacer.style.height = `${header.offsetHeight}px`
        }
      } else if (spacer) {
        spacer.remove()
        spacer = null
      }
    }

    const sync = () => {
      setSiteHeaderHeight(header)
      const sticky = window.scrollY >= 100
      header.classList.toggle('sticky', sticky)
      setSpacer(sticky)
    }

    sync()
    window.addEventListener('scroll', sync, { passive: true })
    window.addEventListener('resize', sync, { passive: true })
    const ro = typeof ResizeObserver !== 'undefined' ? new ResizeObserver(sync) : null
    ro?.observe(header)

    return () => {
      window.removeEventListener('scroll', sync)
      window.removeEventListener('resize', sync)
      ro?.disconnect()
      if (spacer) spacer.remove()
    }
  }, [])

  return null
}
