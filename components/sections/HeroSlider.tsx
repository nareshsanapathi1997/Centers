'use client'

import { useCallback, useRef } from 'react'
import { withBasePath, withBasePathHref } from '@/lib/with-base-path'
import { HeroSlide } from '@/types'
import { normalizeImageUrl } from '@/lib/image-utils'
import HeroSlideImage from '@/components/ui/HeroSlideImage'
import TemplateCarousel, { type TemplateCarouselHandle } from '@/components/ui/TemplateCarousel'
import { useHeroCarousel } from './HeroCarouselContext'

interface HeroSliderProps {
  slides: HeroSlide[]
  centerId?: number
  centerName: string
}

export default function HeroSlider({ slides, centerId, centerName }: HeroSliderProps) {
  const carouselRef = useRef<TemplateCarouselHandle | null>(null)
  const { register } = useHeroCarousel()

  const setCarouselRef = useCallback(
    (instance: TemplateCarouselHandle | null) => {
      carouselRef.current = instance
      register(instance)
    },
    [register],
  )

  const trackClick = async (slideId: number, actionType: 'button' | 'video' | 'image' = 'button') => {
    if (!centerId) return

    try {
      await fetch(withBasePath('/api/analytics/track'), {
        credentials: 'include',
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          centerId,
          itemType: 'hero_slide',
          itemId: slideId,
          actionType: actionType === 'video' ? 'video_click' : 'click',
        }),
      })
    } catch (error) {
      console.error('Error tracking click:', error)
    }
  }

  if (slides.length === 0) {
    return (
      <TemplateCarousel className="hero-slider-one" mode="slide" nav={false} dots={false}>
        <div className="hero-slide-item">
          <div className="hero-content" />
        </div>
      </TemplateCarousel>
    )
  }

  return (
    <TemplateCarousel
      ref={setCarouselRef}
      className="hero-slider-one"
      mode="slide"
      loop={slides.length > 1}
      nav={false}
      dots={false}
      autoplay={slides.length > 1}
      autoplayTimeout={5000}
      autoplayHoverPause
    >
      {slides.map((slide, index) => {
        const sliderImage = slide.slider_image_url ? normalizeImageUrl(slide.slider_image_url) : null

        if (sliderImage) {
          const slideLabel = slide.title?.trim() || slide.button_text?.trim() || `${centerName} banner`
          const image = (
            <HeroSlideImage
              src={sliderImage}
              fallbackSrc={withBasePath('/assets/img/hero/hero-slider-1.jpg')}
              alt=""
              width={1200}
              height={600}
              sizes="(max-width: 991px) 100vw, 66vw"
              style={{ width: '100%' }}
              priority={index === 0}
            />
          )
          return (
            <div key={slide.id} className="hero-slide-item hero-slide-image">
              <div className="hero-content">
                {slide.button_link ? (
                  <a
                    href={withBasePathHref(String(slide.button_link))}
                    onClick={() => trackClick(slide.id, 'image')}
                    aria-label={slideLabel}
                  >
                    {image}
                  </a>
                ) : (
                  image
                )}
              </div>
            </div>
          )
        }

        return (
          <div key={slide.id} className="hero-slide-item">
            <div className="hero-content">
              {slide.subtitle ? <span className="high-cus">{slide.subtitle}</span> : null}
              <h2 className="hero-slide-title">{slide.title || ''}</h2>
              {slide.description ? <p>{slide.description}</p> : null}
              <div className="hero-btn">
                {slide.button_text && slide.button_link ? (
                  <a
                    href={withBasePathHref(String(slide.button_link))}
                    className="btn style2"
                    onClick={() => trackClick(slide.id, 'button')}
                  >
                    {slide.button_text}
                  </a>
                ) : null}
                {slide.video_link ? (
                  <a
                    className="watch-video"
                    href={withBasePathHref(String(slide.video_link))}
                    onClick={() => trackClick(slide.id, 'video')}
                  >
                    <span className="play-btn">
                      <i className="flaticon-play-1" />
                    </span>
                    <span className="play-text">Watch Success Stories</span>
                  </a>
                ) : null}
              </div>
            </div>
          </div>
        )
      })}
    </TemplateCarousel>
  )
}
