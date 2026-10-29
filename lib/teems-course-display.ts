/** Display helpers for TEEMS course rows on category listings. */

/** Prelogin catalog type id from `courses.type` column. */
export function resolveCatalogCourseTypeId(course: Record<string, unknown>): number | null {
  return parsePositiveInt(course.type)
}

/** Prelogin catalog sub-type id from `courses.course_sub_type_id`. */
export function resolveCatalogCourseSubTypeId(course: Record<string, unknown>): number | null {
  return parsePositiveInt(course.course_sub_type_id)
}

export function resolveCourseTypeLabel(
  course: Record<string, unknown>,
  typeNameById: Map<number, string>
): string {
  const catalogTypeId = resolveCatalogCourseTypeId(course)
  if (catalogTypeId !== null) {
    const fromCatalog = typeNameById.get(catalogTypeId)
    if (fromCatalog) return fromCatalog
  }

  const typeValue =
    parsePositiveInt(course.mapped_type_id) ??
    parsePositiveInt(course.type_id) ??
    parsePositiveInt(course.type)

  if (typeValue !== null) {
    const fromId = typeNameById.get(typeValue)
    if (fromId) return fromId
  }

  const variant = stringField(course.variant)
  if (variant) return variant

  const typeStr = stringField(course.type)
  if (typeStr && !/^\d+$/.test(typeStr)) return typeStr

  return stringField(course.type_name)
}

function stringField(v: unknown): string {
  if (v == null || v === 'null') return ''
  return String(v).trim()
}

export function parsePositiveInt(value: unknown): number | null {
  if (value == null) return null
  const n = Number.parseInt(String(value), 10)
  return Number.isFinite(n) && n > 0 ? n : null
}

export type CoursePriceFields = {
  originalPrice: string
  discountedPrice: string
  offerDetails: string
}

export function resolveCoursePriceFields(course: Record<string, unknown>): CoursePriceFields {
  return {
    originalPrice: stringField(course.originalPrice) || stringField(course.original_price),
    discountedPrice: stringField(course.discountedPrice) || stringField(course.discounted_price),
    offerDetails: stringField(course.offer_details),
  }
}

export function hasValidCoursePrice(price: string): boolean {
  return price !== '' && price !== '0'
}

export function shouldShowStrikethroughOriginal(originalPrice: string, discountedPrice: string): boolean {
  if (!hasValidCoursePrice(originalPrice) || !hasValidCoursePrice(discountedPrice)) return false
  const original = Number.parseFloat(originalPrice)
  const discounted = Number.parseFloat(discountedPrice)
  return Number.isFinite(original) && Number.isFinite(discounted) && original > discounted
}

export function resolveDiscountText(originalPrice: string, discountedPrice: string, offerDetails: string): string {
  if (offerDetails) return offerDetails
  if (!shouldShowStrikethroughOriginal(originalPrice, discountedPrice)) return ''
  const original = Number.parseFloat(originalPrice)
  const discounted = Number.parseFloat(discountedPrice)
  const pct = Math.round(((original - discounted) / original) * 100)
  return pct > 0 ? `${pct}% OFF` : ''
}

export function courseMatchesTypeFilter(
  course: Record<string, unknown>,
  selectedTypeId: number,
  typeNameById: Map<number, string>
): boolean {
  // Match prelogin Courses.jsx: filter by catalog `courses.type` id → type name
  const catalogTypeId = resolveCatalogCourseTypeId(course)
  if (catalogTypeId !== null) {
    return catalogTypeId === selectedTypeId
  }

  const mappedTypeIds = Array.isArray(course.mapped_type_ids)
    ? (course.mapped_type_ids as unknown[])
        .map((v) => parsePositiveInt(v))
        .filter((v): v is number => v !== null)
    : []
  if (mappedTypeIds.length > 0) {
    return mappedTypeIds.includes(selectedTypeId)
  }

  const mappedTypeId = parsePositiveInt(course.mapped_type_id)
  const courseTypeId =
    mappedTypeId ?? parsePositiveInt(course.type_id) ?? parsePositiveInt(course.type)
  if (courseTypeId === selectedTypeId) {
    return true
  }

  const selectedTypeName = (typeNameById.get(selectedTypeId) ?? '').trim().toLowerCase()
  const rowDisplayType = resolveCourseTypeLabel(course, typeNameById).trim().toLowerCase()
  if (selectedTypeName && rowDisplayType) {
    return rowDisplayType === selectedTypeName
  }

  return false
}

export function courseMatchesSubTypeFilter(
  course: Record<string, unknown>,
  selectedSubTypeId: number
): boolean {
  const catalogTypeId = resolveCatalogCourseTypeId(course)
  if (catalogTypeId !== null) {
    const catalogSubTypeId = resolveCatalogCourseSubTypeId(course)
    if (catalogSubTypeId === null) return false
    return catalogSubTypeId === selectedSubTypeId
  }

  const mappedSubTypeIds = Array.isArray(course.mapped_sub_type_ids)
    ? (course.mapped_sub_type_ids as unknown[])
        .map((v) => parsePositiveInt(v))
        .filter((v): v is number => v !== null)
    : []
  if (mappedSubTypeIds.length > 0) {
    return mappedSubTypeIds.includes(selectedSubTypeId)
  }

  const subTypeId =
    parsePositiveInt(course.mapped_sub_type_id) ?? parsePositiveInt(course.course_sub_type_id)
  return subTypeId === selectedSubTypeId
}

/** Classroom & Online Live first within a category (matches prelogin AllCoursesPage). */
export function sortTeemsCoursesForDisplay(
  courses: Record<string, unknown>[],
  categoryName?: string | null
): Record<string, unknown>[] {
  const isCatMba = (cat: string) => /cat\s*\/\s*mba/i.test(cat)
  const isPriorityType = (label: string) =>
    /classroom/i.test(label) || /online\s*live/i.test(label)

  return [...courses].sort((a, b) => {
    const cat = (categoryName ?? '').toString()
    const labelA = resolveCourseTypeLabel(a, new Map())
    const labelB = resolveCourseTypeLabel(b, new Map())
    const isPrioA = isCatMba(cat) && isPriorityType(labelA)
    const isPrioB = isCatMba(cat) && isPriorityType(labelB)
    if (isPrioA !== isPrioB) return isPrioA ? -1 : 1

    const priceA =
      Number.parseFloat(String(a.discounted_price ?? a.discountedPrice ?? '')) ||
      Number.parseFloat(String(a.original_price ?? a.originalPrice ?? '')) ||
      0
    const priceB =
      Number.parseFloat(String(b.discounted_price ?? b.discountedPrice ?? '')) ||
      Number.parseFloat(String(b.original_price ?? b.originalPrice ?? '')) ||
      0
    return priceB - priceA
  })
}
