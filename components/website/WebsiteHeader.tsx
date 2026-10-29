import Link from 'next/link'
import SafeImage from '@/components/website/PublicImage'
import { getDefaultImageUrl } from '@/lib/image-utils'
import { getPublicChromeSettings, globalSettingValue } from '@/lib/api'
import { getCachedWebsiteHeaderTopMenu, getWebsiteChromeSettings } from '@/lib/website-chrome-db'
import { getCachedWebsiteSectionConfigs } from '@/lib/website-home-db'
import { buildWebsiteHeaderNavItems } from '@/lib/website-header-nav'
import HeaderNavLinks from '@/components/HeaderNavLinks'
import WebsiteHeaderNav from '@/components/website/WebsiteHeaderNav'
import StudentPortalButton from '@/components/student/StudentPortalButton'
import ThemeSwitcher from '@/components/ThemeSwitcher'
import SkipLink from '@/components/SkipLink'
import PublicHeaderShell from '@/components/public/PublicHeaderShell'

export default async function WebsiteHeader() {
  const [settings, chrome, sectionConfigs, headerMenuItems] = await Promise.all([
    getPublicChromeSettings(),
    getWebsiteChromeSettings(),
    getCachedWebsiteSectionConfigs(),
    getCachedWebsiteHeaderTopMenu(),
  ])
  const logoLight = getDefaultImageUrl(globalSettingValue(settings, 'global_logo_light'), '/assets/img/logo.png')
  const logoDark = getDefaultImageUrl(globalSettingValue(settings, 'global_logo_dark'), '/assets/img/logo-white.png')
  const fallbackNavItems = buildWebsiteHeaderNavItems(sectionConfigs)
  const filteredItems = headerMenuItems.filter((item) => item.menu_key !== 'student_portal')
  const whatsappUrl = chrome.whatsapp
    ? chrome.whatsapp.startsWith('http')
      ? chrome.whatsapp
      : `https://wa.me/${chrome.whatsapp.replace(/\D/g, '')}`
    : ''

  return (
    <>
      <SkipLink />
      <PublicHeaderShell
        utility={
          chrome.phone || chrome.email ? (
            <div className="pub-header__utility hidden xl:block">
              <div className="pub-container pub-header__utility-inner">
                {chrome.phone ? (
                  <a href={`tel:${chrome.phone}`}>
                    <i className="ri-phone-line" aria-hidden /> {chrome.phone}
                  </a>
                ) : null}
                {chrome.email ? (
                  <a href={`mailto:${chrome.email.trim()}`}>
                    <i className="ri-mail-line" aria-hidden /> {chrome.email}
                  </a>
                ) : null}
                <span className="pub-header__utility-note">Admissions desk · 7 days</span>
              </div>
            </div>
          ) : null
        }
        brand={
          <Link className="pub-brand block" href="/" aria-label={`${chrome.siteName} home`}>
            <SafeImage
              className="logo-light"
              src={logoLight}
              alt={chrome.siteName}
              fallbackSrc="/assets/img/logo.png"
              width={148}
              height={44}
              fetchPriority="high"
            />
            <SafeImage
              className="logo-dark"
              src={logoDark}
              alt=""
              fallbackSrc="/assets/img/logo-white.png"
              width={148}
              height={44}
              loading="lazy"
            />
          </Link>
        }
        nav={
          filteredItems.length ? (
            <WebsiteHeaderNav items={filteredItems} />
          ) : (
            <HeaderNavLinks centerSlug="" items={fallbackNavItems} />
          )
        }
        mobileTools={<ThemeSwitcher variant="icon" />}
        mobileExtras={
          <>
            {chrome.phone ? (
              <a href={`tel:${chrome.phone}`} className="text-sm font-semibold text-pub-ink">
                <i className="ri-phone-line" /> {chrome.phone}
              </a>
            ) : null}
            {chrome.email ? (
              <a href={`mailto:${chrome.email.trim()}`} className="text-sm font-semibold text-pub-ink">
                <i className="ri-mail-line" /> {chrome.email}
              </a>
            ) : null}
          </>
        }
        tools={
          <>
            <ThemeSwitcher variant="icon" />
            {whatsappUrl ? (
              <a
                href={whatsappUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="pub-icon-btn"
                aria-label="Chat on WhatsApp"
              >
                <i className="ri-whatsapp-line" />
              </a>
            ) : null}
            <StudentPortalButton className="pub-btn-ink" />
          </>
        }
      />
    </>
  )
}
