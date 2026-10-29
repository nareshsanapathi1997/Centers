'use client'

import { handleImageLoadError, normalizeImageUrl } from '@/lib/image-utils'

export type SafeImageProps = Omit<React.ImgHTMLAttributes<HTMLImageElement>, 'src'> & {
  src: string | null | undefined
  /** Used once if primary src fails (local asset path or URL). */
  fallbackSrc?: string
  hideOnError?: boolean
}

/** img with one-shot onError — prevents infinite retries when uploads/URLs are missing. */
export default function SafeImage({
  src,
  fallbackSrc,
  hideOnError,
  alt = '',
  ...rest
}: SafeImageProps) {
  const primary = normalizeImageUrl(src) ?? src ?? ''
  const fallback = fallbackSrc ? normalizeImageUrl(fallbackSrc) ?? fallbackSrc : undefined
  const loading = rest.loading ?? ('lazy' as const)
  const decoding = rest.decoding ?? 'async'

  return (
    <img
      {...rest}
      src={primary}
      alt={alt}
      loading={loading}
      decoding={decoding}
      onError={(e) =>
        handleImageLoadError(e, {
          hide: hideOnError,
          placeholder: fallback,
        })
      }
    />
  )
}
