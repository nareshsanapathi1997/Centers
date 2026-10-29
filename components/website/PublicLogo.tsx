'use client'

import { useEffect, useRef, useState } from 'react'
import { normalizeImageUrl } from '@/lib/image-utils'

/** Also recovers an image that failed before React hydrated the footer. */
export default function PublicLogo({ src, alt }: { src: string; alt: string }) {
  const image = useRef<HTMLImageElement>(null)
  const [failed, setFailed] = useState(false)
  const fallback = normalizeImageUrl('/assets/img/logo-white.png')!
  useEffect(() => {
    setFailed(Boolean(image.current?.complete && image.current.naturalWidth === 0))
  }, [src])

  return <img ref={image} src={failed ? fallback : normalizeImageUrl(src)} alt={alt} width={160} height={50} loading="eager" decoding="async" onError={() => setFailed(true)} />
}
