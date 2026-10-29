/**
 * In-center program listing links using course master category ids.
 */
export function getProgramListingHref(options: {
  centerSlug: string
  courseName: string
  categoryIdByCourseName?: Record<string, number>
  courseCategoryId?: number | null
}): { href: string; external: boolean } {
  const id =
    options.courseCategoryId ??
    options.categoryIdByCourseName?.[options.courseName] ??
    undefined

  if (id != null && Number.isFinite(id) && id > 0) {
    return {
      href: `/${options.centerSlug}/category/${id}`,
      external: false,
    }
  }

  const q = new URLSearchParams({ open: options.courseName })
  return {
    href: `/${options.centerSlug}/courses?${q.toString()}`,
    external: false,
  }
}
