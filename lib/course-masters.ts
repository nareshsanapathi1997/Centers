export type CourseMasterLevel =
  | 'main_course'
  | 'sub_variant'
  | 'course'
  | 'sub_sub_variant'
  | 'leaf_course'

export const LEVEL_LABELS: Record<CourseMasterLevel, string> = {
  main_course: 'Main Course',
  sub_variant: 'Sub Course Variant',
  course: 'Course',
  sub_sub_variant: 'Sub-Sub Variant',
  /** @deprecated Use `course` — kept for legacy DB rows only */
  leaf_course: 'Course',
}

/** URL segment under /super-admin/course-masters/[levelSlug] */
export const LEVEL_SLUGS: Record<CourseMasterLevel, string> = {
  main_course: 'main-course',
  sub_variant: 'sub-variant',
  course: 'courses',
  sub_sub_variant: 'sub-sub-variant',
  leaf_course: 'courses',
}

export const LEVEL_SLUG_TO_TYPE: Record<string, CourseMasterLevel> = {
  'main-course': 'main_course',
  'sub-variant': 'sub_variant',
  courses: 'course',
  'sub-sub-variant': 'sub_sub_variant',
  /** Legacy URL — same as courses */
  'final-courses': 'course',
}

/** Active levels shown in Super Admin navigation (single Course level). */
export const COURSE_MASTER_LEVEL_ORDER: CourseMasterLevel[] = [
  'main_course',
  'sub_variant',
  'sub_sub_variant',
  'course',
]

/**
 * Hierarchy (one Course level only):
 * Main Course → Sub Variant → Sub-Sub Variant → Course
 * Main Course → Sub Variant → Course (shortcut)
 */
export const ALLOWED_CHILD_LEVELS: Record<CourseMasterLevel, CourseMasterLevel[]> = {
  main_course: ['sub_variant'],
  sub_variant: ['sub_sub_variant', 'course'],
  sub_sub_variant: ['course'],
  course: [],
  leaf_course: [],
}

/** @deprecated Use ALLOWED_CHILD_LEVELS */
export const ALLOWED_CHILD_LEVEL: Record<CourseMasterLevel, CourseMasterLevel | null> = {
  main_course: 'sub_variant',
  sub_variant: 'sub_sub_variant',
  course: null,
  sub_sub_variant: 'course',
  leaf_course: null,
}

export const ALLOWED_PARENT_LEVELS: Record<CourseMasterLevel, CourseMasterLevel[]> = {
  main_course: [],
  sub_variant: ['main_course'],
  sub_sub_variant: ['sub_variant'],
  course: ['sub_variant', 'sub_sub_variant'],
  leaf_course: ['sub_sub_variant'],
}

/** @deprecated Use ALLOWED_PARENT_LEVELS */
export const REQUIRED_PARENT_LEVEL: Record<CourseMasterLevel, CourseMasterLevel | null> = {
  main_course: null,
  sub_variant: 'main_course',
  course: 'sub_variant',
  sub_sub_variant: 'sub_variant',
  leaf_course: 'sub_sub_variant',
}

export function courseMasterLevelFromSlug(slug: string): CourseMasterLevel | null {
  return LEVEL_SLUG_TO_TYPE[slug] ?? null
}

export function courseMasterHref(level: CourseMasterLevel, parentId?: number | null): string {
  const slug = LEVEL_SLUGS[level] ?? LEVEL_SLUGS.course
  const base = `/super-admin/course-masters/${slug}`
  if (parentId != null && parentId > 0) {
    return `${base}?parent=${parentId}`
  }
  return base
}

export function isDetailLevel(level: CourseMasterLevel): boolean {
  return level === 'course' || level === 'leaf_course'
}

export function getChildLevels(level: CourseMasterLevel): CourseMasterLevel[] {
  return ALLOWED_CHILD_LEVELS[level] ?? []
}

export function getParentLevels(level: CourseMasterLevel): CourseMasterLevel[] {
  return ALLOWED_PARENT_LEVELS[level] ?? []
}

/** Label for the parent picker on create/edit forms (e.g. "Main Course" for sub_variant). */
export function getParentFieldLabel(level: CourseMasterLevel): string {
  const parents = ALLOWED_PARENT_LEVELS[level] ?? []
  if (parents.length === 0) return 'Parent'
  if (parents.length === 1) return LEVEL_LABELS[parents[0]]
  return parents.map((p) => LEVEL_LABELS[p]).join(' / ')
}

export function slugify(text: string): string {
  return text
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, '')
    .replace(/[\s_]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
}

export interface CourseMasterRow {
  id: number
  parent_id: number | null
  level_type: CourseMasterLevel
  title: string
  slug: string
  short_description?: string | null
  detailed_description?: string | null
  image_url?: string | null
  brochure_url?: string | null
  syllabus_html?: string | null
  syllabus_pdf_url?: string | null
  demo_class_link?: string | null
  highlights?: unknown
  features?: unknown
  learning_outcomes?: unknown
  eligibility_criteria?: unknown
  duration?: string | null
  mode?: string | null
  price?: number | null
  discount_percent?: number | null
  discount_amount?: number | null
  coupon_code?: string | null
  coupon_enabled?: boolean
  installment_config?: unknown
  enrollment_validity_days?: number | null
  meta_title?: string | null
  meta_description?: string | null
  display_order: number
  is_active: boolean
  created_at?: string
  updated_at?: string
  children?: CourseMasterRow[]
}

export function buildCourseMasterTree(rows: CourseMasterRow[]): CourseMasterRow[] {
  const map = new Map<number, CourseMasterRow>()
  const roots: CourseMasterRow[] = []

  rows.forEach((row) => {
    map.set(row.id, { ...row, children: [] })
  })

  map.forEach((node) => {
    if (node.parent_id && map.has(node.parent_id)) {
      map.get(node.parent_id)!.children!.push(node)
    } else if (!node.parent_id) {
      roots.push(node)
    }
  })

  const sortNodes = (nodes: CourseMasterRow[]) => {
    nodes.sort((a, b) => a.display_order - b.display_order || a.title.localeCompare(b.title))
    nodes.forEach((n) => n.children?.length && sortNodes(n.children))
  }
  sortNodes(roots)
  return roots
}

export function flattenCourseMasterTree(
  nodes: CourseMasterRow[],
  depth = 0
): Array<CourseMasterRow & { depth: number }> {
  const result: Array<CourseMasterRow & { depth: number }> = []
  for (const node of nodes) {
    result.push({ ...node, depth })
    if (node.children?.length) {
      result.push(...flattenCourseMasterTree(node.children, depth + 1))
    }
  }
  return result
}
