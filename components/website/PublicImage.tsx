'use client'

import React, { useEffect, useState } from 'react'
import { BROKEN_IMAGE_DATA_URI, normalizeImageUrl } from '@/lib/image-utils'

export interface PublicImageProps extends Omit<React.ImgHTMLAttributes<HTMLImageElement>, 'src'> {
  src?: string | null
  fallbackSrc?: string | null
  hideOnError?: boolean
}

export default function PublicImage({ src, fallbackSrc = null, hideOnError = false, alt = '', onError, ...props }: PublicImageProps) {
  const primary = normalizeImageUrl(src) || normalizeImageUrl(fallbackSrc)
  const fallback = normalizeImageUrl(fallbackSrc)
  const [failedSource, setFailedSource] = useState<string | null>(null)
  const [failedFallback, setFailedFallback] = useState(false)

  useEffect(() => {
    setFailedSource(null)
    setFailedFallback(false)
  }, [primary, fallback])

  const failed = !primary || failedSource === primary
  if (failed && hideOnError && !fallback) return null

  const resolvedSrc = !failed
    ? primary
    : fallback && fallback !== primary && !failedFallback
      ? fallback
      : BROKEN_IMAGE_DATA_URI

  return (
    <img
      {...props}
      src={resolvedSrc}
      alt={alt}
      loading={props.loading || 'eager'}
      decoding={props.decoding || 'async'}
      onError={(event) => {
        if (!failed && primary) {
          setFailedSource(primary)
        } else if (fallback && !failedFallback) {
          setFailedFallback(true)
        }
        onError?.(event)
      }}
    />
  )
}
