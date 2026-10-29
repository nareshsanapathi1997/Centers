import PublicFaqList from '@/components/ui/PublicFaqList'
import { notFound } from 'next/navigation'
import BackToTopButton from '@/components/BackToTopButton'
import PageHero from '@/components/PageHero'
import PublicEmptyState from '@/components/ui/PublicEmptyState'
import SectionHeading from '@/components/ui/SectionHeading'
import { getCenterBySlug, getFAQs } from '@/lib/api'
import { getHeroCommonBackgroundImageUrl } from '@/lib/hero-common-background'

export const revalidate = 120

export default async function CenterFaqPage({ params }: { params: { slug: string } }) {
  const center = await getCenterBySlug(params.slug)
  if (!center) notFound()

  const [faqs, heroBackgroundImage] = await Promise.all([
    getFAQs(center.id),
    getHeroCommonBackgroundImageUrl(),
  ])

  const centerNameDisplay = center.name?.trim() || 'EduSphere'

  return (
    <>
      <main id="main-content" className="corporate-home bg-pub-paper text-pub-ink">
        <PageHero
          title="People"
          titleHighlight="Also Ask"
          subtitle={`Frequently asked questions about ${centerNameDisplay}`}
          backgroundImage={heroBackgroundImage}
          breadcrumbs={[
            { label: 'Home', href: `/${center.slug}` },
            { label: 'FAQ', active: true },
          ]}
        />

        <section className="pub-section" id="faq">
          <div className="pub-container">
            <div className="mx-auto max-w-4xl">
              <div className="faq-content center-home-faq">
                  <SectionHeading
                    variant="underline"
                    badge="People Also Ask"
                    icon="ri-question-line"
                    title={
                      <>
                        Frequently Asked Questions About{' '}
                        <span className="section-heading-highlight">{centerNameDisplay}</span>
                      </>
                    }
                  />
                  {faqs.length === 0 ? (
                    <PublicEmptyState
                      icon="ri-question-line"
                      title="No FAQs published yet"
                      message="Common questions for this centre will appear here once added."
                    />
                  ) : (
                    <PublicFaqList faqs={faqs} />
                  )}
              </div>
            </div>
          </div>
        </section>
      </main>
      <BackToTopButton />
    </>
  )
}
