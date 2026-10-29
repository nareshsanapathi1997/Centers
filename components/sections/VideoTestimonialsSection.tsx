import React from 'react'
import { getVideoTestimonials } from '@/lib/api'
import LazyYouTube from '@/components/LazyYouTube'
import type { VideoTestimonial } from '@/types'

interface VideoTestimonialsSectionProps {
  centerId?: number
  centerName?: string
  testimonials?: VideoTestimonial[]
  videos?: VideoTestimonial[]
}

export default async function VideoTestimonialsSection({
  centerId,
  centerName,
  testimonials: testimonialsProp,
  videos,
}: VideoTestimonialsSectionProps) {
  const list =
    testimonialsProp ?? videos ?? (centerId ? await getVideoTestimonials(centerId) : [])

  if (!list || list.length === 0) return null

  return (
    <section id="video-testimonials" className="pub-section video-testimonials-section">
      <div className="pub-container">
        <div className="ink-panel">
          <div className="grid gap-4 lg:grid-cols-12 lg:items-end mb-7">
            <div className="lg:col-span-7">
              <p className="pub-eyebrow">IN THEIR OWN WORDS</p>
              <h2 className="pub-h2 mt-2">Watch students talk through their preparation</h2>
            </div>
            <p className="ink-panel__lead m-0 lg:col-span-5">
              Short conversations on study routines, mock analysis, and how classroom mentoring{centerName ? ` at ${centerName}` : ''} helped them stay consistent.
            </p>
          </div>

          <div className="grid gap-5 md:grid-cols-3 items-stretch">
            {list.slice(0, 3).map((video) => (
              <article key={video.id} className="video-story-card">
                <LazyYouTube embedUrl={video.video_url} />
                <div className="video-story-card__body">
                  <h3>{video.title}</h3>
                </div>
              </article>
            ))}
          </div>
        </div>
      </div>
    </section>
  )
}
