import { stripBasePath, withBasePathHref } from '@/lib/with-base-path'

export function isExternalNotificationLink(url: string | null | undefined): boolean {
  if (!url) return false
  const h = url.trim()
  return (
    h.startsWith('http://') ||
    h.startsWith('https://') ||
    h.startsWith('//') ||
    h.startsWith('mailto:') ||
    h.startsWith('tel:')
  )
}

/** For Next.js `<Link>` / `router.push` (basePath is applied automatically). */
export function resolveNotificationLinkForRouter(url: string): string {
  if (isExternalNotificationLink(url)) return url
  const path = url.startsWith('/') ? url : `/${url}`
  return stripBasePath(path)
}

/** For plain `<a href>` (must include app basePath). */
export function resolveNotificationLinkForAnchor(url: string): string {
  return withBasePathHref(url)
}

export function getNotificationLinkLabel(url: string): string {
  if (isExternalNotificationLink(url)) return 'Open link'

  const path = stripBasePath(url.startsWith('/') ? url : `/${url}`).toLowerCase()

  if (path.includes('/hero')) return 'View hero slides'
  if (path.includes('/news')) return 'View news'
  if (path.includes('/approvals')) return 'View approvals'
  if (path.includes('/notifications')) return 'View notifications'
  if (path.includes('/enquiries')) return 'View enquiries'
  if (path.includes('/dashboard')) return 'Go to dashboard'
  if (path.startsWith('/admin/')) return 'Go to section'
  if (path.startsWith('/super-admin/')) return 'Go to page'

  return 'Open link'
}
