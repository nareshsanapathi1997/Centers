import { notFound } from 'next/navigation'
import BackToTopButton from '@/components/BackToTopButton'
import PageHero from '@/components/PageHero'
import ContentPagesStyles from '@/components/ContentPagesStyles'
import AboutUsSubNav from '@/components/website/AboutUsSubNav'
import WebsitePromotersPanel from '@/components/website/WebsitePromotersPanel'
import { getHeroCommonBackgroundImageUrl } from '@/lib/hero-common-background'
import { resolveAboutPromotersPage } from '@/lib/website-about-pages'
import { getWebsiteAboutSection, getWebsiteHomeBrandingCenter, getWebsiteLeadership } from '@/lib/website-home-db'
import { getWebsiteChromeSettings } from '@/lib/website-chrome-db'
import type { Leadership } from '@/types'

export const revalidate = 120

export default async function WebsitePromotersPage() {
  const [aboutData, leadersRaw, heroBackgroundImage, chrome, brandingCenter] = await Promise.all([
    getWebsiteAboutSection(),
    getWebsiteLeadership(),
    getHeroCommonBackgroundImageUrl(),
    getWebsiteChromeSettings(),
    getWebsiteHomeBrandingCenter(),
  ])

  if (!brandingCenter) notFound()

  const siteName = chrome.siteName || brandingCenter.name || 'EduSphere'
  const page = resolveAboutPromotersPage(aboutData, siteName)
  const leaders = (leadersRaw as Omit<Leadership, 'center_id'>[]).map((row) => ({
    ...row,
    center_id: brandingCenter.id,
  })) as Leadership[]

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
            { label: 'Meet the Promoters', active: true },
          ]}
        />
        <AboutUsSubNav active="promoters" />
        <WebsitePromotersPanel leaders={leaders} page={page} />
      </main>
      <BackToTopButton />
    </>
  )
}
