import { notFound } from 'next/navigation'
import BackToTopButton from '@/components/BackToTopButton'
import PageHero from '@/components/PageHero'
import PublicEmptyState from '@/components/ui/PublicEmptyState'
import SectionHeading from '@/components/ui/SectionHeading'
import ResultsSlider from '@/components/sections/ResultsSlider'
import { getCenterBySlug, getResultImages } from '@/lib/api'
import { getHeroCommonBackgroundImageUrl } from '@/lib/hero-common-background'

export const revalidate = 120

export default async function CenterResultsPage({ params }: { params: { slug: string } }) {
  const center = await getCenterBySlug(params.slug)
  if (!center) notFound()

  const [results, heroBackgroundImage] = await Promise.all([
    getResultImages(center.id),
    getHeroCommonBackgroundImageUrl(),
  ])

  return (
    <>
      <main id="main-content" className="corporate-home bg-pub-paper text-pub-ink">
        <PageHero
          title="Our"
          titleHighlight="Results"
          subtitle={`Celebrating student success and achievement at ${center.name}`}
          backgroundImage={heroBackgroundImage}
          breadcrumbs={[
            { label: 'Home', href: `/${center.slug}` },
            { label: 'Results', active: true },
          ]}
        />

        <section className="pub-section" id="results">
          <div className="pub-container">
            <div className="mb-6 max-w-3xl">
                <SectionHeading
                  variant="stars"
                  badge="Our Results"
                  title={
                    <>
                      Celebrating Student Success and Achievement{' '}
                      <span className="section-heading-highlight">EduSphere {center.name}</span>
                    </>
                  }
                />
            </div>
            {results.length === 0 ? (
              <PublicEmptyState
                icon="ri-trophy-line"
                title="Results will appear here"
                message="Published result highlights for this centre will show up on this page."
              />
            ) : (
              <ResultsSlider results={results} />
            )}
          </div>
        </section>
      </main>
      <BackToTopButton />
    </>
  )
}
