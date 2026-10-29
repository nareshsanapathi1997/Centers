import Link from 'next/link'
import { getNearbyCenters } from '@/lib/api'
import type { Center } from '@/types'
import SectionHeading from '@/components/ui/SectionHeading'
import CentersGrid from './CentersGrid'

interface CentersSectionProps {
  centerId: number
  nearbyCenters?: Center[]
  /** Website home: link to /centers for all active centres */
  viewAllHref?: string
  /** Website home: show visit centre links on cards */
  linkToCenterSite?: boolean
  sectionTitle?: string
  sectionHeading?: string
  /** Full-page /centers route: add top padding below header */
  standalone?: boolean
}

export default async function CentersSection({
  centerId,
  nearbyCenters: centersProp,
  viewAllHref,
  linkToCenterSite = false,
  sectionTitle = 'Our centres',
  sectionHeading = 'A EduSphere centre near you',
  standalone = false,
}: CentersSectionProps) {
  const centers = centersProp ?? (await getNearbyCenters(centerId))

  if (centers.length === 0) return null

  const sectionClass = `pub-section premium-section premium-section--centers${standalone ? ' premium-section--standalone' : ''}`

  return (
    <section id="centers" className={sectionClass}>
      <div className="pub-container">
        <div className="premium-section__heading premium-section__heading--split">
          <div>
            <SectionHeading
              variant="lines"
              align="left"
              badge={sectionTitle}
              icon="ri-map-pin-line"
              title={
                sectionHeading === 'A EduSphere centre near you' ? (
                  <>
                    A EduSphere centre <span className="section-heading-highlight">near you</span>
                  </>
                ) : (
                  sectionHeading
                )
              }
              description="Walk in, talk to a counsellor, and leave with a programme that matches your exam."
            />
          </div>
          {viewAllHref ? (
            <Link href={viewAllHref} className="pub-btn">
              View all centres <i className="ri-arrow-right-line" />
            </Link>
          ) : null}
        </div>
        <CentersGrid
          centers={centers}
          centerId={centerId}
          linkToCenterSite={linkToCenterSite}
        />
      </div>
    </section>
  )
}
