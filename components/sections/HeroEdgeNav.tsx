'use client'

import { useHeroCarousel } from './HeroCarouselContext'

export default function HeroEdgeNav() {
  const { prev, next } = useHeroCarousel()

  return (
    <div className="hero-edge-nav" aria-label="Hero slider navigation">
      <button
        type="button"
        className="hero-edge-nav-btn hero-edge-nav-prev"
        onClick={prev}
        aria-label="Previous slide"
      >
        <i className="ri-arrow-left-s-line" aria-hidden="true" />
      </button>
      <button
        type="button"
        className="hero-edge-nav-btn hero-edge-nav-next"
        onClick={next}
        aria-label="Next slide"
      >
        <i className="ri-arrow-right-s-line" aria-hidden="true" />
      </button>
    </div>
  )
}
