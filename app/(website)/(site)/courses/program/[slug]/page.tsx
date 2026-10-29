import type { Metadata } from 'next'
import Link from 'next/link'
import { cookies } from 'next/headers'
import { notFound } from 'next/navigation'
import BackToTopButton from '@/components/BackToTopButton'
import BrandCentreLink from '@/components/course/BrandCentreLink'
import { getActiveCourseBySlug, listCentresOfferingCourse, type BrandCentreOffer } from '@/lib/brand-course-db'
import {
  formatDetailDate,
  formatInr,
  formatModeLabel,
  parseStringList,
  type CourseDetailRecord,
} from '@/lib/course-detail-display'
import { getCachedWebsiteChromeSettings } from '@/lib/website-chrome-db'
import './BrandCoursePage.css'

export const dynamic = 'force-dynamic'

type Props = { params: { slug: string } }

function plain(html: string | null | undefined, max = 160): string {
  const t = String(html || '').replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim()
  return t.length > max ? `${t.slice(0, max - 1)}…` : t
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const course = (await getActiveCourseBySlug(decodeURIComponent(params.slug))) as CourseDetailRecord | null
  if (!course) return { title: 'Course not found' }
  let site = ''
  try {
    site = (await getCachedWebsiteChromeSettings()).siteName || ''
  } catch {}
  const title = `${course.title} – Choose your centre${site ? ` | ${site}` : ''}`
  const description =
    plain(course.short_description || course.detailed_description) ||
    `Compare fees, batches and seats for ${course.title} across our centres and enroll at the one near you.`
  const url = `/courses/program/${encodeURIComponent(course.slug || String(course.id))}`
  return {
    title,
    description,
    alternates: { canonical: url },
    openGraph: { title, description, url, type: 'website', images: course.image_url ? [course.image_url] : undefined },
    twitter: { card: 'summary_large_image', title, description },
  }
}

function CentreCard({ o, courseKey, last }: { o: BrandCentreOffer; courseKey: string; last: boolean }) {
  const view = `/${o.slug}/program/${encodeURIComponent(courseKey)}`
  const pay = `/${o.slug}/payment/${encodeURIComponent(courseKey)}`
  const p = o.price
  return (
    <li className={`bcp-centre${last ? ' bcp-centre--last' : ''}`}>
      <div className="bcp-centre__head">
        <div>
          {last ? <span className="bcp-chip bcp-chip--accent"><i className="ri-history-line" aria-hidden /> Your last centre</span> : null}
          <h3 className="bcp-centre__name"><i className="ri-building-4-line" aria-hidden /> {o.name}</h3>
          {o.address ? <p className="bcp-centre__addr">{o.address}</p> : null}
        </div>
        <div className="bcp-centre__price">
          {p && p.final != null ? (
            <>
              <small>{p.fromPrice ? 'From' : 'Fee'}</small>
              <strong>{formatInr(p.final)}</strong>
              {p.savings && p.original != null ? <s>{formatInr(p.original)}</s> : null}
              {p.installments.length > 1 ? <em>or {p.installments.length} installments</em> : null}
            </>
          ) : (
            <span className="bcp-centre__noprice">Fee on request</span>
          )}
        </div>
      </div>

      <div className="bcp-centre__meta">
        {o.showSeats && o.seatsLeft != null ? (
          <span className={`bcp-chip ${o.allFull ? 'bcp-chip--danger' : o.seatsLeft <= 10 ? 'bcp-chip--warn' : 'bcp-chip--ok'}`}>
            <i className="ri-team-line" aria-hidden /> {o.allFull ? 'Full – join waitlist' : `${o.seatsLeft} seats left`}
          </span>
        ) : null}
        <span className="bcp-chip"><i className="ri-calendar-line" aria-hidden /> {o.batches.length} {o.batches.length === 1 ? 'batch' : 'batches'}</span>
      </div>

      {o.batches.length ? (
        <ul className="bcp-batches">
          {o.batches.slice(0, 4).map((b) => (
            <li key={b.id}>
              <span className="bcp-batches__name">{b.name}</span>
              <span className="bcp-batches__when">
                {[b.timing, b.startDate ? `Starts ${formatDetailDate(b.startDate)}` : null].filter(Boolean).join(' · ')}
              </span>
              {o.showSeats && b.seatsLeft != null ? (
                <span className={`bcp-batches__seats${b.full ? ' is-full' : ''}`}>{b.full ? 'Full' : `${b.seatsLeft} left`}</span>
              ) : null}
            </li>
          ))}
        </ul>
      ) : null}

      <div className="bcp-centre__actions">
        <BrandCentreLink href={view} centreSlug={o.slug} className="bcp-btn bcp-btn--ghost">
          View details
        </BrandCentreLink>
        <BrandCentreLink href={pay} centreSlug={o.slug} className="bcp-btn bcp-btn--primary">
          {o.allFull ? 'Join waitlist' : 'Enroll'} <i className="ri-arrow-right-line" aria-hidden />
        </BrandCentreLink>
      </div>
    </li>
  )
}

