import { getProgramListingHref } from '@/lib/category-listing-link'
import { withBasePathHref } from '@/lib/with-base-path'

function str(v: unknown): string {
  if (v == null || v === 'null') return ''
  return String(v).trim()
}

export function buildTeemsProgramDetailLink(
  course: Record<string, unknown>,
  centerSlug: string,
): { href: string; external: boolean } {
  const id = course.id
  const slug = str(course.slug)
  // Main company site (no centre in the URL): go to the brand-level page with the centre picker.
  if (!centerSlug) {
    if (slug) return { href: `/courses/program/${encodeURIComponent(slug)}`, external: false }
    if (id != null && Number.isFinite(Number(id))) return { href: `/courses/program/${id}`, external: false }
    return { href: '/contact', external: false }
  }
  if (slug) {
    return { href: `/${centerSlug}/program/${encodeURIComponent(slug)}`, external: false }
  }
  if (id != null && Number.isFinite(Number(id))) {
    return { href: `/${centerSlug}/program/${id}`, external: false }
  }
  return { href: `/${centerSlug}/contact`, external: false }
}

export function buildTeemsProgramEnrollLink(
  course: Record<string, unknown>,
  _catalogBaseUrl: string | null = null,
  contactPath?: string,
  centerSlug?: string,
): { href: string; external: boolean } {
  const slug = str(course.slug)
  if (!centerSlug && slug) {
    return { href: `/courses/program/${encodeURIComponent(slug)}#centres`, external: false }
  }
  if (centerSlug && slug) {
    return { href: `/${centerSlug}/payment/${encodeURIComponent(slug)}`, external: false }
  }
  const link = str(course.enrollment_link || course.demo_class_link)
  if (link.startsWith('http')) {
    return { href: link, external: true }
  }
  if (link.startsWith('/')) {
    return { href: withBasePathHref(link), external: false }
  }
  return { href: contactPath || '/contact', external: false }
}

export function buildTeemsProgramListingLink(options: {
  centerSlug: string
  courseName: string
  categoryIdByCourseName?: Record<string, number>
  courseCategoryId?: number | null
}): { href: string; external: boolean } {
  return getProgramListingHref({
    centerSlug: options.centerSlug,
    courseName: options.courseName,
    categoryIdByCourseName: options.categoryIdByCourseName,
    courseCategoryId: options.courseCategoryId,
  })
}
