/** App is served at site root. Helpers kept for API/fetch compatibility (no-op prefix). */

export function getBasePath(): string {
  return ''
}

export function withBasePath(path: string): string {
  return path.startsWith('/') ? path : `/${path}`
}

export function stripBasePath(path: string): string {
  return path
}

export function withBasePathHref(href: string | null | undefined): string {
  if (href == null || href === '') return '#'
  const h = href.trim()
  if (h === '#' || h.startsWith('#')) return h
  if (h.startsWith('http://') || h.startsWith('https://') || h.startsWith('//')) return h
  if (h.startsWith('mailto:') || h.startsWith('tel:') || h.startsWith('javascript:')) return h
  return h.startsWith('/') ? h : `/${h}`
}

export function pathnameToBrowserUrl(pathname: string, query?: string): string {
  const path = pathname.startsWith('/') ? pathname : `/${pathname}`
  const q = query?.replace(/^\?/, '').trim()
  return q ? `${path}?${q}` : path
}
