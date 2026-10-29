import type { ReactNode } from 'react'
import Link from 'next/link'
import CenterImage from '@/components/ui/CenterImage'
import CourseDetailEnrollPanel from '@/components/course/CourseDetailEnrollPanel'
import CourseDetailsNav, { type CourseNavItem } from '@/components/course/CourseDetailsNav'
import {
  type CourseDetailRecord,
  externalHref,
  formatDetailDate,
  formatInr,
  formatModeLabel,
  parseStringList,
  resolveCoursePricing,
} from '@/lib/course-detail-display'
import { withBasePathHref } from '@/lib/with-base-path'
import { sanitizeCmsHtml } from '@/lib/sanitize-html'
import type { CentrePrice } from '@/lib/course-centre-price'
import type { PublicEnrollmentSettings } from '@/lib/enrollment-settings'
import './CourseDetailsView.css'

type CourseDetailsViewProps = {
  course: CourseDetailRecord
  centerSlug: string
  centerName: string
  contactPath: string
  centrePrice?: CentrePrice | null
  enrollSettings?: PublicEnrollmentSettings | null
}

function SectionCard({
  id,
  index,
  kicker,
  title,
  icon,
  children,
}: {
  id: string
  index: string
  kicker: string
  title: string
  icon: string
  children: ReactNode
}) {
  return (
    <section id={id} className="cdp-card">
      <div className="cdp-card__head">
        <div className="cdp-card__title-group">
          <div className="cdp-card__eyebrow-row">
            <span className="cdp-card__index">{index}</span>
            <span className="cdp-card__kicker">{kicker}</span>
          </div>
          <h2 className="cdp-card__title">{title}</h2>
        </div>
        <div className="cdp-card__icon" aria-hidden="true">
          <i className={icon} />
        </div>
      </div>
      <div className="cdp-card__body">{children}</div>
    </section>
  )
}

