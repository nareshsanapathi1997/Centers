import { notFound } from 'next/navigation'
import Link from 'next/link'
import BackToTopButton from '@/components/BackToTopButton'
import PageHero from '@/components/PageHero'
import ContentPagesStyles from '@/components/ContentPagesStyles'
import SafeImage from '@/components/website/PublicImage'
import AboutUsSubNav from '@/components/website/AboutUsSubNav'
import { getHeroCommonBackgroundImageUrl } from '@/lib/hero-common-background'
import { resolveAboutOverviewPage } from '@/lib/website-about-pages'
import { getWebsiteAboutSection, getWebsiteHomeBrandingCenter } from '@/lib/website-home-db'
import { getWebsiteChromeSettings } from '@/lib/website-chrome-db'

export const revalidate = 120

const DEFAULT_IMAGE = '/assets/img/about-img.jpg'

export default async function WebsiteAboutPage() {
  const [aboutData, heroBackgroundImage, chrome, brandingCenter] = await Promise.all([
    getWebsiteAboutSection(),
    getHeroCommonBackgroundImageUrl(),
    getWebsiteChromeSettings(),
    getWebsiteHomeBrandingCenter(),
  ])

  if (!brandingCenter) notFound()

  const siteName = chrome.siteName || brandingCenter.name
  const page = resolveAboutOverviewPage(aboutData, siteName)

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
            { label: 'About Us', active: true },
          ]}
        />
        <AboutUsSubNav active="overview" />

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
                  <div className="cp-about-badge">
                    <h5 className="mb-0">
                      <span>{page.badgeYears}</span> {page.badgeLabel}
                    </h5>
                  </div>
                </div>
              </div>
              <div className="col-lg-6">
                <div className="content-title style1">
                  <span>{page.title}</span>
                  <h2>{page.heading}</h2>
                  {page.descriptionParagraphs.map((para, idx) => (
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
                {page.subtext ? (
                  <div className="about-subtext mt-4">
                    <h5>{page.subtext}</h5>
                  </div>
                ) : null}
                <div className="about-cta cp-cta-wrap d-flex flex-wrap gap-2">
                  <Link href="/contact" className="btn style1">
                    Get in Touch <i className="ri-arrow-right-line" />
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </section>
      </main>
      <BackToTopButton />
    </>
  )
}
