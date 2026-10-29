import Link from 'next/link'
import { getResultImages } from '@/lib/api'
import type { ResultImage } from '@/types'
import SectionHeading from '@/components/ui/SectionHeading'
import PublicEmptyState from '@/components/ui/PublicEmptyState'
import ResultsSlider from './ResultsSlider'

interface ResultsSectionProps {
  centerId: number
  centerName?: string
  results?: ResultImage[]
  viewAllHref?: string
}

export default async function ResultsSection({
  centerId,
  centerName,
  results: resultsProp,
  viewAllHref,
}: ResultsSectionProps) {
  const results = resultsProp ?? (await getResultImages(centerId))
  const label = centerName?.trim() || 'Chennai'

  return (
    <section id="results" className="pub-section premium-section">
      <div className="pub-container">
        <SectionHeading
          variant="stars"
          align="left"
          badge="Proof of work"
          title={
            <>
              Results from <span className="section-heading-highlight">EduSphere {label}</span>
            </>
          }
          description="Ranks and selections published by this centre — the work students can point to."
          className="mb-6"
        />
        {results.length === 0 ? (
          <PublicEmptyState
            icon="ri-trophy-line"
            title="Results will appear here"
            message="Published result highlights will show up in this section."
          />
        ) : (
          <ResultsSlider results={results} />
        )}
        {viewAllHref && results.length > 0 ? (
          <div className="premium-section__action">
            <Link href={viewAllHref} className="pub-btn">
              View All Results <i className="ri-arrow-right-line" />
            </Link>
          </div>
        ) : null}
      </div>
    </section>
  )
}
