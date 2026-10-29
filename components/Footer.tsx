import { BRAND } from '@/lib/brand'
import Link from 'next/link'
import PublicLogo from '@/components/website/PublicLogo'
import { Center } from '@/types'
import { getPublicChromeSettings, globalSettingValue } from '@/lib/api'
import { MOBILE_APP_STORE_URL, MOBILE_PLAY_STORE_URL } from '@/lib/mobile-app-links'
import AppDownloadButtons from './AppDownloadButtons'
import { resolveCenterWhatsAppUrl } from '@/lib/whatsapp-link'

export default async function Footer({ center }: { center: Center }) {
  const settings = await getPublicChromeSettings()
  const configuredLogo = globalSettingValue(settings, 'global_logo_footer') || globalSettingValue(settings, 'global_logo_dark') || center.logo_dark_url
  const logo = configuredLogo?.startsWith('/uploads/') ? configuredLogo : '/assets/img/logo-white.png'
  const appTitle = globalSettingValue(settings, 'mobile_app_title', 'Your learning, always within reach')
  const appDescription = globalSettingValue(settings, 'mobile_app_description', 'Classes, tests, resources, and centre updates in one connected learning experience.')
  const appStoreUrl = globalSettingValue(settings, 'mobile_app_store_url', MOBILE_APP_STORE_URL)
  const playStoreUrl = globalSettingValue(settings, 'mobile_play_store_url', MOBILE_PLAY_STORE_URL)
  const copyright = globalSettingValue(settings, 'footer_copyright_text', `${BRAND.name} Pvt. Ltd.`)
  const whatsapp = resolveCenterWhatsAppUrl(center)
  const base = `/${center.slug}`
  const groups = [
    { title: 'Discover', links: [['Programs', `${base}#department`], ['Results', `${base}#results`], ['On camera', `${base}#service`], ['Faculty', `${base}#senior-faculty`]] },
    { title: 'The centre', links: [['Leadership', `${base}#leadership`], ['Gallery', `${base}#gallery`], ['About us', `${base}#about`], ['Locations', `${base}#centers`]] },
    { title: 'Connect', links: [['Free counselling', `${base}#contact`], ['Insights', `${base}#blog`], ['FAQs', `${base}#faq`], ['Careers', `${base}/vacancies`]] },
  ]

  return (
    <footer className="premium-footer center-premium-footer">
      <div className="premium-footer__glow" aria-hidden />
      <div className="premium-container">
        <section className="premium-footer__cta">
          <div className="premium-footer__cta-mark"><i className="ri-compass-3-line" /></div>
          <div className="premium-footer__cta-copy"><span className="premium-footer__eyebrow">Admissions desk</span><h2>Walk in with a goal. Leave with a plan.</h2><p>Speak with the academic team about programmes, batches, and the route that matches your exam.</p></div>
          <div className="premium-footer__cta-actions"><Link href={`${base}#contact`} className="premium-button premium-button--light">Book free counselling <i className="ri-arrow-right-up-line" /></Link>{whatsapp ? <a href={whatsapp} target="_blank" rel="noopener noreferrer" className="premium-button premium-button--glass"><i className="ri-whatsapp-line" /> WhatsApp us</a> : null}</div>
        </section>
        <div className="premium-footer__main">
          <div className="premium-footer__brand">
            <Link href={base} className="premium-footer__logo">{logo ? <PublicLogo src={logo} alt={center.name} /> : <span>{center.name}</span>}</Link>
            <div className="premium-footer__open"><span /><strong>Admissions open</strong><small>New batches enrolling now</small></div>
            <p className="premium-footer__description">{center.description || `Focused preparation, experienced mentors, and a proven learning system at ${center.name}.`}</p>
            <div className="premium-footer__socials">{center.social_facebook ? <a href={center.social_facebook} target="_blank" rel="noopener noreferrer" aria-label="Facebook"><i className="ri-facebook-line" /></a> : null}{center.social_instagram ? <a href={center.social_instagram} target="_blank" rel="noopener noreferrer" aria-label="Instagram"><i className="ri-instagram-line" /></a> : null}{center.social_linkedin ? <a href={center.social_linkedin} target="_blank" rel="noopener noreferrer" aria-label="LinkedIn"><i className="ri-linkedin-line" /></a> : null}{whatsapp ? <a href={whatsapp} target="_blank" rel="noopener noreferrer" aria-label="WhatsApp"><i className="ri-whatsapp-line" /></a> : null}</div>
          </div>
          <div className="premium-footer__links">{groups.map((group) => <div className="premium-footer__group" key={group.title}><h3>{group.title}</h3><ul className="list-style">{group.links.map(([label, href]) => <li key={href}><Link href={href}><span>{label}</span><i className="ri-arrow-right-up-line" /></Link></li>)}</ul></div>)}</div>
        </div>
        <div className="premium-footer__contact-deck">
          <div><i className="ri-phone-line" /><span><small>Speak with the centre</small>{center.phone?.[0] ? <a href={`tel:${center.phone[0]}`}>{center.phone[0]}</a> : <strong>Contact our team</strong>}</span></div>
          <div><i className="ri-mail-send-line" /><span><small>Write to us</small>{center.email ? <a href={`mailto:${center.email}`}>{center.email}</a> : <strong>Admissions support</strong>}</span></div>
          <div><i className="ri-map-pin-2-line" /><span><small>Visit the centre</small><strong>{center.address || center.name}</strong></span></div>
        </div>
        {(appStoreUrl || playStoreUrl) && <div className="premium-footer__app"><div><span className="premium-footer__eyebrow">Learning without limits</span><h3>{appTitle}</h3><p>{appDescription}</p></div><AppDownloadButtons appStoreUrl={appStoreUrl} playStoreUrl={playStoreUrl} /></div>}
        <div className="premium-footer__bottom"><p>© {new Date().getFullYear()} {copyright}</p><div><Link href={`${base}#contact`}>Support</Link><Link href={`${base}#faq`}>FAQ</Link><Link href={base}>Centre home</Link></div></div>
      </div>
    </footer>
  )
}
