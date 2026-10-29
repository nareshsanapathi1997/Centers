'use client'

import LazyYouTube from '@/components/LazyYouTube'
import TemplateCarousel from '@/components/ui/TemplateCarousel'

interface StudentStory {
  id: number
  student_name: string
  student_image_url?: string
  course_name?: string
  batch_year?: string
  achievement_title?: string
  story_content: string
  testimonial_quote?: string
  video_url?: string
  is_featured: boolean
}

interface StudentStoriesSliderProps {
  stories: StudentStory[]
}

export default function StudentStoriesSlider({ stories }: StudentStoriesSliderProps) {
  const storiesWithVideos = stories.filter((story) => story.video_url)

  if (storiesWithVideos.length === 0) {
    return null
  }

  return (
    <TemplateCarousel
      className="service-slider-one"
      loop={storiesWithVideos.length > 3}
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
      {storiesWithVideos.map((story) => (
        <div key={story.id} className="service-card style1 video-testimonial-card">
          <div className="video-container">
            <LazyYouTube embedUrl={story.video_url!} />
          </div>
          <div className="service-info">
            <div className="results-title">
              <h3>
                <span>{story.student_name}</span>
              </h3>
            </div>
          </div>
        </div>
      ))}
    </TemplateCarousel>
  )
}