export default async function BrandCoursePage({ params }: Props) {
  const key = decodeURIComponent(params.slug).trim()
  if (!key) notFound()
  const course = (await getActiveCourseBySlug(key)) as CourseDetailRecord | null
  if (!course) notFound()

  const courseKey = course.slug || String(course.id)
  const offers = await listCentresOfferingCourse(Number(course.id))
  const lastSlug = cookies().get('cm_last_centre')?.value || ''
  const lastIdx = offers.findIndex((o) => o.slug === lastSlug)
  const ordered = lastIdx > 0 ? [offers[lastIdx], ...offers.filter((_, i) => i !== lastIdx)] : offers

  const prices = offers.map((o) => o.price?.final).filter((n): n is number => typeof n === 'number' && n > 0)
  const minPrice = prices.length ? Math.min(...prices) : null
  const highlights = [...parseStringList(course.highlights), ...parseStringList(course.features)].slice(0, 6)
  const modeLabel = formatModeLabel(course.mode)
  const summary = plain(course.short_description || course.detailed_description, 320)

  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'Course',
    name: course.title,
    description: summary || undefined,
    hasCourseInstance: offers.map((o) => ({
      '@type': 'CourseInstance',
      courseMode: course.mode || undefined,
      location: o.name,
      offers: o.price?.final ? { '@type': 'Offer', price: o.price.final, priceCurrency: 'INR' } : undefined,
    })),
  }

  return (
    <>
      <main id="main-content" className="bcp">
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
        <section className="bcp-hero">
          <div className="bcp-wrap">
            <nav className="bcp-crumbs" aria-label="Breadcrumb">
              <Link href="/">Home</Link><span>/</span><Link href="/#department">Courses</Link><span>/</span><span aria-current="page">{course.title}</span>
            </nav>
            <div className="bcp-hero__grid">
              <div>
                <p className="bcp-eyebrow">Programme</p>
                <h1 className="bcp-title">{course.title}</h1>
                {summary ? <p className="bcp-lead">{summary}</p> : null}
                <div className="bcp-facts">
                  {course.duration ? <span><i className="ri-time-line" aria-hidden /> {course.duration}</span> : null}
                  {modeLabel ? <span><i className="ri-macbook-line" aria-hidden /> {modeLabel}</span> : null}
                  <span><i className="ri-map-pin-line" aria-hidden /> {offers.length} {offers.length === 1 ? 'centre' : 'centres'}</span>
                  {minPrice != null ? <span><i className="ri-price-tag-3-line" aria-hidden /> From {formatInr(minPrice)}</span> : null}
                </div>
                <a href="#centres" className="bcp-btn bcp-btn--primary bcp-hero__cta">Choose your centre <i className="ri-arrow-down-line" aria-hidden /></a>
              </div>
              {course.image_url ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img className="bcp-hero__img" src={course.image_url} alt={course.title} />
              ) : null}
            </div>
          </div>
        </section>

        <div className="bcp-wrap bcp-body">
          {highlights.length ? (
            <section className="bcp-card" aria-labelledby="bcp-hl">
              <h2 id="bcp-hl" className="bcp-h2">What you get</h2>
              <ul className="bcp-highlights">
                {highlights.map((h, i) => (
                  <li key={`${h}-${i}`}><i className="ri-checkbox-circle-line" aria-hidden /> {h}</li>
                ))}
              </ul>
            </section>
          ) : null}

          <section id="centres" className="bcp-centres" aria-labelledby="bcp-centres-h">
            <div className="bcp-centres__head">
              <h2 id="bcp-centres-h" className="bcp-h2">Choose your centre</h2>
              <p>Fees, batches and seats differ by centre. Pick the one you will attend.</p>
            </div>
            {ordered.length ? (
              <ul className="bcp-centre-grid">
                {ordered.map((o) => (
                  <CentreCard key={o.slug} o={o} courseKey={courseKey} last={o.slug === lastSlug} />
                ))}
              </ul>
            ) : (
              <div className="bcp-empty">
                <i className="ri-map-pin-off-line" aria-hidden />
                <h3>Not open for enrollment yet</h3>
                <p>No centre is offering this programme right now. Tell us you are interested and our team will reach out.</p>
                <div className="bcp-empty__actions">
                  <Link href="/contact" className="bcp-btn bcp-btn--primary">Enquire</Link>
                  <Link href="/centers" className="bcp-btn bcp-btn--ghost">See all centres</Link>
                </div>
              </div>
            )}
          </section>
        </div>
      </main>
      <BackToTopButton />
    </>
  )
}
