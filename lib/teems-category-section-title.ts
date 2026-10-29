import { teemsCityFromCenterSlug } from '@/lib/center-mssql-city'

/** e.g. `CAT / MBA` → `CAT & MBA` */
export function normalizeCategoryDisplayName(name: string): string {
  return name
    .replace(/\s*\/\s*/g, ' & ')
    .replace(/\s+/g, ' ')
    .trim()
}

/**
 * Category listing heading, e.g.
 * `EduSphere Chennai – CAT & MBA Coaching Programs`
 */
export function buildTeemsCategorySectionTitle(
  centerSlug: string,
  categoryName: string | null | undefined
): string {
  const city = teemsCityFromCenterSlug(centerSlug)
  const timePrefix = `EduSphere ${city}`

  const raw = normalizeCategoryDisplayName(categoryName?.trim() || '')
  if (!raw || /^courses?$/i.test(raw)) {
    return `${timePrefix} – Coaching Programs`
  }

  let category = raw
  if (/coaching programs?$/i.test(category)) {
    // already complete
  } else if (/programs?$/i.test(category)) {
    category = category.replace(/\s*programs?$/i, ' Coaching Programs')
  } else {
    category = `${category} Coaching Programs`
  }

  return `${timePrefix} – ${category}`
}
