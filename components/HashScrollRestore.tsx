'use client'

import { useEffect } from 'react'
import { usePathname } from 'next/navigation'
import {
  clearHashRestorePending,
  isHashRestorePending,
  restoreScrollToHash,
  smoothScrollToHash,
} from '@/lib/smoothHashScroll'

const RESTORE_FALLBACK_MS = 4000

/**
 * Restores scroll for URLs like /chennai#gallery after refresh or client navigation.
 */
export default function HashScrollRestore() {
  const pathname = usePathname()

  useEffect(() => {
    if (typeof window === 'undefined') return

    const hash = window.location.hash
    if (!hash || hash === '#') return

    const previousScrollRestoration = window.history.scrollRestoration
    window.history.scrollRestoration = 'manual'

    let cleanupRestore = () => {}

    const stopRestore = () => {
      cleanupRestore()
      cleanupRestore = () => {}
    }

    const finishPending = () => {
      clearHashRestorePending()
    }

    const scrollToCurrentHash = (behavior: ScrollBehavior = 'auto') => {
      stopRestore()
      cleanupRestore = restoreScrollToHash({
        behavior,
        onSuccess: () => {
          finishPending()
          requestAnimationFrame(() => {
            requestAnimationFrame(() => smoothScrollToHash(hash, 'auto'))
          })
        },
        onGiveUp: finishPending,
      })
    }

    const onNavClick = (event: Event) => {
      stopRestore()
      finishPending()
      const detail = (event as CustomEvent<{ hash?: string }>).detail
      const targetHash = detail?.hash || window.location.hash
      if (targetHash) {
        smoothScrollToHash(targetHash, 'smooth')
      }
    }

    window.addEventListener('app-hash-navigate', onNavClick)

    let fallbackTimer: number | undefined

    if (isHashRestorePending()) {
      const onPageReady = () => scrollToCurrentHash('auto')

      if (document.readyState === 'complete') {
        onPageReady()
      } else {
        window.addEventListener('load', onPageReady, { once: true })
      }
      fallbackTimer = window.setTimeout(() => {
        finishPending()
        scrollToCurrentHash('auto')
      }, RESTORE_FALLBACK_MS)

      return () => {
        stopRestore()
        if (fallbackTimer !== undefined) window.clearTimeout(fallbackTimer)
        window.removeEventListener('load', onPageReady)
        window.removeEventListener('app-hash-navigate', onNavClick)
        finishPending()
        window.history.scrollRestoration = previousScrollRestoration
      }
    }

    scrollToCurrentHash('smooth')

    const onHashChange = () => scrollToCurrentHash('smooth')
    window.addEventListener('hashchange', onHashChange)

    return () => {
      stopRestore()
      window.removeEventListener('app-hash-navigate', onNavClick)
      window.removeEventListener('hashchange', onHashChange)
      window.history.scrollRestoration = previousScrollRestoration
    }
  }, [pathname])

  return null
}
