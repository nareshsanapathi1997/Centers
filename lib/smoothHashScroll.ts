/** Sticky header clearance when scrolling to in-page sections. */
export function getHeaderScrollOffset(): number {
  if (typeof document === 'undefined') return 120
  const header = document.querySelector<HTMLElement>('.pub-header, .premium-header, .header-wrap')
  if (header) {
    const height = header.getBoundingClientRect().height
    if (height > 0) return Math.ceil(height) + 8
  }
  return 120
}

export function smoothScrollToHash(hash: string, behavior: ScrollBehavior = 'smooth'): boolean {
  if (typeof document === 'undefined' || !hash || hash === '#') return false
  const id = hash.startsWith('#') ? hash.slice(1) : hash
  if (!id) return false
  const target = document.getElementById(id)
  if (!target) return false

  const offset = getHeaderScrollOffset()
  const top = target.getBoundingClientRect().top + window.scrollY - offset
  window.scrollTo({ top: Math.max(0, top), behavior })
  return true
}

/** Retry until the hash target exists (dynamic sections may delay DOM). */
export function restoreScrollToHash(options?: {
  behavior?: ScrollBehavior
  maxAttempts?: number
  intervalMs?: number
  onSuccess?: () => void
  onGiveUp?: () => void
}): () => void {
  if (typeof window === 'undefined') return () => {}

  const hash = window.location.hash
  if (!hash || hash === '#') return () => {}

  const behavior = options?.behavior ?? 'auto'
  const maxAttempts = options?.maxAttempts ?? 50
  const intervalMs = options?.intervalMs ?? 100

  let attempts = 0
  let timer: number | undefined
  let cancelled = false

  const tryScroll = () => {
    if (cancelled) return
    if (smoothScrollToHash(hash, behavior)) {
      options?.onSuccess?.()
      return
    }
    attempts += 1
    if (attempts < maxAttempts) {
      timer = window.setTimeout(tryScroll, intervalMs)
    } else {
      options?.onGiveUp?.()
    }
  }

  tryScroll()

  return () => {
    cancelled = true
    if (timer !== undefined) window.clearTimeout(timer)
  }
}

export function isHashRestorePending(): boolean {
  if (typeof document === 'undefined') return false
  return document.documentElement.hasAttribute('data-hash-restore-pending')
}

export function clearHashRestorePending(): void {
  if (typeof document === 'undefined') return
  document.documentElement.classList.remove('hash-restore-pending')
  document.documentElement.removeAttribute('data-hash-restore-pending')
}

/** In-page section navigation (header links: Courses, Gallery, etc.). */
export function navigateToSectionHash(hash: string, behavior: ScrollBehavior = 'smooth'): void {
  if (typeof window === 'undefined' || !hash || hash === '#') return

  const nextUrl = `${window.location.pathname}${window.location.search}${hash}`
  const currentUrl = `${window.location.pathname}${window.location.search}${window.location.hash}`
  if (nextUrl !== currentUrl) {
    window.history.pushState(null, '', nextUrl)
  }

  clearHashRestorePending()
  window.dispatchEvent(new CustomEvent('app-hash-navigate', { detail: { hash } }))

  if (!smoothScrollToHash(hash, behavior)) {
    restoreScrollToHash({ behavior, maxAttempts: 30 })
  }
}

/** Same-page Home link: scroll to top and drop any #hash from the URL. */
export function navigateToHomeTop(behavior: ScrollBehavior = 'smooth'): void {
  if (typeof window === 'undefined') return

  clearHashRestorePending()
  window.dispatchEvent(new CustomEvent('app-hash-navigate', { detail: { hash: '' } }))

  const nextUrl = `${window.location.pathname}${window.location.search}`
  window.history.replaceState(null, '', nextUrl)
  window.scrollTo({ top: 0, behavior })
}

export function splitPathAndHash(href: string): { path: string; hash: string } {
  const hashIndex = href.indexOf('#')
  if (hashIndex === -1) return { path: href, hash: '' }
  return {
    path: href.slice(0, hashIndex) || '/',
    hash: href.slice(hashIndex),
  }
}

/** Compare app routes ignoring trailing slashes. */
export function isSameAppPath(currentPathname: string, targetPath: string): boolean {
  const normalize = (p: string) => {
    const trimmed = (p || '/').replace(/\/+$/, '') || '/'
    return trimmed.startsWith('/') ? trimmed : `/${trimmed}`
  }
  return normalize(currentPathname) === normalize(targetPath)
}

export function closeHeaderMobileMenu(): void {
  if (typeof document === 'undefined') return
  window.dispatchEvent(new Event('cm-close-public-nav'))
  const collapseIds = ['navbarSupportedContent', 'websiteHeaderNav', 'centerPremiumNav', 'public-mobile-nav']
  for (const id of collapseIds) {
    const collapse = document.getElementById(id)
    if (collapse?.classList.contains('show')) {
      collapse.classList.remove('show')
    }
  }
  document.querySelectorAll<HTMLElement>('.navbar-toggler[aria-expanded="true"]').forEach((btn) => {
    btn.setAttribute('aria-expanded', 'false')
  })
  const topNav = document.getElementById('topNavMenu')
  if (topNav?.classList.contains('show')) {
    topNav.classList.remove('show')
  }
}
