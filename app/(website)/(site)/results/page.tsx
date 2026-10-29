import { Suspense } from 'react'
import { notFound } from 'next/navigation'
import BackToTopButton from '@/components/BackToTopButton'
import PageHero from '@/components/PageHero'
import ContentPagesStyles from '@/components/ContentPagesStyles'
import WebsiteResultsFilteredView from '@/components/website/WebsiteResultsFilteredView'
import { getHeroCommonBackgroundImageUrl } from '@/lib/hero-common-background'
import { getWebsiteHomeBrandingCenter, getWebsiteResultImages } from '@/lib/website-home-db'
import { getWebsiteChromeSettings } from '@/lib/website-chrome-db'
import type { WebsiteResultEntryRow } from '@/lib/website-result-entry'

export const revalidate = 120

export default async function WebsiteResultsPage() {
  const [results, heroBackgroundImage, chrome, brandingCenter] = await Promise.all([
    getWebsiteResultImages(),
    getHeroCommonBackgroundImageUrl(),
    getWebsiteChromeSettings(),
    getWebsiteHomeBrandingCenter(),
  ])

  if (!brandingCenter) notFound()

  const siteName = chrome.siteName || brandingCenter.name || 'EduSphere'

  return (
    <>
      <ContentPagesStyles />
      <main id="main-content" style={{ paddingTop: 0 }}>
        <PageHero
          title="Our"
          titleHighlight="Results"
          subtitle={`Celebrating student success and achievement at ${siteName}`}
          backgroundImage={heroBackgroundImage}
          breadcrumbs={[
            { label: 'Home', href: '/' },
            { label: 'Our Results', active: true },
          ]}
        />
        <Suspense fallback={<ResultsLoading siteName={siteName} />}>
          <WebsiteResultsFilteredView
            results={results as WebsiteResultEntryRow[]}
            siteName={siteName}
          />
        </Suspense>
      </main>
      <BackToTopButton />
    </>
  )
}

function ResultsLoading({ siteName }: { siteName: string }) {
  return (
    <section className="gallery-wrap style1 ptb-100 cp-section">
      <div className="container text-center py-5">
        <p className="text-muted mb-0">Loading results for {siteName}…</p>
      </div>
    </section>
  )
}
