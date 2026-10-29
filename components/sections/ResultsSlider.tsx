'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { ResultImage } from '@/types'
import SafeImage from '@/components/website/PublicImage'
import ImageGalleryLightbox, { type GalleryLightboxItem } from '@/components/ui/ImageGalleryLightbox'
import TemplateCarousel from '@/components/ui/TemplateCarousel'

interface ResultsSliderProps {
  results: ResultImage[]
}

const FALLBACK_SRC = '/assets/img/results.jpg'

function ResultCard({ result, index }: { result: ResultImage; index: number }) {
  return (
    <div className="gallery-card style1 results-card">
      <div className="gallery-img gallery-img-uniform">
        <button
          type="button"
          className="gallery-img-preview-btn border-0 p-0 bg-transparent"
          data-results-index={index}
          aria-label={`Preview ${result.title}`}
        >
          <SafeImage
            src={result.image_url}
            fallbackSrc={FALLBACK_SRC}
            alt={result.title}
            className="img-fluid"
            loading="lazy"
            decoding="async"
          />
        </button>
      </div>
      <div className="results-title">
        <h3>{result.title}</h3>
      </div>
    </div>
  )
}

export default function ResultsSlider({ results }: ResultsSliderProps) {
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null)
  const sliderRef = useRef<HTMLDivElement>(null)

  const lightboxItems = useMemo<GalleryLightboxItem[]>(
    () =>
      results.map((result) => ({
        src: result.image_url,
        fallbackSrc: FALLBACK_SRC,
        title: result.title,
        alt: result.title,
      })),
    [results],
  )

  useEffect(() => {
    const slider = sliderRef.current
    if (!slider) return

    const onPreviewClick = (event: MouseEvent) => {
      const target = (event.target as HTMLElement | null)?.closest('[data-results-index]')
      if (!target || !slider.contains(target)) return
      const index = Number.parseInt(target.getAttribute('data-results-index') || '', 10)
      if (Number.isFinite(index) && index >= 0 && index < results.length) {
        setLightboxIndex(index)
      }
    }

    slider.addEventListener('click', onPreviewClick)
    return () => slider.removeEventListener('click', onPreviewClick)
  }, [results.length])

  if (results.length === 0) {
    return null
  }

  return (
    <>
      <div ref={sliderRef}>
        <TemplateCarousel
          className="results-slider-one service-slider-one"
          loop={results.length > 3}
          margin={30}
          nav
          autoplay
          autoplayTimeout={5000}
          autoplayHoverPause
          responsive={{
            0: { items: 1 },
            768: { items: 2 },
            992: { items: 3 },
          }}
        >
          {results.map((result, index) => (
            <ResultCard key={result.id} result={result} index={index} />
          ))}
        </TemplateCarousel>
      </div>

      <ImageGalleryLightbox
        items={lightboxItems}
        index={lightboxIndex}
        onClose={() => setLightboxIndex(null)}
        onIndexChange={setLightboxIndex}
      />
    </>
  )
}
