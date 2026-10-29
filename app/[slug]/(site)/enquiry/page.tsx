import { notFound } from 'next/navigation'
import BackToTopButton from '@/components/BackToTopButton'
import PageHero from '@/components/PageHero'
import CenterEnquiryForm from '@/components/contact/CenterEnquiryForm'
import { loadEnquiryCourseOptionsForCenter } from '@/lib/center-enquiry-courses'
import { getCenterBySlug } from '@/lib/api'
import { getHeroCommonBackgroundImageUrl } from '@/lib/hero-common-background'
import { resolveCenterWhatsAppUrl } from '@/lib/whatsapp-link'

export const revalidate = 120

export default async function CenterEnquiryPage({ params }: { params: { slug: string } }) {
  const center = await getCenterBySlug(params.slug)
  if (!center) notFound()

  const [heroBackgroundImage, courseOptions] = await Promise.all([
    getHeroCommonBackgroundImageUrl(),
    loadEnquiryCourseOptionsForCenter(center.id, center.slug),
  ])

  const whatsappUrl = resolveCenterWhatsAppUrl(center)
  const primaryPhone = center.phone?.[0]

  return (
    <>
      <main id="main-content" className="corporate-home bg-pub-paper text-pub-ink">
        <PageHero
          title="Enquire"
          titleHighlight="Now"
          subtitle={`Connect with EduSphere ${center.name} — courses, batches, and admissions`}
          backgroundImage={heroBackgroundImage}
          breadcrumbs={[
            { label: 'Home', href: `/${center.slug}` },
            { label: 'Enquiry', active: true },
          ]}
        />

        <section className="pub-section" id="enquiry">
          <div className="pub-container pub-enquiry">
            <div className="pub-enquiry__intro">
              <p className="pub-eyebrow">Get in touch</p>
              <h2>Talk to {center.name} experts</h2>
              <p>
                Submit your enquiry and our team will connect with you about courses, batches, and the best
                preparation plan for your goals.
              </p>
              <ul className="pub-enquiry__proof">
                <li>
                  <i className="ri-timer-flash-line" /> Quick response
                </li>
                <li>
                  <i className="ri-user-star-line" /> Expert guidance
                </li>
                <li>
                  <i className="ri-shield-check-line" /> No-obligation advice
                </li>
              </ul>
              <ul className="pub-enquiry__contacts">
                {primaryPhone ? (
                  <li>
                    <i className="ri-phone-line" />
                    <a href={`tel:${primaryPhone}`}>{primaryPhone}</a>
                  </li>
                ) : null}
                {center.email ? (
                  <li>
                    <i className="ri-mail-line" />
                    <a href={`mailto:${center.email.trim()}`}>{center.email}</a>
                  </li>
                ) : null}
                {whatsappUrl ? (
                  <li>
                    <i className="ri-whatsapp-line" />
                    <a href={whatsappUrl} target="_blank" rel="noopener noreferrer">
                      Chat on WhatsApp
                    </a>
                  </li>
                ) : null}
                {center.address ? (
                  <li>
                    <i className="ri-map-pin-line" />
                    <span>{center.address}</span>
                  </li>
                ) : null}
              </ul>
            </div>
            <div className="pub-panel pub-enquiry__card">
              <h3>Send an enquiry</h3>
              <p>Fill in your details and we will get back to you shortly.</p>
              <CenterEnquiryForm
                centerSlug={center.slug}
                centerName={center.name}
                centerManagerId={center.id}
                formSource="Center - Enquiry Page"
                layout="widget"
                courseOptions={courseOptions}
              />
            </div>
          </div>
        </section>
      </main>
      <BackToTopButton />
    </>
  )
}
