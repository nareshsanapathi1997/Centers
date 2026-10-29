'use client'

import { useEffect } from 'react'

/** Keeps --site-header-h in sync for sticky subnavs under the corporate website header. */
export default function WebsiteHeaderHeightSync() {
  useEffect(() => {
    const header = document.querySelector<HTMLElement>('.website-header, .header-wrap')
    if (!header) return

    const sync = () => {
      const height = Math.ceil(header.getBoundingClientRect().height)
      if (height > 0) {
        document.documentElement.style.setProperty('--site-header-h', `${height}px`)
      }
    }

    sync()
    window.addEventListener('resize', sync, { passive: true })
    const ro = typeof ResizeObserver !== 'undefined' ? new ResizeObserver(sync) : null
    ro?.observe(header)
    return () => {
      window.removeEventListener('resize', sync)
      ro?.disconnect()
    }
  }, [])

  return null
}
