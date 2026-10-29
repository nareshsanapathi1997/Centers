import Link from 'next/link'
import SafeImage from '@/components/ui/SafeImage'
import { Center } from '@/types'
import { getDefaultImageUrl } from '@/lib/image-utils'
import { getAllSectionEnabledStates, getPublicChromeSettings, globalSettingValue } from '@/lib/api'
import { buildHeaderNavItems, type HeaderNavItem } from '@/lib/center-header-nav'
import HeaderNavLinks from './HeaderNavLinks'
import StudentPortalButton from '@/components/student/StudentPortalButton'
import ThemeSwitcher from './ThemeSwitcher'
import SkipLink from './SkipLink'
import { resolveCenterWhatsAppUrl } from '@/lib/whatsapp-link'
import PublicHeaderShell from '@/components/public/PublicHeaderShell'

export default async function Header({
  center,
  navItems: supplied,
  homeHref,
}: {
  center: Center
  navItems?: HeaderNavItem[]
  homeHref?: string
}) {
  const [settings, states] = await Promise.all([
    getPublicChromeSettings(),
    supplied ? Promise.resolve({}) : getAllSectionEnabledStates(center.id),
  ])
  const navItems = supplied ?? buildHeaderNavItems(center.slug, states)
  const logoLight = getDefaultImageUrl(
    globalSettingValue(settings, 'global_logo_light') || center.logo_url,
    '/assets/img/logo.png',
  )
  const logoDark = getDefaultImageUrl(
    globalSettingValue(settings, 'global_logo_dark') || center.logo_dark_url,
    '/assets/img/logo-white.png',
  )
  const whatsappUrl = resolveCenterWhatsAppUrl(center)
  const phone = center.phone?.[0]
  const home = homeHref ?? `/${center.slug}`

  return (
    <>
      <SkipLink />
      <PublicHeaderShell
        utility={
          phone || center.email ? (
            <div className="pub-header__utility hidden xl:block">
              <div className="pub-container pub-header__utility-inner">
                {phone ? (
                  <a href={`tel:${phone}`}>
                    <i className="ri-phone-line" aria-hidden /> {phone}
                  </a>
                ) : null}
                {center.email ? (
                  <a href={`mailto:${center.email}`}>
                    <i className="ri-mail-line" aria-hidden /> {center.email}
                  </a>
                ) : null}
                <span className="pub-header__utility-note">EduSphere {center.name}</span>
              </div>
            </div>
          ) : null
        }
        brand={
          <Link className="pub-brand block" href={home} aria-label={`${center.name} home`}>
            <SafeImage
              className="logo-light"
              src={logoLight}
              alt={center.name}
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
        nav={<HeaderNavLinks centerSlug={center.slug} items={navItems} />}
        mobileTools={<ThemeSwitcher variant="icon" />}
        mobileExtras={
          <>
            {phone ? (
              <a href={`tel:${phone}`} className="text-sm font-semibold text-pub-ink">
                <i className="ri-phone-line" /> {phone}
              </a>
            ) : null}
            {center.email ? (
              <a href={`mailto:${center.email}`} className="text-sm font-semibold text-pub-ink">
                <i className="ri-mail-line" /> {center.email}
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
            <StudentPortalButton centerSlug={center.slug} className="pub-btn-ink" />
          </>
        }
      />
    </>
  )
}
