import { notFound } from 'next/navigation'
import BackToTopButton from '@/components/BackToTopButton'
import PageHero from '@/components/PageHero'
import PublicEmptyState from '@/components/ui/PublicEmptyState'
import SectionHeading from '@/components/ui/SectionHeading'
import GallerySlider from '@/components/sections/GallerySlider'
import { getCenterBySlug, getGalleryImages } from '@/lib/api'
import { getHeroCommonBackgroundImageUrl } from '@/lib/hero-common-background'

export const revalidate = 120

export default async function CenterGalleryPage({ params }: { params: { slug: string } }) {
  const center = await getCenterBySlug(params.slug)
  if (!center) notFound()

  const [images, heroBackgroundImage] = await Promise.all([
    getGalleryImages(center.id),
    getHeroCommonBackgroundImageUrl(),
  ])

  return (
    <>
      <main id="main-content" className="corporate-home bg-pub-paper text-pub-ink">
        <PageHero
          title="Our"
          titleHighlight="Gallery"
          subtitle={`Moments and events from ${center.name}`}
          backgroundImage={heroBackgroundImage}
          breadcrumbs={[
            { label: 'Home', href: `/${center.slug}` },
            { label: 'Gallery', active: true },
          ]}
        />

        <section className="pub-section" id="gallery">
          <div className="pub-container">
            <div className="mb-6 max-w-3xl">
              <SectionHeading
                variant="lines"
                badge="Gallery"
                icon="ri-gallery-line"
                title={
                  <>
                    Discover Our Gallery of{' '}
                    <span className="section-heading-highlight">Achievements and Events</span>
                  </>
                }
              />
            </div>
            {images.length === 0 ? (
              <PublicEmptyState
                icon="ri-image-line"
                title="No gallery images yet"
                message="Photos from this centre will appear here once published."
              />
            ) : (
              <GallerySlider layout="grid" images={images} />
            )}
          </div>
        </section>
      </main>
      <BackToTopButton />
    </>
  )
}
