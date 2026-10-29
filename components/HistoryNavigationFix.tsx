'use client'

import { useEffect } from 'react'
import { usePathname, useRouter } from 'next/navigation'
import { restoreScrollToHash, smoothScrollToHash } from '@/lib/smoothHashScroll'
import { resetNavbarCollapses } from '@/components/template/NavbarCollapseReset'

function syncScrollFromLocation(): void {
  const hash = window.location.hash
  if (hash && hash !== '#') {
    if (!smoothScrollToHash(hash, 'auto')) {
      restoreScrollToHash({ behavior: 'auto', maxAttempts: 40 })
    }
    return
  }
  window.scrollTo({ top: 0, left: 0, behavior: 'auto' })
}

/**
 * Browser back/forward: refresh bfcache restores and scroll after route/hash changes.
 */
export default function HistoryNavigationFix() {
  const pathname = usePathname()
  const router = useRouter()

  useEffect(() => {
    const onPageShow = (event: PageTransitionEvent) => {
      if (event.persisted) {
        router.refresh()
      }
      resetNavbarCollapses()
      syncScrollFromLocation()
    }
    window.addEventListener('pageshow', onPageShow)
    return () => window.removeEventListener('pageshow', onPageShow)
  }, [router])

  useEffect(() => {
    const onPopState = () => syncScrollFromLocation()
    window.addEventListener('popstate', onPopState)
    window.addEventListener('hashchange', onPopState)
    return () => {
      window.removeEventListener('popstate', onPopState)
      window.removeEventListener('hashchange', onPopState)
    }
  }, [])

  useEffect(() => {
    resetNavbarCollapses()
    syncScrollFromLocation()
  }, [pathname])

  return null
}
