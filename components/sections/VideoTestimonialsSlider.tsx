'use client'

import { useState } from 'react'
import { VideoTestimonial } from '@/types'
import LazyYouTube from '@/components/LazyYouTube'
import TemplateCarousel from '@/components/ui/TemplateCarousel'

interface VideoTestimonialsSliderProps {
  testimonials: VideoTestimonial[]
}

export default function VideoTestimonialsSlider({ testimonials }: VideoTestimonialsSliderProps) {
  const [playingVideoId, setPlayingVideoId] = useState<number | null>(null)

  const autoplayPaused = playingVideoId != null

  if (testimonials.length === 0) {
    return null
  }

  return (
    <TemplateCarousel
      className="service-slider-one"
      loop={testimonials.length > 3}
      margin={30}
      nav
      autoplay={testimonials.length > 1}
      autoplayTimeout={5000}
      autoplayHoverPause
      autoplayPaused={autoplayPaused}
      responsive={{
        0: { items: 1 },
        768: { items: 2 },
        992: { items: 3 },
      }}
    >
      {testimonials.map((testimonial) => (
        <div key={testimonial.id} className="service-card style1 video-testimonial-card">
          <div className="video-container">
            <LazyYouTube
              embedUrl={testimonial.video_url}
              isActive={playingVideoId === testimonial.id}
              onPlay={() => setPlayingVideoId(testimonial.id)}
            />
          </div>
          <div className="service-info">
            <h3>
              <span>{testimonial.title}</span>
            </h3>
          </div>
        </div>
      ))}
    </TemplateCarousel>
  )
}
