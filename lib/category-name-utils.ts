/** Shared name normalization for course master matching (no DB — safe for client bundles). */
export function normCourseCategoryName(s: string): string {
  return s.trim().toLowerCase().replace(/\s+/g, ' ')
}

export type CategoryRef = {
  id: number
  course_name: string
}

function tokenizeCategoryName(name: string): string[] {
  return normCourseCategoryName(name)
    .split(/[\s&/+\-,]+/)
    .map((t) => t.trim())
    .filter(Boolean)
}

/** Higher score = closer match between center course name and main course title. */
export function scoreCategoryNameMatch(assignedName: string, courseName: string): number {
  const want = normCourseCategoryName(assignedName)
  const cat = normCourseCategoryName(courseName)
  if (!want || !cat) return 0
  if (want === cat) return 100
  if (cat.includes(want) || want.includes(cat)) return 85

  const wantTokens = tokenizeCategoryName(assignedName)
  const catTokens = new Set(tokenizeCategoryName(courseName))
  if (wantTokens.length === 0) return 0

  let overlap = 0
  for (const token of wantTokens) {
    if (catTokens.has(token)) overlap++
  }
  if (overlap === 0) return 0

  const ratio = overlap / wantTokens.length
  return 40 + Math.round(ratio * 40)
}

function leafCountFor(
  categoryId: number,
  leafCountByCategoryId?: Map<number, number> | Record<number, number>
): number {
  if (!leafCountByCategoryId) return 0
  if (leafCountByCategoryId instanceof Map) return leafCountByCategoryId.get(categoryId) ?? 0
  return leafCountByCategoryId[categoryId] ?? 0
}

function isBetterCategoryMatch(
  next: { id: number; score: number; count: number },
  best: { id: number; score: number; count: number }
): boolean {
  if (next.count > 0 && best.count === 0 && next.score >= 70) return true
  if (next.score > best.score) return true
  if (next.score === best.score && next.count > best.count) return true
  return false
}

/**
 * Pick the best main course for a center-assigned name.
 * When an exact title match has no programs, prefers a close match that has catalog courses.
 */
export function resolveBestCategoryIdForAssignedName(
  assignedName: string,
  allCategories: CategoryRef[],
  leafCountByCategoryId?: Map<number, number> | Record<number, number>
): number | undefined {
  const want = normCourseCategoryName(assignedName)
  if (!want || allCategories.length === 0) return undefined

  let best: { id: number; score: number; count: number } | null = null

  for (const cat of allCategories) {
    const score = scoreCategoryNameMatch(assignedName, cat.course_name)
    if (score === 0) continue
    const candidate = {
      id: cat.id,
      score,
      count: leafCountFor(cat.id, leafCountByCategoryId),
    }
    if (!best || isBetterCategoryMatch(candidate, best)) {
      best = candidate
    }
  }

  return best?.id
}

/**
 * Map a center-assigned course name (e.g. "CAT", "Bank Exams") to `course_masters.id` (main_course).
 */
export function resolveCategoryIdForAssignedName(
  assignedName: string,
  allCategories: CategoryRef[],
  leafCountByCategoryId?: Map<number, number> | Record<number, number>
): number | undefined {
  return resolveBestCategoryIdForAssignedName(assignedName, allCategories, leafCountByCategoryId)
}

/** Resolve category id from map returned by server-side `getCourseCategoryIdsByCourseNames`. */
export function getCategoryIdForCourseName(
  idByName: Record<string, number> | undefined,
  courseName: string,
  allCategories?: CategoryRef[]
): number | undefined {
  if (!courseName) return undefined

  if (idByName?.[courseName] != null && Number.isFinite(idByName[courseName])) {
    return idByName[courseName]
  }
  const want = normCourseCategoryName(courseName)
  if (idByName) {
    for (const [k, v] of Object.entries(idByName)) {
      if (Number.isFinite(v) && normCourseCategoryName(k) === want) return v
    }
  }

  if (allCategories?.length) {
    return resolveCategoryIdForAssignedName(courseName, allCategories)
  }

  return undefined
}
