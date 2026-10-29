import { notFound } from 'next/navigation'
import BackToTopButton from '@/components/BackToTopButton'
import PageHero from '@/components/PageHero'
import ContentPagesStyles from '@/components/ContentPagesStyles'
import SafeImage from '@/components/website/PublicImage'
import AboutUsSubNav from '@/components/website/AboutUsSubNav'
import { getHeroCommonBackgroundImageUrl } from '@/lib/hero-common-background'
import { resolveAboutPhilosophyPage } from '@/lib/website-about-pages'
import { getWebsiteAboutSection, getWebsiteHomeBrandingCenter } from '@/lib/website-home-db'
import { getWebsiteChromeSettings } from '@/lib/website-chrome-db'

export const revalidate = 120

const DEFAULT_IMAGE = '/assets/img/about-img.jpg'

export default async function WebsitePhilosophyPage() {
  const [aboutData, heroBackgroundImage, chrome, brandingCenter] = await Promise.all([
    getWebsiteAboutSection(),
    getHeroCommonBackgroundImageUrl(),
    getWebsiteChromeSettings(),
    getWebsiteHomeBrandingCenter(),
  ])

  if (!brandingCenter) notFound()

  const siteName = chrome.siteName || brandingCenter.name
  const page = resolveAboutPhilosophyPage(aboutData, siteName)

  return (
    <>
      <ContentPagesStyles />
      <main id="main-content" style={{ paddingTop: 0 }}>
        <PageHero
          title={page.heroTitle}
          titleHighlight={page.heroHighlight}
          subtitle={page.heroSubtitle}
          backgroundImage={heroBackgroundImage}
          breadcrumbs={[
            { label: 'Home', href: '/' },
            { label: 'About Us', href: '/about' },
            { label: 'Our Philosophy', active: true },
          ]}
        />
        <AboutUsSubNav active="philosophy" />

        <section className="about-wrap style1 ptb-100 cp-section">
          <div className="container">
            <div className="row gx-5 align-items-center">
              <div className="col-lg-6">
                <div className="cp-about-image-wrap">
                  <SafeImage
                    src={page.imageUrl}
                    fallbackSrc={DEFAULT_IMAGE}
                    alt={page.heading}
                    width={600}
                    height={400}
                  />
                </div>
              </div>
              <div className="col-lg-6">
                <div className="content-title style1">
                  <span>{page.eyebrow}</span>
                  <h2>{page.heading}</h2>
                  {page.paragraphs.map((para, idx) => (
                    <p key={idx} className="mb-3">
                      {para}
                    </p>
                  ))}
                </div>
                <ul className="content-feature-list list-style style3 cp-feature-list">
                  {page.featureList.map((feature, index) => (
                    <li key={index}>
                      <span>
                        <i className="ri-check-double-line" />
                      </span>
                      {feature}
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        </section>
      </main>
      <BackToTopButton />
    </>
  )
}
