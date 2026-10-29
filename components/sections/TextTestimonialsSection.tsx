import { getTextTestimonials } from '@/lib/api'
import type { TextTestimonial } from '@/types'
import SectionHeading from '@/components/ui/SectionHeading'
import TextTestimonialsSlider from './TextTestimonialsSlider'

interface TextTestimonialsSectionProps {
  centerId: number
  centerName?: string
  testimonials?: TextTestimonial[]
}

export default async function TextTestimonialsSection({
  centerId,
  centerName,
  testimonials: testimonialsProp,
}: TextTestimonialsSectionProps) {
  const testimonials = testimonialsProp ?? (await getTextTestimonials(centerId))

  if (testimonials.length === 0) {
    return null
  }

  const label = centerName?.trim() || 'India'

  return (
    <section id="testimonials" className="pub-section premium-section">
      <div className="pub-container">
        <SectionHeading
          variant="brackets"
          align="left"
          badge="Letters from students"
          title={
            <>
              What it felt like to prepare at <span className="section-heading-highlight">EduSphere {label}</span>
            </>
          }
          className="mb-6"
        />
        <TextTestimonialsSlider testimonials={testimonials} />
      </div>
    </section>
  )
}
