import Link from 'next/link'
import { notFound } from 'next/navigation'
import { getHeroCommonBackgroundImageUrl } from '@/lib/hero-common-background'
import BackToTopButton from '@/components/BackToTopButton'
import PageHero from '@/components/PageHero'
import ContentPagesStyles from '@/components/ContentPagesStyles'
import VacancyWhatsAppButton from '@/components/vacancies/VacancyWhatsAppButton'
import { getWebsiteHomeBrandingCenter } from '@/lib/website-home-db'
import { getWebsiteChromeSettings } from '@/lib/website-chrome-db'
import { getAllWebsiteVacancies, groupVacanciesByCenter } from '@/lib/website-vacancies'

export const revalidate = 120

export default async function WebsiteVacanciesPage() {
  const brandingCenter = await getWebsiteHomeBrandingCenter()
  if (!brandingCenter) notFound()

  const [vacancyRows, heroBackgroundImage, chrome] = await Promise.all([
    getAllWebsiteVacancies(),
    getHeroCommonBackgroundImageUrl(),
    getWebsiteChromeSettings(),
  ])

  const siteName = chrome.siteName || 'EduSphere'
  const grouped = groupVacanciesByCenter(vacancyRows)
  const primaryPhone = chrome.phone || brandingCenter.phone?.[0]
  const contactEmail = chrome.email || brandingCenter.email

  return (
    <>
      <ContentPagesStyles />
      <main id="main-content" style={{ paddingTop: 0 }}>
        <PageHero
          title="Careers@EduSphere"
          subtitle="Open positions across all active EduSphere centres in India"
          backgroundImage={heroBackgroundImage}
          breadcrumbs={[
            { label: 'Home', href: '/' },
            { label: 'Careers@EduSphere', active: true },
          ]}
        />

        <div className="vacancies-wrap ptb-100 cp-section">
          <div className="container">
            <div className="row">
              <div className="col-12">
                <div className="vacancies-intro text-center mb-5">
                  <h2 className="content-title style1 cp-section-title mb-3">
                    <span>Open Positions</span>
                    <br /> at {siteName} Centres
                  </h2>
                  <p className="cp-intro-text">
                    Browse current vacancies from all active centres. Select a role below or visit
                    your nearest centre for walk-in enquiries.
                  </p>
                </div>

                {grouped.length === 0 ? (
                  <div className="vacancies-no-open cp-vacancy-no-open">
                    <div className="vacancies-no-open-message text-center mb-5">
                      <h3 className="cp-section-title mb-3">No Open Positions Right Now</h3>
                      <p className="cp-intro-text">
                        We don&apos;t have any current vacancies listed, but we&apos;re always
                        interested in hearing from talented people. Send us your profile or get in
                        touch—we&apos;ll keep you in mind for future opportunities.
                      </p>
                    </div>
                    <div className="cp-vacancy-card">
                      <div className="vacancy-card-inner">
                        <div className="vacancy-main">
                          <h3 className="cp-vacancy-title">Work with {siteName}</h3>
                          <p className="cp-intro-text mb-0 mt-3">
                            Reach out with your CV or questions. We&apos;d love to connect.
                          </p>
                        </div>
                        <div className="cp-vacancy-actions">
                          {primaryPhone && (
                            <a href={`tel:${primaryPhone}`}>
                              <i className="ri-phone-line" /> {primaryPhone} — Call us
                            </a>
                          )}
                          {contactEmail && (
                            <a href={`mailto:${contactEmail}`}>
                              <i className="ri-mail-line" /> Email us
                            </a>
                          )}
                          <Link href="/centers">
                            <i className="ri-map-pin-line" /> Find a centre near you
                          </Link>
                        </div>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="vacancies-list">
                    {grouped.map((group) => (
                      <section key={group.centerSlug} className="mb-5">
                        <div className="d-flex flex-wrap align-items-center justify-content-between gap-2 mb-3">
                          <h3 className="cp-section-title mb-0">
                            <span>{group.centerName}</span>
                          </h3>
                          <Link href={`/${group.centerSlug}`} className="btn style2 btn-sm">
                            Visit centre website <i className="ri-arrow-right-line" />
                          </Link>
                        </div>
                        {group.vacancies.map((v) => {
                          const centerPhone =
                            v.contact_phone ||
                            (Array.isArray(v.center_phone) ? v.center_phone[0] : v.center_phone) ||
                            primaryPhone
                          return (
                            <div key={v.id} className="cp-vacancy-card mb-3">
                              <div className="vacancy-card-inner">
                                <div className="vacancy-main">
                                  <h3 className="cp-vacancy-title">{v.title}</h3>
                                  {v.description && <p className="vacancy-desc">{v.description}</p>}
                                  <ul className="vacancy-details cp-vacancy-details">
                                    {v.experience && (
                                      <li>
                                        <span className="detail-label">Experience:</span>{' '}
                                        {v.experience}
                                      </li>
                                    )}
                                    {v.ctc && (
                                      <li>
                                        <span className="detail-label">CTC:</span> {v.ctc}
                                      </li>
                                    )}
                                    {v.nature && (
                                      <li>
                                        <span className="detail-label">Nature:</span> {v.nature}
                                      </li>
                                    )}
                                    {v.center_address && (
                                      <li>
                                        <span className="detail-label">Location:</span>{' '}
                                        {v.center_address}
                                      </li>
                                    )}
                                  </ul>
                                </div>
                                <div className="cp-vacancy-actions">
                                  {centerPhone && (
                                    <a href={`tel:${centerPhone}`}>
                                      <i className="ri-phone-line" /> {centerPhone} — Call for more
                                      info
                                    </a>
                                  )}
                                  {v.center_address && (
                                    <VacancyWhatsAppButton
                                      sharePayload={{
                                        name: group.centerName,
                                        address: v.center_address,
                                        phone: Array.isArray(v.center_phone)
                                          ? v.center_phone
                                          : v.center_phone
                                            ? [String(v.center_phone)]
                                            : undefined,
                                      }}
                                    />
                                  )}
                                </div>
                              </div>
                            </div>
                          )
                        })}
                      </section>
                    ))}
                  </div>
                )}

                <div className="vacancies-closing-note cp-closing-note">
                  <p className="mb-0">
                    We look forward to hearing from you. Shortlisted candidates will be contacted
                    for the next steps. Thank you for your interest in joining {siteName}.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>
      <BackToTopButton />
    </>
  )
}
