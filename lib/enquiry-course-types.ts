import { ENROLLMENT_API_BASE_URL } from './enrollmentApiBase'

export type EnquiryCourseType = { id: number; name: string }

/**
 * Load course variants/types for a prelogin category id.
 * Used by the centre enquiry form “Select course first” dropdown.
 */
export async function getCourseTypesByCategory(
  categoryId: string | number,
): Promise<EnquiryCourseType[]> {
  const base = ENROLLMENT_API_BASE_URL
  if (!base) return []

  try {
    const response = await fetch(
      `${base}/api/courses/get-course-types-by-category/${encodeURIComponent(String(categoryId))}`,
    )
    if (!response.ok) return []
    const data = (await response.json()) as unknown
    if (!Array.isArray(data)) return []
    return data
      .map((row) => {
        if (!row || typeof row !== 'object') return null
        const obj = row as Record<string, unknown>
        const id = Number(obj.id)
        const name = String(obj.name ?? '').trim()
        if (!Number.isFinite(id) || !name) return null
        return { id, name }
      })
      .filter((row): row is EnquiryCourseType => row != null)
  } catch {
    return []
  }
}
