/** Exam categories for website result images and header menu filtering. */

export type WebsiteExamCategory =
  | 'cat'
  | 'bank'
  | 'gate'
  | 'gmat'
  | 'jee'
  | 'neet'
  | 'clat'
  | 'ipm'
  | 'icet'

export const WEBSITE_EXAM_CATEGORIES: Array<{ key: WebsiteExamCategory; label: string }> = [
  { key: 'cat', label: 'CAT/MBA' },
  { key: 'bank', label: 'Bank Exams' },
  { key: 'gate', label: 'GATE' },
  { key: 'gmat', label: 'GMAT' },
  { key: 'jee', label: 'JEE/Engg' },
  { key: 'neet', label: 'NEET' },
  { key: 'clat', label: 'CLAT' },
  { key: 'ipm', label: 'IPM/BBA' },
  { key: 'icet', label: 'ICET' },
]

const LABEL_BY_KEY = new Map(WEBSITE_EXAM_CATEGORIES.map((row) => [row.key, row.label]))

export function parseWebsiteExamCategory(raw: string | null | undefined): WebsiteExamCategory | null {
  if (!raw) return null
  const key = raw.trim().toLowerCase()
  return LABEL_BY_KEY.has(key as WebsiteExamCategory) ? (key as WebsiteExamCategory) : null
}

export function websiteExamCategoryLabel(key: WebsiteExamCategory | null | undefined): string {
  if (!key) return 'All Results'
  return LABEL_BY_KEY.get(key) ?? key
}

/** Map header menu_key suffix to exam category (e.g. results_cat → cat). */
export function examCategoryFromResultsMenuKey(menuKey: string | null | undefined): WebsiteExamCategory | null {
  if (!menuKey?.startsWith('results_')) return null
  const suffix = menuKey.slice('results_'.length)
  const aliases: Record<string, WebsiteExamCategory> = {
    cat: 'cat',
    bank: 'bank',
    gate: 'gate',
    gmat: 'gmat',
    jee: 'jee',
    neet: 'neet',
    clat: 'clat',
    ipm: 'ipm',
    icet: 'icet',
  }
  return aliases[suffix] ?? null
}

export function resultsPageHref(exam?: WebsiteExamCategory | null): string {
  if (!exam) return '/results'
  return `/results?exam=${exam}`
}
