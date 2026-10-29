import PublicFaqList from '@/components/ui/PublicFaqList'
import Link from 'next/link'
import { getFAQs } from '@/lib/api'
import type { FAQ } from '@/types'
import PublicEmptyState from '@/components/ui/PublicEmptyState'

interface FAQSectionProps {
  centerId: number
  centerName: string
  faqs?: FAQ[]
  viewAllHref?: string
}

export default async function FAQSection({
  centerId,
  centerName,
  faqs: faqsProp,
  viewAllHref,
}: FAQSectionProps) {
  const faqs = faqsProp ?? (await getFAQs(centerId))
  const centerNameDisplay = centerName?.trim() || 'EduSphere'
  const preview = faqs.slice(0, 6)

  return (
    <section id="faq" className="pub-section premium-section">
      <div className="pub-container">
        <div className="faq-board">
          <div>
            <p className="pub-eyebrow">
              <i className="ri-question-line" aria-hidden /> People also ask
            </p>
            <h2 className="mt-2 max-w-md text-[clamp(1.55rem,3.2vw,2.35rem)]">
              Straight answers about <em>{centerNameDisplay}</em>
            </h2>
            {viewAllHref && faqs.length > 0 ? (
              <Link href={viewAllHref} className="pub-btn-ghost mt-4">
                All FAQs <i className="ri-arrow-right-line" />
              </Link>
            ) : null}
          </div>
          <div>
            {preview.length === 0 ? (
              <PublicEmptyState
                icon="ri-question-line"
                title="No FAQs published yet"
                message="Common questions and answers will appear here once they are added."
              />
            ) : (
              <PublicFaqList faqs={preview} />
            )}
          </div>
        </div>
      </div>
    </section>
  )
}
