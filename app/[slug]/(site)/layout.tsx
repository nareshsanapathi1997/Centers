import type { Metadata } from 'next'
import '@/app/globals.css'
import '@/app/public-site.css'
import Header from '@/components/Header'
import Footer from '@/components/Footer'
import CenterTemplateAssets from '@/components/CenterTemplateAssets'
import { AppThemeProvider } from '@/components/AppThemeProvider'
import SEOSchema from '@/components/SEOSchema'
import AnalyticsScripts from '@/components/AnalyticsScripts'
import CenterWhatsAppModal from '@/components/shared/CenterWhatsAppModal'
import PublicEnquiryWidget from '@/components/enquiry/PublicEnquiryWidget'
import NavbarCollapseReset from '@/components/template/NavbarCollapseReset'
import HashScrollRestore from '@/components/HashScrollRestore'
import { loadAppThemeSettings } from '@/lib/app-theme-settings'
import { getCenterBySlug, getCenterSEOSettings, getGlobalSetting } from '@/lib/api'
import { toCenterSharePayload } from '@/lib/center-location-share'
import { normalizeImageUrl } from '@/lib/image-utils'
import { withBasePath } from '@/lib/with-base-path'
import { notFound } from 'next/navigation'

/** Public center website — includes template CSS; student portal uses a separate branch. */
export async function generateMetadata({
  params,
}: {
  params: { slug: string }
}): Promise<Metadata> {
  const center = await getCenterBySlug(params.slug)
  if (!center) {
    return { title: 'Center Not Found' }
  }

  const [seoSettings, globalFavicon] = await Promise.all([
    getCenterSEOSettings(center.id),
    getGlobalSetting('global_favicon'),
  ])
  const faviconUrl = normalizeImageUrl(globalFavicon?.setting_value || center.favicon_url)

  const metaTitle = seoSettings?.meta_title || center.name
  const metaDescription =
    seoSettings?.meta_description || center.description || `${center.name} - EduSphere Academy`
  const metaKeywords = seoSettings?.meta_keywords
  const canonicalUrl = seoSettings?.canonical_url
  const ogTitle = seoSettings?.og_title || metaTitle
  const ogDescription = seoSettings?.og_description || metaDescription
  const ogImage = seoSettings?.og_image || center.logo_url
  const ogUrl = seoSettings?.og_url
  const ogSiteName = seoSettings?.og_site_name || center.name
  const twitterTitle = seoSettings?.twitter_title || ogTitle
  const twitterDescription = seoSettings?.twitter_description || ogDescription
  const twitterImage = seoSettings?.twitter_image || ogImage

  const baseUrl = (process.env.NEXT_PUBLIC_BASE_URL || 'https://example.com').replace(/\/+$/, '')
  const pageUrl = `${baseUrl}${withBasePath(`/${center.slug}`)}`

  return {
    title: metaTitle,
    description: metaDescription,
    keywords: metaKeywords,
    authors: seoSettings?.meta_author ? [{ name: seoSettings.meta_author }] : undefined,
    robots: seoSettings?.meta_robots || 'index, follow',
    alternates: canonicalUrl ? { canonical: canonicalUrl } : { canonical: pageUrl },
    icons: faviconUrl
      ? {
          icon: faviconUrl,
          shortcut: faviconUrl,
          apple: faviconUrl,
        }
      : undefined,
    openGraph: {
      title: ogTitle,
      description: ogDescription,
      url: ogUrl || pageUrl,
      siteName: ogSiteName,
      images: ogImage ? [{ url: ogImage }] : undefined,
      locale: seoSettings?.og_locale || 'en_US',
      type: seoSettings?.og_type || 'website',
    },
    twitter: {
      card: seoSettings?.twitter_card || 'summary_large_image',
      title: twitterTitle,
      description: twitterDescription,
      images: twitterImage ? [twitterImage] : undefined,
      site: seoSettings?.twitter_site,
      creator: seoSettings?.twitter_creator,
    },
    other: {
      'theme-color': seoSettings?.meta_theme_color || '#000000',
      'mobile-web-app-capable': 'yes',
      'apple-mobile-web-app-capable': seoSettings?.meta_apple_mobile_web_app_capable || 'yes',
      'apple-mobile-web-app-status-bar-style':
        seoSettings?.meta_apple_mobile_web_app_status_bar_style || 'default',
      'apple-mobile-web-app-title': seoSettings?.meta_apple_mobile_web_app_title || center.name,
      'google-site-verification': seoSettings?.google_search_console_verification || '',
      'msvalidate.01': seoSettings?.bing_verification || '',
    },
  }
}

export default async function CenterSiteLayout({
  children,
  params,
}: {
  children: React.ReactNode
  params: { slug: string }
}) {
  const [center, themeSettings] = await Promise.all([
    getCenterBySlug(params.slug),
    loadAppThemeSettings(),
  ])
  if (!center) notFound()

  const seoSettings = await getCenterSEOSettings(center.id)
  const centerSharePayload = toCenterSharePayload(center)

  return (
    <AppThemeProvider mode={themeSettings.mode} force={themeSettings.force}>
      <SEOSchema center={center} seoSettings={seoSettings} />
      <AnalyticsScripts seoSettings={seoSettings} />
      <CenterTemplateAssets />
      <div id="page-content-wrap" className="page-content-wrap ready">
        <div className="page-wrapper loaded min-h-screen bg-pub-paper text-pub-ink" data-cm-public="true">
          <HashScrollRestore />
          <NavbarCollapseReset />
          <Header center={center} />
          {children}
          <Footer center={center} />
          <PublicEnquiryWidget
            centerId={center.id}
            centerSlug={center.slug}
            centerName={center.name}
            subtitle={`Connect with EduSphere ${center.name} experts`}
            formSource="Centre - Enquiry widget"
          />
          <CenterWhatsAppModal defaultPayload={centerSharePayload} />
        </div>
      </div>
    </AppThemeProvider>
  )
}
