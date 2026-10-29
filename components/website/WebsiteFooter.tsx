import Link from 'next/link'
import PublicLogo from '@/components/website/PublicLogo'
import { getPublicChromeSettings, globalSettingValue } from '@/lib/api'
import {
  getCachedWebsiteFooterMenu,
  getWebsiteChromeSettings,
  groupWebsiteFooterItems,
  resolveWebsiteMenuHref,
} from '@/lib/website-chrome-db'

export default async function WebsiteFooter() {
  const [settings, chrome, footerItems] = await Promise.all([
    getPublicChromeSettings(),
    getWebsiteChromeSettings(),
    getCachedWebsiteFooterMenu(),
  ])
  const configuredFooterLogo =
    globalSettingValue(settings, 'global_logo_footer') || globalSettingValue(settings, 'global_logo_dark')
  const footerLogoUrl = configuredFooterLogo?.startsWith('/uploads/')
    ? configuredFooterLogo
    : '/assets/img/logo-white.png'
  const footerGroups = groupWebsiteFooterItems(footerItems).slice(0, 3)
  const whatsappUrl = chrome.whatsapp
    ? chrome.whatsapp.startsWith('http')
      ? chrome.whatsapp
      : `https://wa.me/${chrome.whatsapp.replace(/\D/g, '')}`
    : ''

  return (
    <footer className="corporate-footer">
      <div className="pub-container">
        <div className="corporate-footer__top">
          <div>
            <span className="pub-eyebrow text-[#a5b4fc]">Next conversation</span>
            <h2>Tell us the exam. We will map the programme.</h2>
          </div>
          <div className="corporate-footer__actions">
            <Link href="/#department" className="pub-btn">
              Browse programmes <i className="ri-arrow-right-line" />
            </Link>
            <Link href="/centers" className="pub-btn-ghost text-[#f8fafc]">
              Find a centre
            </Link>
          </div>
        </div>
        <div className="corporate-footer__body">
          <div className="corporate-footer__brand">
            <Link href="/" className="mb-4 inline-block">
              <PublicLogo src={footerLogoUrl} alt={chrome.siteName} />
            </Link>
            <p className="max-w-sm text-[#cbd5e1]">{chrome.tagline}</p>
            <div className="mt-4 grid gap-2 text-sm">
              {chrome.phone ? (
                <a href={`tel:${chrome.phone}`}>
                  <i className="ri-phone-line" /> {chrome.phone}
                </a>
              ) : null}
              {chrome.email ? (
                <a href={`mailto:${chrome.email.trim()}`}>
                  <i className="ri-mail-line" /> {chrome.email}
                </a>
              ) : null}
            </div>
          </div>
          <div className="corporate-footer__links">
            {footerGroups.map((group) => (
              <div key={group.key}>
                <h3 className="mb-3 text-base text-white">{group.title}</h3>
                {group.items.slice(0, 5).map((item) => {
                  const href = resolveWebsiteMenuHref(item)
                  return href.startsWith('http') ? (
                    <a key={item.id} href={href} target="_blank" rel="noopener noreferrer">
                      {item.title}
                    </a>
                  ) : (
                    <Link key={item.id} href={href}>
                      {item.title}
                    </Link>
                  )
                })}
              </div>
            ))}
          </div>
          <div className="corporate-footer__connect">
            <span className="pub-eyebrow text-[#a5b4fc]">Stay in touch</span>
            <div className="mt-3">
              {chrome.socialFacebook ? (
                <a href={chrome.socialFacebook} target="_blank" rel="noopener noreferrer" aria-label="Facebook">
                  <i className="ri-facebook-line" />
                </a>
              ) : null}
              {chrome.socialInstagram ? (
                <a href={chrome.socialInstagram} target="_blank" rel="noopener noreferrer" aria-label="Instagram">
                  <i className="ri-instagram-line" />
                </a>
              ) : null}
              {chrome.socialLinkedin ? (
                <a href={chrome.socialLinkedin} target="_blank" rel="noopener noreferrer" aria-label="LinkedIn">
                  <i className="ri-linkedin-line" />
                </a>
              ) : null}
              {whatsappUrl ? (
                <a href={whatsappUrl} target="_blank" rel="noopener noreferrer" aria-label="WhatsApp">
                  <i className="ri-whatsapp-line" />
                </a>
              ) : null}
            </div>
            <Link href="/student" className="pub-btn-ink mt-5">
              <i className="ri-graduation-cap-line" /> Student portal
            </Link>
          </div>
        </div>
        <div className="corporate-footer__bottom">
          <p>
            © {new Date().getFullYear()} {chrome.footerCopyright}
          </p>
          <div className="flex gap-4">
            <Link href="/contact">Support</Link>
            <Link href="/faq">FAQ</Link>
            <Link href="/centers">Centres</Link>
          </div>
        </div>
      </div>
    </footer>
  )
}
