import Link from 'next/link'
import CenterImage from '@/components/ui/CenterImage'
import { withBasePathHref } from '@/lib/with-base-path'
import {
  buildTeemsProgramDetailLink,
  buildTeemsProgramEnrollLink,
} from '@/lib/teems-program-links'
import {
  hasValidCoursePrice,
  resolveCoursePriceFields,
  resolveCourseTypeLabel,
  resolveDiscountText,
  shouldShowStrikethroughOriginal,
} from '@/lib/teems-course-display'
import './TeemsProgramGrid.css'

function str(v: unknown): string {
  if (v == null || v === 'null') return ''
  return String(v).trim()
}

function TeemsProgramPricing({ course }: { course: Record<string, unknown> }) {
  const { originalPrice, discountedPrice, offerDetails } = resolveCoursePriceFields(course)
  const hasOriginal = hasValidCoursePrice(originalPrice)
  const hasDiscounted = hasValidCoursePrice(discountedPrice)
  const hasAnyPrice = hasOriginal || hasDiscounted
  const showStrikethrough = shouldShowStrikethroughOriginal(originalPrice, discountedPrice)
  const discountText = resolveDiscountText(originalPrice, discountedPrice, offerDetails)

  if (!hasAnyPrice && !discountText) return null

  const showGst = hasAnyPrice
  const showMeta = Boolean(discountText || showGst)

  return (
    <div className="teems-program-pricing">
      {hasAnyPrice ? (
        <>
          <hr className="teems-program-divider teems-program-divider-top" />
          <div className="teems-program-price-area">
            {hasDiscounted ? (
              <>
                {showStrikethrough ? (
                  <div className="teems-program-price-actual">₹ {originalPrice}</div>
                ) : null}
                <div className="teems-program-price-offer">₹ {discountedPrice}</div>
              </>
            ) : hasOriginal ? (
              <div className="teems-program-price-offer">₹ {originalPrice}</div>
            ) : null}
          </div>
        </>
      ) : null}
      {showMeta ? (
        <p className="teems-program-price-meta mb-0">
          {discountText ? <span>{discountText}</span> : null}
          {discountText && showGst ? <span> | </span> : null}
          {showGst ? (
            <span className="teems-program-price-gst">(Including GST)</span>
          ) : null}
        </p>
      ) : null}
      {hasAnyPrice || showMeta ? (
        <hr className="teems-program-divider teems-program-divider-bottom" />
      ) : null}
    </div>
  )
}

function resolveCourseImageUrl(course: Record<string, unknown>): string | null {
  const raw = course.image_url ?? course.image
  if (raw == null || raw === '') return null
  const s = String(raw).trim()
  if (s.startsWith('http://') || s.startsWith('https://')) return s
  return withBasePathHref(s)
}

export default function TeemsProgramGrid({
  courses,
  centerSlug,
  typeNameById,
  selectedType = '',
  selectedSubType = '',
}: {
  courses: Record<string, unknown>[]
  centerSlug: string
  typeNameById?: Map<number, string>
  selectedType?: string
  selectedSubType?: string
}) {
  const typeLabels = typeNameById ?? new Map<number, string>()
  const contactPath = centerSlug ? `/${centerSlug}/contact` : '/contact'
  if (courses.length === 0) {
    return (
      <div className="teems-empty-state-card rounded-4 py-4 py-md-5 px-3 px-md-4 text-center">
        <div className="teems-empty-state-body">
          <div
            className="mx-auto mb-3 d-flex align-items-center justify-content-center rounded-circle teems-empty-state-icon-wrap"
            style={{ width: 64, height: 64 }}
          >
            <i className="ri-filter-off-line fs-3 teems-empty-state-icon" aria-hidden />
          </div>
          <h4 className="mb-2">{selectedType || selectedSubType ? 'No matching programmes' : 'More programmes are on the way'}</h4>
          <p className="text-muted mb-4 teems-empty-state-text">
            {selectedType || selectedSubType ? 'Try another course type or clear your filters to explore more options.' : 'There are no published programmes in this category yet. Our team can help you find an alternative or learn about upcoming batches.'}
          </p>
          <Link href={contactPath} className="chapter-button">Talk to a counsellor</Link>
        </div>
      </div>
    )
  }

  return (
    <div className="teems-program-grid">
      {courses.map((c, idx) => {
        const id = c.id
        const variant = c.mapped_type_id ?? c.type_id ?? c.type
        const subType = c.mapped_sub_type_id
        const key =
          typeof id === 'number' || typeof id === 'string'
            ? `${String(id)}:${variant ?? 0}:${subType ?? 0}`
            : `c-${idx}`
        const title = str(c.title) || 'Course'
        const typeLabel = resolveCourseTypeLabel(c, typeLabels)
        const img = resolveCourseImageUrl(c)
        const p1 = str(c.promo_keyword_1)
        const p2 = str(c.promo_keyword_2)

        const view = buildTeemsProgramDetailLink(c, centerSlug)
        const enroll = buildTeemsProgramEnrollLink(c, null, contactPath, centerSlug)

        const enrollButton = enroll.external ? (
          <a href={withBasePathHref(enroll.href)} className="teems-program-btn teems-program-btn-enroll">
            <i className="ri-check-line" aria-hidden />
            Enroll Now
          </a>
        ) : (
          <Link href={enroll.href} className="teems-program-btn teems-program-btn-enroll">
            <i className="ri-check-line" aria-hidden />
            Enroll Now
          </Link>
        )

        const viewButton = view.external ? (
          <a
            href={withBasePathHref(view.href)}
            className="teems-program-btn teems-program-btn-detail"
            target={/^https?:\/\//i.test(view.href) ? '_blank' : undefined}
            rel={/^https?:\/\//i.test(view.href) ? 'noopener noreferrer' : undefined}
          >
            View Details <i className="ri-arrow-right-line" aria-hidden />
          </a>
        ) : (
          <Link href={view.href} className="teems-program-btn teems-program-btn-detail">
            View Details <i className="ri-arrow-right-line" aria-hidden />
          </Link>
        )

        return (
          <div key={key} className="teems-program-grid-col">
            <div className="course-card style1 teems-program-card position-relative h-100 d-flex flex-column">
              {img ? (
                <div className="teems-program-card-image">
                  <CenterImage
                    src={img}
                    alt={title}
                    fill
                    sizes="(max-width: 768px) 100vw, 33vw"
                    className="object-fit-cover"
                    style={{ objectFit: 'cover' }}
                  />
                  {typeLabel ? (
                    <span className="teems-program-type-badge">{typeLabel}</span>
                  ) : null}
                </div>
              ) : (
                <div className="teems-program-card-image teems-program-card-image-placeholder d-flex align-items-center justify-content-center bg-light text-muted">
                  <i className="ri-image-line ri-2x" aria-hidden />
                  {typeLabel ? (
                    <span className="teems-program-type-badge">{typeLabel}</span>
                  ) : null}
                </div>
              )}
              <div className="teems-program-card-body">
                <h3 className="teems-program-title">{title}</h3>
                {(p1 || p2) && (
                  <div className="teems-program-promo-badges d-flex flex-wrap gap-2">
                    {p1 ? <span className="teems-promo-badge">{p1}</span> : null}
                    {p2 ? <span className="teems-promo-badge">{p2}</span> : null}
                  </div>
                )}
                <div className="teems-program-footer">
                  <TeemsProgramPricing course={c} />
                  <div className="teems-program-actions">
                    {enrollButton}
                    {viewButton}
                  </div>
                </div>
              </div>
            </div>
          </div>
        )
      })}
    </div>
  )
}
