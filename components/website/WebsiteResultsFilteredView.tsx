'use client'

import { useMemo } from 'react'
import SectionHeading from '@/components/ui/SectionHeading'
import { useSearchParams } from 'next/navigation'
import Link from 'next/link'
import WebsiteResultsFeed, { websiteResultsHasVisibleContent } from '@/components/website/WebsiteResultsFeed'
import { WEBSITE_EXAM_CATEGORIES } from '@/lib/website-exam-categories'
import {
  buildResultsPageHref,
  collectResultYears,
  describeResultsFilter,
  filterWebsiteResults,
  parseResultYear,
  parseWebsiteExamCategory,
} from '@/lib/website-result-filters'
import type { WebsiteResultEntryRow } from '@/lib/website-result-entry'

export default function WebsiteResultsFilteredView({
  results,
  siteName,
}: {
  results: WebsiteResultEntryRow[]
  siteName: string
}) {
  const searchParams = useSearchParams()
  const activeYear = parseResultYear(searchParams.get('year'))
  const activeExam = parseWebsiteExamCategory(searchParams.get('exam'))

  const availableYears = useMemo(() => collectResultYears(results), [results])

  const filtered = useMemo(
    () => filterWebsiteResults(results, { year: activeYear, exam: activeExam }),
    [results, activeYear, activeExam]
  )

  const activeLabel = describeResultsFilter({ year: activeYear, exam: activeExam })
  const hasActiveFilter = activeYear != null || activeExam != null
  const hasVisibleContent = websiteResultsHasVisibleContent(filtered)

  return (
    <section className="gallery-wrap style1 ptb-100 cp-section">
      <div className="container">
        <SectionHeading variant="lines" badge="Hard work, recognised" title="Every result tells a story." description={`Explore student achievements at ${siteName}, organised by exam and year.`} />

        {availableYears.length > 0 ? (
          <div className="website-results-filter-group mb-3">
            <p className="website-results-filter-label mb-2">Filter by year</p>
            <div className="website-results-filter-pills d-flex flex-wrap gap-2">
              <FilterPill
                href={buildResultsPageHref({ exam: activeExam })}
                active={activeYear == null}
                label="All Years"
              />
              {availableYears.map((year) => (
                <FilterPill
                  key={year}
                  href={buildResultsPageHref({ year, exam: activeExam })}
                  active={activeYear === year}
                  label={String(year)}
                />
              ))}
            </div>
          </div>
        ) : null}

        <div className="website-results-filter-group mb-4">
          <p className="website-results-filter-label mb-2">Filter by exam</p>
          <div className="website-results-filter-pills d-flex flex-wrap gap-2">
            <FilterPill
              href={buildResultsPageHref({ year: activeYear })}
              active={activeExam == null}
              label="All Exams"
            />
            {WEBSITE_EXAM_CATEGORIES.map((exam) => (
              <FilterPill
                key={exam.key}
                href={buildResultsPageHref({ year: activeYear, exam: exam.key })}
                active={activeExam === exam.key}
                label={exam.label}
              />
            ))}
          </div>
        </div>

        {hasVisibleContent ? (
          <>
            {hasActiveFilter ? (
              <p className="text-muted small mb-3">
                Showing {filtered.length} result entr{filtered.length === 1 ? 'y' : 'ies'} for{' '}
                <strong>{activeLabel}</strong>
              </p>
            ) : null}
            <WebsiteResultsFeed results={filtered} />
          </>
        ) : (
          <div className="text-center py-5">
            <p className="text-muted mb-2">
              No results for <strong>{activeLabel}</strong> yet.
            </p>
            <Link href="/results" className="btn style1 btn-sm">
              View all results
            </Link>
          </div>
        )}
      </div>
    </section>
  )
}

function FilterPill({
  href,
  label,
  active,
}: {
  href: string
  label: string
  active: boolean
}) {
  return (
    <Link
      href={href}
      className={`website-results-filter-pill${active ? ' is-active' : ''}`}
      aria-current={active ? 'page' : undefined}
    >
      {label}
    </Link>
  )
}
