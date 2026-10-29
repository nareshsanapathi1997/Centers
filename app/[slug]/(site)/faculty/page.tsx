import { notFound } from 'next/navigation'
import BackToTopButton from '@/components/BackToTopButton'
import PageHero from '@/components/PageHero'
import PublicEmptyState from '@/components/ui/PublicEmptyState'
import SectionHeading from '@/components/ui/SectionHeading'
import SeniorFacultySlider from '@/components/sections/SeniorFacultySlider'
import { getCenterBySlug, getSeniorFaculty } from '@/lib/api'
import { getHeroCommonBackgroundImageUrl } from '@/lib/hero-common-background'

export const revalidate = 120

export default async function CenterFacultyPage({ params }: { params: { slug: string } }) {
  const center = await getCenterBySlug(params.slug)
  if (!center) notFound()

  const [faculty, heroBackgroundImage] = await Promise.all([
    getSeniorFaculty(center.id),
    getHeroCommonBackgroundImageUrl(),
  ])

  return (
    <>
      <main id="main-content" className="corporate-home bg-pub-paper text-pub-ink">
        <PageHero
          title="Senior"
          titleHighlight="Faculty"
          subtitle={`Meet the educators at ${center.name}`}
          backgroundImage={heroBackgroundImage}
          breadcrumbs={[
            { label: 'Home', href: `/${center.slug}` },
            { label: 'Faculty', active: true },
          ]}
        />

        <section className="pub-section" id="senior-faculty">
          <div className="pub-container">
            <div className="mb-6 max-w-3xl">
                <SectionHeading
                  variant="dots"
                  badge="Senior Faculty"
                  title={
                    <>
                      Meet Our <span className="section-heading-highlight">Experienced Faculty</span> Members
                    </>
                  }
                />
            </div>
            {faculty.length === 0 ? (
              <PublicEmptyState
                icon="ri-user-star-line"
                title="Faculty profiles coming soon"
                message="Faculty members for this centre will appear here once published."
              />
            ) : (
              <SeniorFacultySlider layout="grid" faculty={faculty} />
            )}
          </div>
        </section>
      </main>
      <BackToTopButton />
    </>
  )
}
