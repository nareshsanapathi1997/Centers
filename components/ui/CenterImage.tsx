import Image, { type ImageProps } from 'next/image'
import { normalizeImageUrl } from '@/lib/image-utils'

type CenterImageProps = Omit<ImageProps, 'src' | 'alt'> & {
  src: string | null | undefined
  alt: string
  /** Skip Next.js optimizer for remote/CDN URLs (still uses Image layout benefits). */
  unoptimizedRemote?: boolean
}

function isRemoteUrl(url: string): boolean {
  return (
    url.startsWith('http://') ||
    url.startsWith('https://') ||
    url.startsWith('//')
  )
}

/**
 * Normalized wrapper around `next/image` for center site assets (logos, hero banners).
 * Server-safe — no client state (avoids hydration mismatches in Header/Footer).
 *
 * Uploaded images go through the optimizer: they are same-origin (served by the
 * `/uploads/:path*` rewrite) and are the largest images on a center page, so
 * skipping resize and WebP conversion for them meant admins uploading a 4 MB
 * camera JPEG shipped all 4 MB to every visitor.
 *
 * Remote/CDN URLs stay unoptimized — they are already sized by their host and
 * proxying them adds a hop plus a cache miss on every deploy.
 */
export default function CenterImage({
  src,
  alt,
  unoptimizedRemote = false,
  ...rest
}: CenterImageProps) {
  const normalized = normalizeImageUrl(src) ?? src
  if (!normalized) return null

  const unoptimized = isRemoteUrl(normalized) || unoptimizedRemote

  return (
    <Image
      src={normalized}
      alt={alt}
      unoptimized={unoptimized}
      {...rest}
    />
  )
}
