import BackToTopButton from '@/components/BackToTopButton'
import PageHero from '@/components/PageHero'
import ContentPagesStyles from '@/components/ContentPagesStyles'
import PublicEmptyState from '@/components/ui/PublicEmptyState'
import SectionHeading from '@/components/ui/SectionHeading'
import SeniorFacultySlider from '@/components/sections/SeniorFacultySlider'
import { getHeroCommonBackgroundImageUrl } from '@/lib/hero-common-background'
import { getWebsiteHomeBrandingCenter, getWebsiteSeniorFaculty } from '@/lib/website-home-db'
import { getWebsiteChromeSettings } from '@/lib/website-chrome-db'
import type { SeniorFaculty } from '@/types'
import { notFound } from 'next/navigation'

export const revalidate = 120

export default async function WebsiteFacultyPage() {
  const [facultyRows, heroBackgroundImage, chrome, brandingCenter] = await Promise.all([
    getWebsiteSeniorFaculty(),
    getHeroCommonBackgroundImageUrl(),
    getWebsiteChromeSettings(),
    getWebsiteHomeBrandingCenter(),
  ])

  if (!brandingCenter) notFound()

  const faculty = facultyRows as SeniorFaculty[]
  const siteName = chrome.siteName || brandingCenter.name || 'EduSphere'

  return (
    <>
      <ContentPagesStyles />
      <main id="main-content" style={{ paddingTop: 0 }}>
        <PageHero
          title="Senior"
          titleHighlight="Faculty"
          subtitle={`Meet the experienced educators behind ${siteName}`}
          backgroundImage={heroBackgroundImage}
          breadcrumbs={[
            { label: 'Home', href: '/' },
            { label: 'Faculty', active: true },
          ]}
        />

        <section className="team-wrap style1 ptb-100 cp-section" id="faculty">
          <div className="container">
            <div className="row">
              <div className="col-xl-8 offset-xl-2 col-lg-10 offset-lg-1">
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
            </div>
            {faculty.length === 0 ? (
              <PublicEmptyState
                icon="ri-user-star-line"
                title="Faculty profiles coming soon"
                message="Check back shortly — we are updating our faculty showcase."
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
