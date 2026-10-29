/**
 * Utility functions for handling image URLs
 */

import { getBasePath, withBasePath } from '@/lib/with-base-path'

/**
 * Normalizes an image URL to ensure it's properly formatted
 * - If it's an absolute URL (http/https) or protocol-relative, return as-is
 * - Same-origin paths starting with `/` get the app `basePath` prefix when set
 * - Otherwise, treat as relative and prepend `/assets/img/` (also prefixed)
 */
export function normalizeImageUrl(url: string | null | undefined): string | undefined {
  if (!url) return undefined

  if (url.startsWith('http://') || url.startsWith('https://')) {
    return url
  }
  if (url.startsWith('//')) {
    return url
  }

  const bp = getBasePath()
  const alreadyPrefixed = (p: string) => bp !== '' && (p === bp || p.startsWith(`${bp}/`))

  if (url.startsWith('/')) {
    if (alreadyPrefixed(url)) return url
    return withBasePath(url)
  }

  if (url.includes('assets/img') || url.includes('assets/')) {
    const p = url.startsWith('/') ? url : `/${url}`
    if (alreadyPrefixed(p)) return p
    return withBasePath(p)
  }

  return withBasePath(`/assets/img/${url}`)
}

/** Inline SVG placeholder — avoids HTTP requests and onError infinite loops. */
export const BROKEN_IMAGE_DATA_URI =
  'data:image/svg+xml,' +
  encodeURIComponent(
    '<svg xmlns="http://www.w3.org/2000/svg" width="80" height="80" viewBox="0 0 80 80"><rect fill="#f3f4f6" width="80" height="80" rx="8"/><path d="M24 52l8-10 6 8 10-14 8 16H24z" fill="#d1d5db"/><circle cx="30" cy="30" r="4" fill="#d1d5db"/></svg>',
  )

/** Run once on img onError — stops repeated failed fetches when the URL is missing. */
export function handleImageLoadError(
  event: React.SyntheticEvent<HTMLImageElement>,
  options?: { hide?: boolean; placeholder?: string },
): void {
  const img = event.currentTarget
  if (img.dataset.fallbackApplied === '1') return
  img.dataset.fallbackApplied = '1'
  img.onerror = null

  if (options?.hide) {
    img.style.display = 'none'
    return
  }

  img.src = options?.placeholder ?? BROKEN_IMAGE_DATA_URI
}

/**
 * Gets a default image URL if the provided URL is missing
 */
export function getDefaultImageUrl(
  url: string | null | undefined,
  defaultPath: string
): string {
  return normalizeImageUrl(url) || normalizeImageUrl(defaultPath) || withBasePath(defaultPath.startsWith('/') ? defaultPath : `/${defaultPath}`)
}
