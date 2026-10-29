import Link from 'next/link'
import {
  formatInr,
  parseInstallments,
  resolveCoursePricing,
  type CourseDetailRecord,
} from '@/lib/course-detail-display'
import type { CentrePrice } from '@/lib/course-centre-price'
import type { PublicEnrollmentSettings } from '@/lib/enrollment-settings'

type EnrollPanelProps = {
  course: CourseDetailRecord
  contactPath: string
  enrollHref?: string
  centerSlug: string
  centerName?: string
  modeLabel: string
  batchCount: number
  facultyCount: number
  brochureHref: string | null
  demoHref: string | null
  variant?: 'hero' | 'sidebar' | 'compact'
  resolveAssetHref: (href: string | null) => string | null
  centrePrice?: CentrePrice | null
  enrollSettings?: PublicEnrollmentSettings | null
}

export default function CourseDetailEnrollPanel({
  course,
  contactPath,
  enrollHref,
  centerSlug,
  centerName,
  modeLabel,
  batchCount,
  facultyCount,
  brochureHref,
  demoHref,
  variant = 'sidebar',
  resolveAssetHref,
  centrePrice = null,
  enrollSettings = null,
}: EnrollPanelProps) {
  const pricing = centrePrice ?? resolveCoursePricing(course)
  const installments = centrePrice ? centrePrice.installments : parseInstallments(course.installment_config)
  const trustItems =
    enrollSettings?.perks && enrollSettings.perks.length
      ? enrollSettings.perks
      : [
          { icon: 'ri-book-2-line', text: 'Comprehensive printed & digital study material' },
          { icon: 'ri-bar-chart-box-line', text: 'All-India proctored mock test series included' },
          { icon: 'ri-discuss-line', text: '1-on-1 doubt clearing & mentor guidance' },
        ]
  const priceDisplay = pricing.final != null ? formatInr(pricing.final) : null
  const showBack = variant === 'sidebar'
  const resolvedEnrollHref =
    enrollHref ||
    (course.slug
      ? `/${centerSlug}/payment/${encodeURIComponent(course.slug)}`
      : contactPath)

  return (
    <div className={`cdp-enroll cdp-enroll--${variant}`}>
      <div className="cdp-enroll__head">
        <div className="cdp-enroll__eyebrow-row">
          <span className="cdp-enroll__eyebrow">Programme Fee</span>
          {pricing.discountLabel ? (
            <span className="cdp-enroll__save-tag">
              <i className="ri-sparkling-line" aria-hidden="true" />
              {pricing.discountLabel}
            </span>
          ) : (
            <span className="cdp-enroll__status-tag">
              <span className="cdp-status-dot" />
              Open
            </span>
          )}
        </div>

        {priceDisplay ? (
          <>
            <div className="cdp-enroll__price-line">
              {centrePrice?.fromPrice ? <span className="cdp-enroll__eyebrow">From</span> : null}
              <span className="cdp-enroll__price">{priceDisplay}</span>
              {pricing.original != null && pricing.savings != null && pricing.savings > 0 ? (
                <span className="cdp-enroll__strike">{formatInr(pricing.original)}</span>
              ) : null}
            </div>
            <p className="cdp-enroll__tax">Applicable GST is calculated at checkout</p>
          </>
        ) : (
          <p className="cdp-enroll__contact-price">{enrollSettings?.contact_fee_text || 'Contact our academic desk for fee & scholarship details'}</p>
        )}
      </div>

      <div className="cdp-enroll__body">
        {course.coupon_enabled && course.coupon_code ? (
          <div className="cdp-enroll__coupon">
            <div className="cdp-enroll__coupon-icon">
              <i className="ri-coupon-3-line" aria-hidden="true" />
            </div>
            <div className="cdp-enroll__coupon-copy">
              <span>Scholarship / Promo Code</span>
              <strong>{course.coupon_code}</strong>
            </div>
          </div>
        ) : null}

        <div className="cdp-enroll__actions">
          <Link href={resolvedEnrollHref} className="cdp-btn cdp-btn--primary cdp-btn--full">
            Enroll Now
            <i className="ri-arrow-right-line" aria-hidden="true" />
          </Link>
          <Link href={contactPath} className="cdp-btn cdp-btn--secondary cdp-btn--full">
            <i className="ri-customer-service-2-line" aria-hidden="true" />
            Request Callback / Enquire
          </Link>
          {demoHref?.startsWith('http') ? (
            <a
              href={demoHref}
              className="cdp-btn cdp-btn--ghost cdp-btn--full"
              target="_blank"
              rel="noopener noreferrer"
            >
              <i className="ri-play-circle-line" aria-hidden="true" />
              Attend Free Demo Class
            </a>
          ) : null}
          {brochureHref ? (
            <a
              href={resolveAssetHref(brochureHref) ?? brochureHref}
              className="cdp-btn cdp-btn--ghost cdp-btn--full"
              target="_blank"
              rel="noopener noreferrer"
            >
              <i className="ri-download-2-line" aria-hidden="true" />
              Download Programme Brochure
            </a>
          ) : null}
        </div>

        <div className="cdp-enroll__divider" />

        <div className="cdp-enroll__section-label">Programme Summary</div>
        <ul className="cdp-enroll__perks">
          {course.duration ? (
            <li>
              <span className="cdp-enroll__perk-icon">
                <i className="ri-time-line" aria-hidden="true" />
              </span>
              <div>
                <small>Duration</small>
                <strong>{course.duration}</strong>
              </div>
            </li>
          ) : null}
          {modeLabel ? (
            <li>
              <span className="cdp-enroll__perk-icon">
                <i className="ri-macbook-line" aria-hidden="true" />
              </span>
              <div>
                <small>Learning Mode</small>
                <strong>{modeLabel} Coaching</strong>
              </div>
            </li>
          ) : null}
          {batchCount > 0 ? (
            <li>
              <span className="cdp-enroll__perk-icon">
                <i className="ri-calendar-check-line" aria-hidden="true" />
              </span>
              <div>
                <small>Batch Availability</small>
                <strong>
                  {batchCount} Active {batchCount === 1 ? 'Batch' : 'Batches'}
                </strong>
              </div>
            </li>
          ) : null}
          {facultyCount > 0 ? (
            <li>
              <span className="cdp-enroll__perk-icon">
                <i className="ri-user-star-line" aria-hidden="true" />
              </span>
              <div>
                <small>Mentorship</small>
                <strong>{facultyCount}+ Senior Faculty</strong>
              </div>
            </li>
          ) : null}
        </ul>

        {installments.length > 0 && variant !== 'compact' ? (
          <div className="cdp-enroll__plan">
            <div className="cdp-enroll__plan-head">
              <i className="ri-bank-card-line" aria-hidden="true" />
              <h4>Easy Installment Plan</h4>
            </div>
            {installments.map((row, index) => (
              <div key={`${row.label ?? 'p'}-${index}`} className="cdp-enroll__plan-row">
                <span>{row.label || `Installment ${index + 1}`}</span>
                <strong>
                  {row.amount != null && Number.isFinite(Number(row.amount))
                    ? formatInr(Number(row.amount))
                    : '?'}
                </strong>
              </div>
            ))}
          </div>
        ) : null}

        <div className="cdp-enroll__trust">
          {trustItems.map((item, i) => (
            <div key={`${item.text}-${i}`} className="cdp-enroll__trust-item">
              <i className={item.icon || 'ri-check-line'} aria-hidden="true" />
              <span>{item.text}</span>
            </div>
          ))}
        </div>

        {showBack ? (
          <div className="cdp-enroll__foot">
            {centerName ? (
              <span className="cdp-enroll__center-tag">
                <i className="ri-building-4-line" aria-hidden="true" />
                {centerName}
              </span>
            ) : null}
            <Link href={`/${centerSlug}#department`} className="cdp-enroll__back">
              <i className="ri-arrow-left-line" aria-hidden="true" />
              All Courses
            </Link>
          </div>
        ) : null}
      </div>
    </div>
  )
}
