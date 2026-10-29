import { PRELOGIN_API_BASE_URL } from '@/lib/prelogin-api-base'
import { withBasePathHref } from '@/lib/with-base-path'
import {
  resolveCoursePriceFields,
  resolveCourseTypeLabel,
} from '@/lib/teems-course-display'

function resolveCourseImageUrl(
  course: Record<string, unknown>,
): string | null {
  const raw = course.image_url ?? course.image
  if (raw == null || raw === '') return null
  const s = String(raw).trim()
  if (s.startsWith('http://') || s.startsWith('https://')) return s
  return withBasePathHref(s)
}

export type CourseFeatureRow = {
  id?: number
  course_id?: number
  feature: string
}

export type TeemsCompareCourse = {
  id: number
  title: string
  typeLabel: string
  imageUrl: string | null
  originalPrice: string
  discountedPrice: string
  offerDetails: string
  courseRecord: Record<string, unknown>
}

function str(v: unknown): string {
  if (v == null || v === 'null') return ''
  return String(v).trim()
}

export function parseCompareCourseId(value: unknown): number | null {
  if (value == null || value === 'null') return null
  const n = Number.parseInt(String(value), 10)
  return Number.isFinite(n) && n > 0 ? n : null
}

export function buildTeemsCompareCourses(
  courses: Record<string, unknown>[],
  typeNameById: Map<number, string>,
  categoryId: number | null,
): TeemsCompareCourse[] {
  const out: TeemsCompareCourse[] = []

  for (const course of courses) {
    const id = parseCompareCourseId(course.id)
    if (id === null) continue

    const { originalPrice, discountedPrice, offerDetails } = resolveCoursePriceFields(course)
    const title = str(course.title) || 'Untitled Course'
    const image = resolveCourseImageUrl(course)

    const courseRecord: Record<string, unknown> = {
      ...course,
      category_id: course.category_id ?? categoryId ?? course.course_category_id,
      course_category_id: course.course_category_id ?? categoryId ?? course.category_id,
    }

    out.push({
      id,
      title,
      typeLabel: resolveCourseTypeLabel(courseRecord, typeNameById),
      imageUrl: image ?? null,
      originalPrice,
      discountedPrice,
      offerDetails,
      courseRecord,
    })
  }

  return out
}

export async function fetchCourseFeaturesByIds(
  courseIds: number[]
): Promise<Record<number, CourseFeatureRow[]>> {
  const base = PRELOGIN_API_BASE_URL
  if (!base || courseIds.length === 0) return {}

  const features: Record<number, CourseFeatureRow[]> = {}

  const results = await Promise.all(
    courseIds.map(async (courseId) => {
      try {
        const response = await fetch(`${base}/api/courses/get-course-features/${courseId}`)
        if (!response.ok) return { courseId, rows: [] as CourseFeatureRow[] }
        const data = (await response.json()) as CourseFeatureRow[]
        return { courseId, rows: Array.isArray(data) ? data : [] }
      } catch {
        return { courseId, rows: [] as CourseFeatureRow[] }
      }
    })
  )

  for (const { courseId, rows } of results) {
    features[courseId] = rows
  }

  return features
}
