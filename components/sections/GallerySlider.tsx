'use client'

import React from 'react'
import PublicImage from '@/components/website/PublicImage'
import type { GalleryImage } from '@/types'

interface GalleryItem {
  id: number
  title: string
  image_url: string
}

interface GallerySliderProps {
  images?: (GalleryImage | GalleryItem)[]
  gallery?: (GalleryImage | GalleryItem)[]
  layout?: 'grid' | 'slider' | string
}

const FALLBACK_GALLERY = [
  '/assets/demo/campus-1.jpg',
  '/assets/demo/campus-2.jpg',
  '/assets/demo/campus-3.jpg',
  '/assets/demo/campus-4.jpg',
  '/assets/demo/campus-5.jpg',
  '/assets/demo/campus-6.jpg',
]

export default function GallerySlider({
  images,
  gallery,
}: GallerySliderProps) {
  const items = images ?? gallery ?? []
  if (items.length === 0) return null

  return (
    <div className="gallery-mosaic">
      {items.map((item, idx) => (
        <figure key={item.id} className="gallery-mosaic__item">
          <PublicImage
            src={item.image_url}
            fallbackSrc={FALLBACK_GALLERY[idx % FALLBACK_GALLERY.length]}
            alt={item.title || 'Campus space'}
            loading="eager"
          />
          {item.title && <figcaption>{item.title}</figcaption>}
        </figure>
      ))}
    </div>
  )
}
