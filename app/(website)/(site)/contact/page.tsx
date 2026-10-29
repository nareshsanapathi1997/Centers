import { notFound } from 'next/navigation'
import BackToTopButton from '@/components/BackToTopButton'
import PageHero from '@/components/PageHero'
import ContentPagesStyles from '@/components/ContentPagesStyles'
import CenterEnquiryForm from '@/components/contact/CenterEnquiryForm'
import { buildEnquiryCourseOptionsFromOurCourses } from '@/lib/center-enquiry-courses'
import { getHeroCommonBackgroundImageUrl } from '@/lib/hero-common-background'
import { getWebsiteHomeBrandingCenter } from '@/lib/website-home-db'
import { getWebsiteCatalogCourses } from '@/lib/website-catalog-courses'
import { getWebsiteChromeSettings } from '@/lib/website-chrome-db'

export const revalidate = 120

export default async function WebsiteContactPage() {
  const [brandingCenter, chrome, heroBackgroundImage, catalog] = await Promise.all([
    getWebsiteHomeBrandingCenter(),
    getWebsiteChromeSettings(),
    getHeroCommonBackgroundImageUrl(),
    getWebsiteCatalogCourses(),
  ])

  if (!brandingCenter) notFound()

  const siteName = chrome.siteName || brandingCenter.name
  const courseOptions = buildEnquiryCourseOptionsFromOurCourses({
    catalogCollegeTab: catalog.collegeTab,
    catalogSchool: catalog.school,
  })

  const whatsappUrl = chrome.whatsapp
    ? chrome.whatsapp.startsWith('http')
      ? chrome.whatsapp
      : `https://wa.me/${chrome.whatsapp.replace(/\D/g, '')}`
    : ''

  return (
    <>
      <ContentPagesStyles />
      <main id="main-content" style={{ paddingTop: 0 }}>
        <PageHero
          title="Contact"
          titleHighlight="Us"
          subtitle={`Reach ${siteName} — we are here to help with courses, centres, and admissions`}
          backgroundImage={heroBackgroundImage}
          breadcrumbs={[
            { label: 'Home', href: '/' },
            { label: 'Contact Us', active: true },
          ]}
        />

        <section className="contact-wrap style1 ptb-100 cp-section">
          <div className="container">
            <div className="row g-5">
              <div className="col-lg-5">
                <div className="content-title style1 mb-4">
                  <span>Get in Touch</span>
                  <h2>Talk to EduSphere Experts</h2>
                  <p className="mb-4">
                    Submit your enquiry and our team will connect with you about courses, batches,
                    and the nearest centre for your preparation goals.
                  </p>
                </div>
                <ul className="content-feature-list list-style style3 cp-feature-list">
                  {chrome.phone ? (
                    <li>
                      <span>
                        <i className="flaticon-phone-call" />
                      </span>
                      <a href={`tel:${chrome.phone}`}>{chrome.phone}</a>
                    </li>
                  ) : null}
                  {chrome.email ? (
                    <li>
                      <span>
                        <i className="ri-mail-line" />
                      </span>
                      <a href={`mailto:${chrome.email.trim()}`}>{chrome.email}</a>
                    </li>
                  ) : null}
                  {whatsappUrl ? (
                    <li>
                      <span>
                        <i className="ri-whatsapp-line" />
                      </span>
                      <a href={whatsappUrl} target="_blank" rel="noopener noreferrer">
                        Chat on WhatsApp
                      </a>
                    </li>
                  ) : null}
                </ul>
              </div>
              <div className="col-lg-7">
                <div className="book-appointment style1 p-4 p-md-5 rounded-4 bg-white shadow-sm">
                  <h3 className="mb-2">Send an Enquiry</h3>
                  <p className="text-muted small mb-4">
                    Fill in your details and we will get back to you shortly.
                  </p>
                  <CenterEnquiryForm
                    centerSlug={brandingCenter.slug}
                    centerName={siteName}
                    centerManagerId={brandingCenter.id}
                    formSource="Website - Contact Page"
                    layout="card"
                    courseOptions={courseOptions}
                  />
                </div>
              </div>
            </div>
          </div>
        </section>
      </main>
      <BackToTopButton />
    </>
  )
}
