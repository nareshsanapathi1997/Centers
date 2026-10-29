'use client'

import { useEffect, useState } from 'react'
import Image from 'next/image'
import { normalizeImageUrl } from '@/lib/image-utils'

type HeroSlideImageProps = {
  src: string
  fallbackSrc: string
  alt: string
  width: number
  height: number
  sizes?: string
  style?: React.CSSProperties
  priority?: boolean
}

/**
 * Hero banner image with upload fallback — client-only so failed uploads
 * swap to the default hero without breaking SSR/hydration.
 */
export default function HeroSlideImage({
  src,
  fallbackSrc,
  alt,
  width,
  height,
  sizes,
  style,
  priority,
}: HeroSlideImageProps) {
  const normalized = normalizeImageUrl(src) ?? src
  const fallback = normalizeImageUrl(fallbackSrc) ?? fallbackSrc
  const [currentSrc, setCurrentSrc] = useState(normalized)

  useEffect(() => {
    setCurrentSrc(normalized)
  }, [normalized])

  // Same-origin /uploads go through the optimizer (WebP/AVIF + resize).
  // Only skip for remote/CDN URLs that are already sized by their host.
  const unoptimized =
    currentSrc.startsWith('http://') ||
    currentSrc.startsWith('https://') ||
    currentSrc.startsWith('//')

  return (
    <Image
      src={currentSrc}
      alt={alt}
      width={width}
      height={height}
      sizes={sizes}
      style={style}
      priority={priority}
      unoptimized={unoptimized}
      onError={() => {
        if (fallback && currentSrc !== fallback) {
          setCurrentSrc(fallback)
        }
      }}
    />
  )
}
