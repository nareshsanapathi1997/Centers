import BackToTopButton from '@/components/BackToTopButton'
import PageHero from '@/components/PageHero'
import ContentPagesStyles from '@/components/ContentPagesStyles'
import PublicEmptyState from '@/components/ui/PublicEmptyState'
import SectionHeading from '@/components/ui/SectionHeading'
import GallerySlider from '@/components/sections/GallerySlider'
import { getHeroCommonBackgroundImageUrl } from '@/lib/hero-common-background'
import { getWebsiteHomeBrandingCenter, getWebsiteGalleryImages } from '@/lib/website-home-db'
import { getWebsiteChromeSettings } from '@/lib/website-chrome-db'
import type { GalleryImage } from '@/types'
import { notFound } from 'next/navigation'

export const revalidate = 120

export default async function WebsiteGalleryPage() {
  const [galleryRows, heroBackgroundImage, chrome, brandingCenter] = await Promise.all([
    getWebsiteGalleryImages(),
    getHeroCommonBackgroundImageUrl(),
    getWebsiteChromeSettings(),
    getWebsiteHomeBrandingCenter(),
  ])

  if (!brandingCenter) notFound()

  const images = galleryRows as GalleryImage[]
  const siteName = chrome.siteName || brandingCenter.name || 'EduSphere'

  return (
    <>
      <ContentPagesStyles />
      <main id="main-content" style={{ paddingTop: 0 }}>
        <PageHero
          title="Our"
          titleHighlight="Gallery"
          subtitle={`Moments, events, and campus life at ${siteName}`}
          backgroundImage={heroBackgroundImage}
          breadcrumbs={[
            { label: 'Home', href: '/' },
            { label: 'Gallery', active: true },
          ]}
        />

        <section className="gallery-wrap style1 ptb-100 cp-section bg-albastor" id="gallery">
          <div className="container">
            <div className="row">
              <div className="col-xl-8 offset-xl-2 col-lg-10 offset-lg-1">
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
            </div>
            {images.length === 0 ? (
              <PublicEmptyState
                icon="ri-image-line"
                title="No gallery images yet"
                message="Photos from events and campus life will appear here once published."
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
