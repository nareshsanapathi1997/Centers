import { BRAND } from '@/lib/brand'
import type { Metadata } from 'next'
import dynamic from 'next/dynamic'
import Script from 'next/script'
import '@/app/globals.css'
import '@/app/public-site.css'
import TemplateStylesheetLinks from '@/components/TemplateStylesheetLinks'
import AnalyticsScripts from '@/components/AnalyticsScripts'
import SEOSchema from '@/components/SEOSchema'
import { AppThemeProvider } from '@/components/AppThemeProvider'
import { buildPublicThemeInitInlineScript, loadAppThemeSettings } from '@/lib/app-theme-settings'
import { getCenterSEOSettings, getGlobalSetting } from '@/lib/api'
import { getDefaultImageUrl } from '@/lib/image-utils'
import { withBasePath } from '@/lib/with-base-path'
import { getWebsiteHomeBrandingCenter } from '@/lib/website-home-db'

const TemplateRuntime = dynamic(() => import('@/components/template/TemplateRuntime'), { ssr: false })
const WebsiteHeaderHeightSync = dynamic(() => import('@/components/website/WebsiteHeaderHeightSync'), {
  ssr: false,
})

export async function generateMetadata(): Promise<Metadata> {
  const center = await getWebsiteHomeBrandingCenter()
  const [seoSettings, globalFavicon] = await Promise.all([
    center ? getCenterSEOSettings(center.id) : Promise.resolve(null),
    getGlobalSetting('global_favicon'),
  ])

  const faviconUrl = getDefaultImageUrl(
    globalFavicon?.setting_value || center?.favicon_url,
    '/assets/img/favicon.png'
  )

  const metaTitle =
    seoSettings?.meta_title || (center?.name ? `${center.name} | ${BRAND.name}` : BRAND.name)
  const metaDescription =
    seoSettings?.meta_description ||
    center?.description ||
    `${BRAND.shortName} — premier coaching for CAT, GATE, Bank Exams, NEET, CLAT and more.`
  const metaKeywords = seoSettings?.meta_keywords
  const ogTitle = seoSettings?.og_title || metaTitle
  const ogDescription = seoSettings?.og_description || metaDescription
  const ogImage = seoSettings?.og_image || center?.logo_url
  const ogSiteName = seoSettings?.og_site_name || center?.name || BRAND.name
  const twitterTitle = seoSettings?.twitter_title || ogTitle
  const twitterDescription = seoSettings?.twitter_description || ogDescription
  const twitterImage = seoSettings?.twitter_image || ogImage

  const baseUrl = (process.env.NEXT_PUBLIC_BASE_URL || 'https://example.com').replace(/\/+$/, '')
  const pageUrl = `${baseUrl}${withBasePath('/')}`

  return {
    title: metaTitle,
    description: metaDescription,
    keywords: metaKeywords,
    authors: seoSettings?.meta_author ? [{ name: seoSettings.meta_author }] : undefined,
    robots: seoSettings?.meta_robots || 'index, follow',
    alternates: seoSettings?.canonical_url
      ? { canonical: seoSettings.canonical_url }
      : { canonical: pageUrl },
    icons: faviconUrl
      ? { icon: faviconUrl, shortcut: faviconUrl, apple: faviconUrl }
      : undefined,
    openGraph: {
      title: ogTitle,
      description: ogDescription,
      url: seoSettings?.og_url || pageUrl,
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
      'apple-mobile-web-app-title':
        seoSettings?.meta_apple_mobile_web_app_title || center?.name || BRAND.name,
      'google-site-verification': seoSettings?.google_search_console_verification || '',
      'msvalidate.01': seoSettings?.bing_verification || '',
    },
  }
}

export default async function WebsiteLayout({ children }: { children: React.ReactNode }) {
  const [center, themeSettings] = await Promise.all([
    getWebsiteHomeBrandingCenter(),
    loadAppThemeSettings(),
  ])
  const seoSettings = center ? await getCenterSEOSettings(center.id) : null

  return (
    <AppThemeProvider mode={themeSettings.mode} force={themeSettings.force}>
      {center ? <SEOSchema center={center} seoSettings={seoSettings} /> : null}
      <AnalyticsScripts seoSettings={seoSettings} />
      <TemplateStylesheetLinks />
      <script
        dangerouslySetInnerHTML={{
          __html: buildPublicThemeInitInlineScript(themeSettings),
        }}
      />
      <div id="page-content-wrap" className="page-content-wrap ready">
        {children}
      </div>
      <TemplateRuntime />
      <WebsiteHeaderHeightSync />
      <Script id="theme-toggle-website" strategy="afterInteractive">
        {`
          function setTheme(theme) {
            if (localStorage.getItem('cm-theme-force') === '1') {
              theme = localStorage.getItem('cm-theme-default') === 'dark' ? 'theme-dark' : 'theme-light';
            }
            var root = document.documentElement;
            if (theme === 'theme-dark') {
              root.setAttribute('data-theme', 'dark');
              root.classList.add('theme-dark', 'dark');
              root.classList.remove('theme-light');
              document.body.classList.add('dark-theme');
              localStorage.setItem('duch_theme', 'theme-dark');
              localStorage.setItem('cm-theme', 'dark');
            } else {
              root.setAttribute('data-theme', 'light');
              root.classList.remove('theme-dark', 'dark');
              root.classList.add('theme-light');
              document.body.classList.remove('dark-theme');
              localStorage.setItem('duch_theme', 'theme-light');
              localStorage.setItem('cm-theme', 'light');
            }
          }
          function toggleTheme() {
            if (localStorage.getItem('cm-theme-force') === '1') return;
            const slider = document.getElementById('slider');
            if (slider && slider.checked) setTheme('theme-dark');
            else setTheme('theme-light');
          }
        `}
      </Script>
    </AppThemeProvider>
  )
}