export default function CourseDetailsView({
  course,
  centerSlug,
  centerName,
  contactPath,
  centrePrice = null,
  enrollSettings = null,
}: CourseDetailsViewProps) {
  const highlights = parseStringList(course.highlights)
  const features = parseStringList(course.features)
  const learningOutcomes = parseStringList(course.learning_outcomes)
  const eligibility = parseStringList(course.eligibility_criteria)
  const pricing = centrePrice ?? resolveCoursePricing(course)
  const modeLabel = formatModeLabel(course.mode)
  const activeBatches = (course.batches ?? []).filter((b) => b.is_active !== false)
  const activeFaqs = (course.faqs ?? []).filter((f) => f.is_active !== false && f.question?.trim())
  const faculty = (course.faculty ?? []).filter((f) => f.name?.trim())

  const brochureHref = externalHref(course.brochure_url)
  const syllabusPdfHref = externalHref(course.syllabus_pdf_url)
  const demoHref = externalHref(course.demo_class_link)

  const resolveAssetHref = (href: string | null) => {
    if (!href) return null
    if (href.startsWith('http://') || href.startsWith('https://')) return href
    return withBasePathHref(href)
  }

  const enrollHref = course.slug
    ? `/${centerSlug}/payment/${encodeURIComponent(course.slug)}`
    : `/${centerSlug}/payment/${course.id}`
  const enquiryHref = contactPath || `/${centerSlug}/enquiry`

  const navItems: CourseNavItem[] = []
  if (course.detailed_description || course.short_description) navItems.push({ id: 'overview', label: 'Overview' })
  if (highlights.length || features.length) navItems.push({ id: 'highlights', label: 'Highlights & Features' })
  if (learningOutcomes.length || eligibility.length) navItems.push({ id: 'outcomes', label: 'Outcomes & Eligibility' })
  if (course.syllabus_html || syllabusPdfHref) navItems.push({ id: 'syllabus', label: 'Curriculum' })
  if (activeBatches.length) navItems.push({ id: 'batches', label: 'Batches & Schedule' })
  if (faculty.length) navItems.push({ id: 'faculty', label: 'Faculty' })
  if (activeFaqs.length) navItems.push({ id: 'faq', label: 'FAQs' })

  const priceDisplay = pricing.final != null ? formatInr(pricing.final) : null

  const enrollProps = {
    course,
    centrePrice,
    enrollSettings,
    contactPath: enquiryHref,
    enrollHref,
    centerSlug,
    centerName,
    modeLabel,
    batchCount: activeBatches.length,
    facultyCount: faculty.length,
    brochureHref,
    demoHref,
    resolveAssetHref,
  }

  let sectionNum = 0
  const nextIndex = () => {
    sectionNum += 1
    return String(sectionNum).padStart(2, '0')
  }

  return (
    <div className="cdp">
      {/* Hero Header */}
      <header className="cdp-hero">
        <div className="pub-container">
          <nav className="cdp-crumb" aria-label="Breadcrumb">
            <Link href="/">Home</Link>
            <i className="ri-arrow-right-s-line" aria-hidden="true" />
            <Link href={`/${centerSlug}`}>{centerName}</Link>
            <i className="ri-arrow-right-s-line" aria-hidden="true" />
            <Link href={`/${centerSlug}#department`}>Courses</Link>
            <i className="ri-arrow-right-s-line" aria-hidden="true" />
            <span aria-current="page">{course.title}</span>
          </nav>

          <div className="cdp-hero__grid">
            <div className="cdp-hero__copy">
              <div className="cdp-hero__badges">
                <span className="cdp-pill cdp-pill--accent">
                  <i className="ri-graduation-cap-line" aria-hidden="true" />
                  Academic Programme
                </span>
                {modeLabel ? (
                  <span className="cdp-pill">
                    <i className="ri-building-2-line" aria-hidden="true" />
                    {modeLabel}
                  </span>
                ) : null}
                {course.duration ? (
                  <span className="cdp-pill">
                    <i className="ri-time-line" aria-hidden="true" />
                    {course.duration}
                  </span>
                ) : null}
                {centerName ? (
                  <span className="cdp-pill">
                    <i className="ri-map-pin-2-line" aria-hidden="true" />
                    {centerName}
                  </span>
                ) : null}
              </div>

              <h1 className="cdp-hero__title">{course.title}</h1>

              {course.short_description ? (
                <p className="cdp-hero__lead">{course.short_description}</p>
              ) : null}

              {/* Quick Facts Strip */}
              <div className="cdp-facts">
                {course.duration ? (
                  <div className="cdp-fact">
                    <span className="cdp-fact__icon">
                      <i className="ri-calendar-todo-line" aria-hidden="true" />
                    </span>
                    <div>
                      <span className="cdp-fact__label">Duration</span>
                      <strong className="cdp-fact__value">{course.duration}</strong>
                    </div>
                  </div>
                ) : null}
                {modeLabel ? (
                  <div className="cdp-fact">
                    <span className="cdp-fact__icon">
                      <i className="ri-macbook-line" aria-hidden="true" />
                    </span>
                    <div>
                      <span className="cdp-fact__label">Delivery Mode</span>
                      <strong className="cdp-fact__value">{modeLabel}</strong>
                    </div>
                  </div>
                ) : null}
                {activeBatches.length > 0 ? (
                  <div className="cdp-fact">
                    <span className="cdp-fact__icon">
                      <i className="ri-group-line" aria-hidden="true" />
                    </span>
                    <div>
                      <span className="cdp-fact__label">Open Batches</span>
                      <strong className="cdp-fact__value">
                        {activeBatches.length} {activeBatches.length === 1 ? 'Batch' : 'Batches'}
                      </strong>
                    </div>
                  </div>
                ) : null}
                {faculty.length > 0 ? (
                  <div className="cdp-fact">
                    <span className="cdp-fact__icon">
                      <i className="ri-user-star-line" aria-hidden="true" />
                    </span>
                    <div>
                      <span className="cdp-fact__label">Mentors</span>
                      <strong className="cdp-fact__value">{faculty.length}+ Senior Faculty</strong>
                    </div>
                  </div>
                ) : null}
                {priceDisplay ? (
                  <div className="cdp-fact cdp-fact--highlight">
                    <span className="cdp-fact__icon">
                      <i className="ri-price-tag-3-line" aria-hidden="true" />
                    </span>
                    <div>
                      <span className="cdp-fact__label">Programme Fee</span>
                      <strong className="cdp-fact__value">{priceDisplay}</strong>
                    </div>
                  </div>
                ) : null}
              </div>

              {/* Primary + Resource Actions */}
              <div className="cdp-hero__actions">
                <Link href={enrollHref} className="cdp-btn cdp-btn--primary">
                  Enroll Now
                  <i className="ri-arrow-right-line" aria-hidden="true" />
                </Link>
                <Link href={enquiryHref} className="cdp-btn cdp-btn--secondary">
                  <i className="ri-customer-service-2-line" aria-hidden="true" />
                  Enquire About Batch
                </Link>
                {demoHref?.startsWith('http') ? (
                  <a
                    href={demoHref}
                    className="cdp-btn cdp-btn--ghost"
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    <i className="ri-play-circle-line" aria-hidden="true" />
                    Watch Demo
                  </a>
                ) : null}
                {brochureHref ? (
                  <a
                    href={resolveAssetHref(brochureHref) ?? brochureHref}
                    className="cdp-btn cdp-btn--ghost"
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    <i className="ri-download-2-line" aria-hidden="true" />
                    Brochure
                  </a>
                ) : null}
                {syllabusPdfHref ? (
                  <a
                    href={resolveAssetHref(syllabusPdfHref) ?? syllabusPdfHref}
                    className="cdp-btn cdp-btn--ghost"
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    <i className="ri-file-list-3-line" aria-hidden="true" />
                    Syllabus PDF
                  </a>
                ) : null}
              </div>
            </div>

            {/* Right Visual Card */}
            <div className="cdp-hero__visual">
              <div className="cdp-visual-card">
                <div className="cdp-visual-card__media">
                  {course.image_url ? (
                    <CenterImage
                      src={course.image_url}
                      alt={course.title}
                      width={640}
                      height={400}
                      className="cdp-visual-card__img"
                    />
                  ) : (
                    <div className="cdp-visual-card__placeholder">
                      <i className="ri-book-open-line" aria-hidden="true" />
                    </div>
                  )}
                  {pricing.discountLabel ? (
                    <span className="cdp-visual-card__tag">
                      <i className="ri-sparkling-line" aria-hidden="true" />
                      Save {pricing.discountLabel}
                    </span>
                  ) : null}
                </div>
                <div className="cdp-visual-card__bar">
                  <div className="cdp-visual-card__bar-item">
                    <i className="ri-shield-check-line" aria-hidden="true" />
                    <span>Verified Curriculum</span>
                  </div>
                  <div className="cdp-visual-card__bar-item">
                    <i className="ri-file-paper-2-line" aria-hidden="true" />
                    <span>Study Material Included</span>
                  </div>
                  <div className="cdp-visual-card__bar-item">
                    <i className="ri-line-chart-line" aria-hidden="true" />
                    <span>Proctored Mock Tests</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Sticky Section Sub-Navigation */}
      <CourseDetailsNav items={navItems} />

      {/* Main Two-Column Content */}
      <div className="pub-container cdp-body">
        <div className="cdp-body__grid">
          {/* Left Column (8 Cols) */}
          <div className="cdp-body__main">
            {/* Mobile / Tablet Enroll Panel */}
            <div className="cdp-mobile-enroll">
              <CourseDetailEnrollPanel {...enrollProps} variant="compact" />
            </div>

            {(course.detailed_description || course.short_description) && (
              <SectionCard
                id="overview"
                index={nextIndex()}
                kicker="Programme Overview"
                title="About This Programme"
                icon="ri-book-open-line"
              >
                {course.detailed_description ? (
                  <div
                    className="cdp-prose"
                    dangerouslySetInnerHTML={{ __html: sanitizeCmsHtml(course.detailed_description) }}
                  />
                ) : (
                  <p className="cdp-prose">{course.short_description}</p>
                )}
              </SectionCard>
            )}

            {(highlights.length > 0 || features.length > 0) && (
              <SectionCard
                id="highlights"
                index={nextIndex()}
                kicker="Key Highlights & Features"
                title="Why Learners Choose This Programme"
                icon="ri-award-line"
              >
                {highlights.length > 0 && (
                  <div className="cdp-bento-grid">
                    {highlights.map((item, i) => (
                      <article key={item} className="cdp-bento-item">
                        <div className="cdp-bento-item__top">
                          <span className="cdp-bento-item__badge">
                            <i className="ri-sparkling-2-line" aria-hidden="true" />
                          </span>
                          <span className="cdp-bento-item__num">{String(i + 1).padStart(2, '0')}</span>
                        </div>
                        <p className="cdp-bento-item__text">{item}</p>
                      </article>
                    ))}
                  </div>
                )}

                {features.length > 0 && (
                  <div className={highlights.length > 0 ? 'cdp-feature-block' : ''}>
                    {highlights.length > 0 ? (
                      <h3 className="cdp-subheading">What&apos;s Included in Your Enrolment</h3>
                    ) : null}
                    <ul className="cdp-checklist">
                      {features.map((f) => (
                        <li key={f}>
                          <span className="cdp-checklist__icon">
                            <i className="ri-check-line" aria-hidden="true" />
                          </span>
                          <span>{f}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </SectionCard>
            )}

            {(learningOutcomes.length > 0 || eligibility.length > 0) && (
              <SectionCard
                id="outcomes"
                index={nextIndex()}
                kicker="Outcomes & Eligibility"
                title="What You Will Achieve"
                icon="ri-compass-3-line"
              >
                <div className="cdp-dual-grid">
                  {learningOutcomes.length > 0 && (
                    <div className="cdp-subpanel">
                      <div className="cdp-subpanel__head">
                        <i className="ri-focus-2-line" aria-hidden="true" />
                        <h3>Learning Outcomes</h3>
                      </div>
                      <ul className="cdp-outcome-list">
                        {learningOutcomes.map((o) => (
                          <li key={o}>
                            <i className="ri-arrow-right-up-line" aria-hidden="true" />
                            <span>{o}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                  {eligibility.length > 0 && (
                    <div className="cdp-subpanel">
                      <div className="cdp-subpanel__head">
                        <i className="ri-user-follow-line" aria-hidden="true" />
                        <h3>Who Should Enrol</h3>
                      </div>
                      <ul className="cdp-eligibility-list">
                        {eligibility.map((e) => (
                          <li key={e}>
                            <i className="ri-checkbox-circle-line" aria-hidden="true" />
                            <span>{e}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              </SectionCard>
            )}

            {(course.syllabus_html || syllabusPdfHref) && (
              <SectionCard
                id="syllabus"
                index={nextIndex()}
                kicker="Structured Curriculum"
                title="Syllabus & Academic Modules"
                icon="ri-file-list-3-line"
              >
                {course.syllabus_html ? (
                  <div
                    className="cdp-prose cdp-syllabus-prose"
                    dangerouslySetInnerHTML={{ __html: sanitizeCmsHtml(course.syllabus_html) }}
                  />
                ) : null}
                {syllabusPdfHref ? (
                  <div className="cdp-syllabus-cta">
                    <div>
                      <strong>Complete Syllabus &amp; Study Plan</strong>
                      <p>Download the detailed topic-by-topic curriculum and test schedule PDF.</p>
                    </div>
                    <a
                      href={resolveAssetHref(syllabusPdfHref) ?? syllabusPdfHref}
                      className="cdp-btn cdp-btn--primary cdp-btn--sm"
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      <i className="ri-download-2-line" aria-hidden="true" />
                      Download Syllabus PDF
                    </a>
                  </div>
                ) : null}
              </SectionCard>
            )}

            {activeBatches.length > 0 && (
              <SectionCard
                id="batches"
                index={nextIndex()}
                kicker="Upcoming Batches"
                title="Choose Your Batch Schedule"
                icon="ri-calendar-check-line"
              >
                <div className="cdp-batches-grid">
                  {activeBatches.map((batch, index) => {
                    const seatLabel =
                      batch.capacity && batch.capacity > 0
                        ? `${batch.capacity} Seats`
                        : 'Open Enrolment'
                    const isFillingFast =
                      batch.capacity != null && Number(batch.capacity) > 0 && Number(batch.capacity) <= 30

                    return (
                      <div key={batch.id ?? index} className="cdp-batch-card">
                        <div className="cdp-batch-card__top">
                          <div>
                            <div className="cdp-batch-card__badges">
                              <span
                                className={`cdp-status-pill ${
                                  isFillingFast ? 'cdp-status-pill--warn' : 'cdp-status-pill--open'
                                }`}
                              >
                                <span className="cdp-status-dot" />
                                {isFillingFast ? 'Filling Fast' : 'Admissions Open'}
                              </span>
                              {batch.schedule_days ? (
                                <span className="cdp-schedule-pill">{batch.schedule_days}</span>
                              ) : null}
                            </div>
                            <h3 className="cdp-batch-card__name">
                              {batch.batch_name || `Batch ${index + 1}`}
                            </h3>
                          </div>
                          <Link href={enrollHref} className="cdp-btn cdp-btn--outline cdp-btn--sm">
                            Select Batch
                            <i className="ri-arrow-right-line" aria-hidden="true" />
                          </Link>
                        </div>

                        <div className="cdp-batch-card__meta">
                          <div className="cdp-batch-meta-item">
                            <span className="cdp-batch-meta-item__label">Class Timing</span>
                            <strong>
                              <i className="ri-time-line" aria-hidden="true" />
                              {batch.batch_timing || 'Flexible / TBA'}
                            </strong>
                          </div>
                          <div className="cdp-batch-meta-item">
                            <span className="cdp-batch-meta-item__label">Starts On</span>
                            <strong>
                              <i className="ri-calendar-event-line" aria-hidden="true" />
                              {batch.start_date ? formatDetailDate(String(batch.start_date)) : 'Immediate'}
                            </strong>
                          </div>
                          <div className="cdp-batch-meta-item">
                            <span className="cdp-batch-meta-item__label">Enrol By</span>
                            <strong>
                              <i className="ri-hourglass-line" aria-hidden="true" />
                              {batch.enrollment_deadline
                                ? formatDetailDate(String(batch.enrollment_deadline))
                                : 'Open'}
                            </strong>
                          </div>
                          <div className="cdp-batch-meta-item">
                            <span className="cdp-batch-meta-item__label">Availability</span>
                            <strong>
                              <i className="ri-user-add-line" aria-hidden="true" />
                              {seatLabel}
                            </strong>
                          </div>
                        </div>

                        {batch.notes ? (
                          <p className="cdp-batch-card__note">
                            <i className="ri-information-line" aria-hidden="true" />
                            <span>{batch.notes}</span>
                          </p>
                        ) : null}
                      </div>
                    )
                  })}
                </div>
              </SectionCard>
            )}

            {faculty.length > 0 && (
              <SectionCard
                id="faculty"
                index={nextIndex()}
                kicker="Expert Mentors"
                title="Learn From Senior Faculty"
                icon="ri-user-star-line"
              >
                <div className="cdp-faculty-grid">
                  {faculty.map((member, index) => {
                    const initials = member.name
                      .split(/\s+/)
                      .filter(Boolean)
                      .slice(0, 2)
                      .map((part) => part[0]?.toUpperCase())
                      .join('')

                    return (
                      <article key={member.id ?? index} className="cdp-faculty-card">
                        <div className="cdp-faculty-card__avatar">
                          {member.image_url ? (
                            <CenterImage
                              src={member.image_url}
                              alt={member.name}
                              fill
                              sizes="96px"
                              className="object-fit-cover"
                              style={{ objectFit: 'cover' }}
                            />
                          ) : (
                            <span className="cdp-faculty-card__initials">{initials || 'FA'}</span>
                          )}
                        </div>
                        <div className="cdp-faculty-card__info">
                          <h3>{member.name}</h3>
                          {member.role ? (
                            <span className="cdp-faculty-card__role">{member.role}</span>
                          ) : null}
                          {member.bio ? <p>{member.bio}</p> : null}
                        </div>
                      </article>
                    )
                  })}
                </div>
              </SectionCard>
            )}

            {activeFaqs.length > 0 && (
              <SectionCard
                id="faq"
                index={nextIndex()}
                kicker="Frequently Asked Questions"
                title="Common Questions Answered"
                icon="ri-question-answer-line"
              >
                <div className="cdp-faq-list">
                  {activeFaqs.map((faq, index) => (
                    <details key={faq.id ?? index} className="cdp-faq-item" open={index === 0}>
                      <summary>
                        <span>{faq.question}</span>
                        <span className="cdp-faq-item__icon" aria-hidden="true">
                          <i className="ri-add-line" />
                        </span>
                      </summary>
                      <div className="cdp-faq-item__body">
                        <p>{faq.answer}</p>
                      </div>
                    </details>
                  ))}
                </div>
              </SectionCard>
            )}

            {/* Inline Counselling Support Card at Bottom of Main Column */}
            <div className="cdp-counselling-card">
              <div className="cdp-counselling-card__copy">
                <span className="cdp-counselling-card__eyebrow">Need Academic Guidance?</span>
                <h3>Not sure which batch or learning mode fits your schedule?</h3>
                <p>
                  Speak directly with an academic mentor at {centerName} for a personalised preparation
                  roadmap, scholarship eligibility check, and batch recommendation.
                </p>
              </div>
              <div className="cdp-counselling-card__actions">
                <Link href={enquiryHref} className="cdp-btn cdp-btn--primary">
                  Request Callback
                  <i className="ri-arrow-right-line" aria-hidden="true" />
                </Link>
                <Link href={`/${centerSlug}#department`} className="cdp-btn cdp-btn--secondary">
                  Explore All Courses
                </Link>
              </div>
            </div>
          </div>

          {/* Right Sticky Sidebar (4 Cols on Desktop) */}
          <aside className="cdp-body__aside">
            <CourseDetailEnrollPanel {...enrollProps} variant="sidebar" />
          </aside>
        </div>
      </div>

      {/* Mobile Sticky Bar */}
      <div className="cdp-mobile-bar">
        <div>
          <small>{priceDisplay ? 'Programme Fee' : 'Admissions Open'}</small>
          <strong>{priceDisplay ?? course.title}</strong>
        </div>
        <div className="cdp-mobile-bar__btns">
          <Link href={enquiryHref} className="cdp-btn cdp-btn--secondary cdp-btn--sm">
            Enquire
          </Link>
          <Link href={enrollHref} className="cdp-btn cdp-btn--primary cdp-btn--sm">
            Enroll Now
          </Link>
        </div>
      </div>
    </div>
  )
}
