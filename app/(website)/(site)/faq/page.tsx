import PublicFaqList from '@/components/ui/PublicFaqList'
import BackToTopButton from '@/components/BackToTopButton'
import PageHero from '@/components/PageHero'
import ContentPagesStyles from '@/components/ContentPagesStyles'
import PublicEmptyState from '@/components/ui/PublicEmptyState'
import SectionHeading from '@/components/ui/SectionHeading'
import { getHeroCommonBackgroundImageUrl } from '@/lib/hero-common-background'
import { getWebsiteHomeBrandingCenter, getWebsiteFaqs } from '@/lib/website-home-db'
import { getWebsiteChromeSettings } from '@/lib/website-chrome-db'
import type { FAQ } from '@/types'
import { notFound } from 'next/navigation'

export const revalidate = 120

export default async function WebsiteFaqPage() {
  const [faqRows, heroBackgroundImage, chrome, brandingCenter] = await Promise.all([
    getWebsiteFaqs(),
    getHeroCommonBackgroundImageUrl(),
    getWebsiteChromeSettings(),
    getWebsiteHomeBrandingCenter(),
  ])

  if (!brandingCenter) notFound()

  const faqs = faqRows as FAQ[]
  const siteName = chrome.siteName || brandingCenter.name || 'EduSphere'

  return (
    <>
      <ContentPagesStyles />
      <main id="main-content" style={{ paddingTop: 0 }}>
        <PageHero
          title="People"
          titleHighlight="Also Ask"
          subtitle={`Answers to common questions about ${siteName}`}
          backgroundImage={heroBackgroundImage}
          breadcrumbs={[
            { label: 'Home', href: '/' },
            { label: 'FAQ', active: true },
          ]}
        />

        <section className="faq-wrap style1 ptb-100 cp-section" id="faq">
          <div className="container">
            <div className="row justify-content-center">
              <div className="col-xl-10 col-lg-11">
                <div className="faq-content center-home-faq">
                  <SectionHeading
                    variant="underline"
                    badge="People Also Ask"
                    icon="ri-question-line"
                    title={
                      <>
                        Frequently Asked Questions About{' '}
                        <span className="section-heading-highlight">{siteName}</span>
                      </>
                    }
                  />
                  {faqs.length === 0 ? (
                    <PublicEmptyState
                      icon="ri-question-line"
                      title="No FAQs published yet"
                      message="Common questions and answers will appear here once they are added."
                    />
                  ) : (
                    <PublicFaqList faqs={faqs} />
                  )}
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
