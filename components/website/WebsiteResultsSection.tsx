import Link from 'next/link'
import WebsiteResultsFeed from '@/components/website/WebsiteResultsFeed'
import SectionHeading from '@/components/ui/SectionHeading'
import type { WebsiteResultEntryRow } from '@/lib/website-result-entry'

type WebsiteResultsSectionProps = {
  results: WebsiteResultEntryRow[]
  siteName?: string
}

export default function WebsiteResultsSection({
  results,
  siteName = 'EduSphere',
}: WebsiteResultsSectionProps) {
  if (results.length === 0) return null

  return (
    <section id="results" className="pub-section">
      <div className="pub-container">
        <div className="mb-6 flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
          <SectionHeading
            variant="stars"
            align="left"
            badge="Proof of work"
            title={`The results students came here for — ${siteName}`}
            description="Ranks, selections, and the stories behind a season of preparation."
            className="mb-0"
          />
          <Link href="/results" className="pub-btn shrink-0">
            View all results <i className="ri-arrow-right-line" />
          </Link>
        </div>
        <WebsiteResultsFeed results={results} compact showFeatured />
      </div>
    </section>
  )
}
