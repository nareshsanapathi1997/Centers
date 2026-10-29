'use client'

import { TextTestimonial } from '@/types'
import TemplateCarousel from '@/components/ui/TemplateCarousel'

interface TextTestimonialsSliderProps {
  testimonials: TextTestimonial[]
}

function getInitial(name: string) {
  return name.charAt(0).toUpperCase()
}

function TestimonialCard({ testimonial }: { testimonial: TextTestimonial }) {
  return (
    <div className="testimonial-card style1">
      <i className="ri-double-quotes-l quote-icon" aria-hidden />
      <p className="client-quote">&quot;{testimonial.quote}&quot;</p>
      <div className="client-info-area">
        <div className="client-info-wrap">
          <div className="client-img client-avatar">
            <span className="avatar-letter">{getInitial(testimonial.author_name)}</span>
          </div>
          <div className="client-info">
            <h3 className="m-0 text-base">{testimonial.author_name}</h3>
            {testimonial.author_role ? (
              <span className="text-sm text-pub-muted">{testimonial.author_role}</span>
            ) : null}
          </div>
        </div>
      </div>
    </div>
  )
}

export default function TextTestimonialsSlider({ testimonials }: TextTestimonialsSliderProps) {
  if (testimonials.length === 0) {
    return null
  }

  const extra = testimonials.length > 3

  if (!extra) {
    return (
      <div className={`letters-grid letters-grid--${testimonials.length}`}>
        {testimonials.map((testimonial) => (
          <TestimonialCard key={testimonial.id} testimonial={testimonial} />
        ))}
      </div>
    )
  }

  return (
    <div className="letters-rail">
      <p className="letters-rail__meta">
        {testimonials.length} letters · 3 on this row, the rest slide
      </p>
      <TemplateCarousel
        className="testimonial-slider-one style1 letters-carousel"
        loop
        margin={24}
        nav
        dots
        autoplay
        autoplayTimeout={6500}
        autoplayHoverPause
        responsive={{
          0: { items: 1 },
          768: { items: 2 },
          1100: { items: 3 },
        }}
      >
        {testimonials.map((testimonial) => (
          <TestimonialCard key={testimonial.id} testimonial={testimonial} />
        ))}
      </TemplateCarousel>
    </div>
  )
}
