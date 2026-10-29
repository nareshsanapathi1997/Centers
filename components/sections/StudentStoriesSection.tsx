import { getStudentStories } from '@/lib/api'
import SectionHeading from '@/components/ui/SectionHeading'
import StudentStoriesSlider from './StudentStoriesSlider'

interface StudentStoriesSectionProps {
  centerId: number
  stories?: Record<string, unknown>[]
}

export default async function StudentStoriesSection({
  centerId,
  stories: storiesProp,
}: StudentStoriesSectionProps) {
  try {
    const stories = storiesProp ?? (await getStudentStories(centerId))

    if (!stories || stories.length === 0) {
      return null
    }

    return (
      <section id="student-stories" className="pub-section premium-section">
        <div className="pub-container">
          <SectionHeading
            variant="gradient-ring"
            align="left"
            badge="Student stories"
            icon="ri-trophy-line"
            title={
              <>
                Students who made their <span className="section-heading-highlight">rank</span>
              </>
            }
            className="mb-6"
          />
          <StudentStoriesSlider stories={stories} />
        </div>
      </section>
    )
  } catch (error) {
    console.error('Error fetching student stories:', error)
    return null
  }
}
