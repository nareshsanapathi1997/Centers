import Link from 'next/link'
import { getSeniorFaculty } from '@/lib/api'
import SectionHeading from '@/components/ui/SectionHeading'
import PublicEmptyState from '@/components/ui/PublicEmptyState'
import SeniorFacultySlider from './SeniorFacultySlider'
import type { SeniorFaculty } from '@/types'

interface SeniorFacultySectionProps {
  centerId: number
  faculty?: SeniorFaculty[]
  viewAllHref?: string
}

export default async function SeniorFacultySection({
  centerId,
  faculty: facultyProp,
  viewAllHref,
}: SeniorFacultySectionProps) {
  try {
    const faculty = facultyProp ?? (await getSeniorFaculty(centerId))

    return (
      <section id="senior-faculty" className="pub-section premium-section premium-section--faculty">
        <div className="pub-container">
              <SectionHeading
                variant="lines"
                align="left"
                badge="Senior faculty"
                icon="ri-user-star-line"
                title={
                  <>
                    Mentors who teach the <span className="section-heading-highlight">plan</span>
                  </>
                }
                description="Experienced faculty at this centre — the people students meet in class."
              />
          {faculty.length === 0 ? (
            <PublicEmptyState
              icon="ri-user-star-line"
              title="Faculty profiles coming soon"
              message="Faculty members will appear here once published."
            />
          ) : (
            <SeniorFacultySlider faculty={faculty} />
          )}
          {viewAllHref && faculty.length > 0 ? (
            <div className="premium-section__action">
              <Link href={viewAllHref} className="pub-btn">
                View All Faculty <i className="ri-arrow-right-line" />
              </Link>
            </div>
          ) : null}
        </div>
      </section>
    )
  } catch (error) {
    console.error('Error fetching senior faculty:', error)
    return null
  }
}
