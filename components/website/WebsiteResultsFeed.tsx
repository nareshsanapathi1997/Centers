'use client'

import { useMemo } from 'react'
import ResultsSlider from '@/components/sections/ResultsSlider'
import WebsiteResultEntryCard from '@/components/website/WebsiteResultEntryCard'
import {
  normalizeResultEntryType,
  resultEntryHasImage,
  resultEntryHasText,
  type WebsiteResultEntryRow,
} from '@/lib/website-result-entry'
import type { ResultImage } from '@/types'

type WebsiteResultsFeedProps = {
  results: WebsiteResultEntryRow[]
  compact?: boolean
  showFeatured?: boolean
}

export default function WebsiteResultsFeed({
  results,
  compact = false,
  showFeatured = true,
}: WebsiteResultsFeedProps) {
  const sorted = useMemo(
    () =>
      [...results].sort((a, b) => {
        const yearA = a.result_year ?? 0
        const yearB = b.result_year ?? 0
        if (yearB !== yearA) return yearB - yearA
        return (a.display_order ?? 0) - (b.display_order ?? 0)
      }),
    [results]
  )

  const featured = useMemo(
    () => sorted.filter((row) => normalizeResultEntryType(row.entry_type) === 'image_text'),
    [sorted]
  )

  const imageOnly = useMemo(
    () =>
      sorted.filter((row) => {
        const type = normalizeResultEntryType(row.entry_type)
        return type === 'image' && Boolean(row.image_url)
      }),
    [sorted]
  )

  const textOnly = useMemo(
    () =>
      sorted.filter((row) => {
        const type = normalizeResultEntryType(row.entry_type)
        return type === 'text' && Boolean(row.content_html?.trim())
      }),
    [sorted]
  )

  const visibleFeatured = compact ? featured.slice(0, 2) : featured
  const visibleImages = compact ? imageOnly.slice(0, 6) : imageOnly
  const visibleText = compact ? textOnly.slice(0, 3) : textOnly

  if (sorted.length === 0) return null

  return (
    <div className="website-results-feed">
      {showFeatured && visibleFeatured.length > 0 ? (
        <div className="mb-5 grid gap-4">
          {visibleFeatured.map((entry) => (
            <WebsiteResultEntryCard key={entry.id} entry={entry} layout="featured" />
          ))}
        </div>
      ) : null}

      {visibleImages.length > 0 ? (
        <div className="website-results-feed__gallery mb-5">
          {!compact ? (
            <h3 className="website-results-feed__heading">Result highlights</h3>
          ) : null}
          <ResultsSlider results={visibleImages as ResultImage[]} />
        </div>
      ) : null}

      {visibleText.length > 0 ? (
        <div className="website-results-feed__text">
          {!compact ? <h3 className="website-results-feed__heading">Result stories</h3> : null}
          <div className="grid gap-4 md:grid-cols-2">
            {visibleText.map((entry) => (
              <WebsiteResultEntryCard key={entry.id} entry={entry} layout="text" />
            ))}
          </div>
        </div>
      ) : null}
    </div>
  )
}

export function websiteResultsHasVisibleContent(results: WebsiteResultEntryRow[]): boolean {
  return results.some((row) => {
    const type = normalizeResultEntryType(row.entry_type)
    if (resultEntryHasImage(type) && row.image_url) return true
    if (resultEntryHasText(type) && row.content_html?.trim()) return true
    return false
  })
}
