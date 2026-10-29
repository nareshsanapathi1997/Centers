import {
  parseWebsiteExamCategory,
  websiteExamCategoryLabel,
  type WebsiteExamCategory,
} from '@/lib/website-exam-categories'

export type WebsiteResultImageRow = {
  exam_category?: string | null
  result_year?: number | null
}

export function parseResultYear(raw: string | null | undefined): number | null {
  if (!raw?.trim()) return null
  const year = Number.parseInt(raw, 10)
  const maxYear = new Date().getFullYear() + 1
  if (!Number.isFinite(year) || year < 1990 || year > maxYear) return null
  return year
}

export function collectResultYears(results: WebsiteResultImageRow[]): number[] {
  const years = new Set<number>()
  for (const row of results) {
    const year = row.result_year
    if (typeof year === 'number' && Number.isFinite(year) && year >= 1990) {
      years.add(year)
    }
  }
  return Array.from(years).sort((a, b) => b - a)
}

export function buildResultsPageHref(options?: {
  year?: number | null
  exam?: WebsiteExamCategory | null
}): string {
  const params = new URLSearchParams()
  if (options?.year != null) params.set('year', String(options.year))
  if (options?.exam != null) params.set('exam', options.exam)
  const query = params.toString()
  return query ? `/results?${query}` : '/results'
}

export function filterWebsiteResults(
  results: WebsiteResultImageRow[],
  filters: { year?: number | null; exam?: WebsiteExamCategory | null }
): WebsiteResultImageRow[] {
  return results.filter((row) => {
    if (filters.year != null && row.result_year !== filters.year) return false
    if (filters.exam != null && row.exam_category?.toLowerCase() !== filters.exam) return false
    return true
  })
}

export function describeResultsFilter(filters: {
  year?: number | null
  exam?: WebsiteExamCategory | null
}): string {
  const parts: string[] = []
  if (filters.year != null) parts.push(String(filters.year))
  if (filters.exam != null) parts.push(websiteExamCategoryLabel(filters.exam))
  if (parts.length === 0) return 'All Results'
  return parts.join(' · ')
}

export { parseWebsiteExamCategory, websiteExamCategoryLabel }
