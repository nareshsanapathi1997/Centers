'use client'

import { useEffect } from 'react'
import { usePathname } from 'next/navigation'

const COLLAPSE_TARGETS = [
  { id: 'websiteHeaderNav', desktopQuery: '(min-width: 1200px)' },
  { id: 'navbarSupportedContent', desktopQuery: '(min-width: 992px)' },
  { id: 'topNavMenu', desktopQuery: '(min-width: 768px)' },
]

/** Clear Bootstrap collapse inline state after route changes / browser back-forward. */
export function resetNavbarCollapses() {
  if (typeof window === 'undefined') return

  for (const { id, desktopQuery } of COLLAPSE_TARGETS) {
    const el = document.getElementById(id)
    if (!el) continue

    el.style.removeProperty('height')
    el.style.removeProperty('display')
    el.style.removeProperty('overflow')

    const onDesktop = window.matchMedia(desktopQuery).matches
    if (onDesktop) {
      el.classList.remove('show')
    } else {
      el.classList.remove('show')
    }
  }

  document.querySelectorAll('[data-bs-toggle="collapse"]').forEach((trigger) => {
    trigger.classList.add('collapsed')
    trigger.setAttribute('aria-expanded', 'false')
  })

  document.querySelectorAll('.dropdown-menu.show').forEach((menu) => menu.classList.remove('show'))
  document
    .querySelectorAll('[data-bs-toggle="dropdown"][aria-expanded="true"]')
    .forEach((trigger) => trigger.setAttribute('aria-expanded', 'false'))
}

export default function NavbarCollapseReset() {
  const pathname = usePathname()

  useEffect(() => {
    resetNavbarCollapses()
    const t = window.setTimeout(resetNavbarCollapses, 0)
    return () => window.clearTimeout(t)
  }, [pathname])

  useEffect(() => {
    const onPageShow = () => {
      resetNavbarCollapses()
      requestAnimationFrame(() => requestAnimationFrame(resetNavbarCollapses))
    }
    const onResize = () => resetNavbarCollapses()

    window.addEventListener('pageshow', onPageShow)
    window.addEventListener('resize', onResize)
    return () => {
      window.removeEventListener('pageshow', onPageShow)
      window.removeEventListener('resize', onResize)
    }
  }, [])

  return null
}
