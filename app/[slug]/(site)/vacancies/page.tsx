import { notFound } from 'next/navigation'
import { getCenterBySlug, getVacancies } from '@/lib/api'
import { getHeroCommonBackgroundImageUrl } from '@/lib/hero-common-background'
import BackToTopButton from '@/components/BackToTopButton'
import PageHero from '@/components/PageHero'
import CenterWhatsAppButton from '@/components/shared/CenterWhatsAppButton'
import { canShareCenterLocation, toCenterSharePayload } from '@/lib/center-location-share'

/** Cache vacancies page for repeat visits. */
export const revalidate = 120

export default async function VacanciesPage({ params }: { params: { slug: string } }) {
  const center = await getCenterBySlug(params.slug)
  if (!center) notFound()
  const [vacancies, heroBackgroundImage] = await Promise.all([
    getVacancies(center.id),
    getHeroCommonBackgroundImageUrl(),
  ])

  const centerSharePayload = toCenterSharePayload(center)
  const showWhatsAppShare = canShareCenterLocation(centerSharePayload)

  return (
    <>
      <main id="main-content" className="corporate-home bg-pub-paper text-pub-ink">
        <PageHero
          title="Current"
          titleHighlight="Vacancies"
          subtitle="Join our team and help shape successful careers"
          backgroundImage={heroBackgroundImage}
          breadcrumbs={[
            { label: 'Home', href: `/${center.slug}` },
            { label: 'Vacancies', active: true },
          ]}
        />

        <section className="pub-section">
          <div className="pub-container">
                <div className="vacancies-intro mb-8 max-w-3xl">
                  <p className="pub-eyebrow">Open positions</p>
                  <h2 className="mt-2 text-4xl">
                    Roles at <em>{center.name}</em>
                  </h2>
                  <p className="mt-3 text-pub-muted">
                    We are looking for passionate educators and professionals to join our team.
                    Explore the opportunities below and reach out to us.
                  </p>
                  {center.address && (
                    <p className="cp-intro-text mb-0">
                      Walk-in enquiries are welcome at our centre. Call the number below or use
                      WhatsApp to get our address.
                    </p>
                  )}
                </div>

                {vacancies.length === 0 ? (
                  <div className="vacancies-no-open cp-vacancy-no-open">
                    <div className="vacancies-no-open-message text-center mb-5">
                      <h3 className="cp-section-title mb-3">No Open Positions Right Now</h3>
                      <p className="cp-intro-text">
                        We don&apos;t have any current vacancies, but we&apos;re always interested
                        in hearing from talented people. Send us your profile or get in touch—we&apos;ll
                        keep you in mind for future opportunities.
                      </p>
                    </div>
                    <div className="cp-vacancy-card">
                      <div className="vacancy-card-inner">
                        <div className="vacancy-main">
                          <h3 className="cp-vacancy-title">Work with {center.name}</h3>
                          <p className="vacancy-desc mb-0">
                            {center.description ||
                              `${center.name} is a premier educational institute. We value dedicated educators and professionals who can help students achieve their goals.`}
                          </p>
                          <p className="cp-intro-text mb-0 mt-3">
                            Reach out with your CV or questions. We&apos;d love to connect.
                          </p>
                        </div>
                        <div className="cp-vacancy-actions">
                          {center.phone?.[0] && (
                            <a href={`tel:${center.phone[0]}`}>
                              <i className="ri-phone-line" /> {center.phone[0]} — Call us
                            </a>
                          )}
                          {center.email && (
                            <a href={`mailto:${center.email}`}>
                              <i className="ri-mail-line" /> Email us
                            </a>
                          )}
                          {showWhatsAppShare && (
                            <CenterWhatsAppButton sharePayload={centerSharePayload} />
                          )}
                          {center.address && (
                            <p className="mb-0">
                              <i className="ri-map-pin-line" /> {center.address}
                            </p>
                          )}
                          {center.working_hours && (
                            <p className="mb-0">
                              <i className="ri-time-line" /> {center.working_hours}
                            </p>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="vacancies-list">
                    {vacancies.map((v) => (
                      <div key={v.id} className="cp-vacancy-card">
                        <div className="vacancy-card-inner">
                          <div className="vacancy-main">
                            <h3 className="cp-vacancy-title">{v.title}</h3>
                            {v.description && <p className="vacancy-desc">{v.description}</p>}
                            <ul className="vacancy-details cp-vacancy-details">
                              {v.experience && (
                                <li>
                                  <span className="detail-label">Experience:</span> {v.experience}
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
                            </ul>
                          </div>
                          {(v.contact_phone ||
                            center.phone?.[0] ||
                            center.social_whatsapp ||
                            showWhatsAppShare) && (
                            <div className="cp-vacancy-actions">
                              {v.contact_phone && (
                                <a href={`tel:${v.contact_phone}`}>
                                  <i className="ri-phone-line" /> {v.contact_phone} — Call for more
                                  info
                                </a>
                              )}
                              {showWhatsAppShare && (
                                <CenterWhatsAppButton sharePayload={centerSharePayload} />
                              )}
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                <div className="vacancies-closing-note cp-closing-note">
                  <p className="mb-0">
                    We look forward to hearing from you. Shortlisted candidates will be contacted
                    for the next steps. Thank you for your interest in joining {center.name}.
                  </p>
                </div>
          </div>
        </section>
      </main>
      <BackToTopButton />
    </>
  )
}
