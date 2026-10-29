'use client'

import { useCallback, useEffect } from 'react'
import { createPortal } from 'react-dom'
import SafeImage from '@/components/ui/SafeImage'
import './ImageGalleryLightbox.css'

export type GalleryLightboxItem = {
  src: string
  fallbackSrc?: string
  title?: string
  alt?: string
}

type ImageGalleryLightboxProps = {
  items: GalleryLightboxItem[]
  index: number | null
  onClose: () => void
  onIndexChange: (index: number) => void
}

export default function ImageGalleryLightbox({
  items,
  index,
  onClose,
  onIndexChange,
}: ImageGalleryLightboxProps) {
  const open = index !== null && index >= 0 && index < items.length
  const current = open ? items[index] : null
  const hasPrev = open && index > 0
  const hasNext = open && index < items.length - 1

  const goPrev = useCallback(() => {
    if (index !== null && index > 0) onIndexChange(index - 1)
  }, [index, onIndexChange])

  const goNext = useCallback(() => {
    if (index !== null && index < items.length - 1) onIndexChange(index + 1)
  }, [index, items.length, onIndexChange])

  useEffect(() => {
    if (!open) return

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
      if (e.key === 'ArrowLeft') goPrev()
      if (e.key === 'ArrowRight') goNext()
    }

    const prevOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    window.addEventListener('keydown', onKeyDown)

    return () => {
      document.body.style.overflow = prevOverflow
      window.removeEventListener('keydown', onKeyDown)
    }
  }, [open, onClose, goPrev, goNext])

  if (!open || !current || typeof document === 'undefined') return null

  return createPortal(
    <div className="cm-gallery-lightbox" role="dialog" aria-modal="true" aria-label="Image preview">
      <button
        type="button"
        className="cm-gallery-lightbox__backdrop"
        onClick={onClose}
        aria-label="Close preview"
      />
      <button type="button" className="cm-gallery-lightbox__close" onClick={onClose} aria-label="Close">
        <i className="ri-close-line" aria-hidden />
      </button>
      {hasPrev && (
        <button
          type="button"
          className="cm-gallery-lightbox__nav cm-gallery-lightbox__nav--prev"
          onClick={goPrev}
          aria-label="Previous image"
        >
          <i className="ri-arrow-left-s-line" aria-hidden />
        </button>
      )}
      {hasNext && (
        <button
          type="button"
          className="cm-gallery-lightbox__nav cm-gallery-lightbox__nav--next"
          onClick={goNext}
          aria-label="Next image"
        >
          <i className="ri-arrow-right-s-line" aria-hidden />
        </button>
      )}
      <figure className="cm-gallery-lightbox__figure">
        <SafeImage
          src={current.src}
          fallbackSrc={current.fallbackSrc}
          alt={current.alt || current.title || 'Gallery image'}
          className="cm-gallery-lightbox__image"
        />
        {(current.title || items.length > 1) && (
          <figcaption className="cm-gallery-lightbox__caption">
            {current.title ? (
              <span className="cm-gallery-lightbox__title">{current.title}</span>
            ) : null}
            {items.length > 1 ? (
              <span className="cm-gallery-lightbox__counter">
                {index + 1} / {items.length}
              </span>
            ) : null}
          </figcaption>
        )}
      </figure>
    </div>,
    document.body,
  )
}
