import Link from 'next/link'

function hrefForPage(
  slug: string,
  categoryId: string,
  page: number,
  selectedType: string,
  selectedSubType: string
): string {
  const base = `/${slug}/category/${categoryId}`
  const params = new URLSearchParams()
  if (page > 1) params.set('page', String(page))
  if (selectedType) params.set('type', selectedType)
  if (selectedSubType) params.set('subtype', selectedSubType)
  const query = params.toString()
  return query ? `${base}?${query}` : base
}

function pageItems(current: number, total: number): (number | 'gap')[] {
  if (total <= 9) {
    return Array.from({ length: total }, (_, i) => i + 1)
  }
  const set = new Set<number>()
  set.add(1)
  set.add(total)
  for (let p = current - 2; p <= current + 2; p++) {
    if (p >= 1 && p <= total) set.add(p)
  }
  const sorted = Array.from(set).sort((a, b) => a - b)
  const out: (number | 'gap')[] = []
  for (let i = 0; i < sorted.length; i++) {
    if (i > 0 && sorted[i] - sorted[i - 1] > 1) out.push('gap')
    out.push(sorted[i])
  }
  return out
}

export default function CategoryCoursesPagination({
  slug,
  categoryId,
  currentPage,
  totalPages,
  selectedType = '',
  selectedSubType = '',
  onPageChange,
}: {
  slug: string
  categoryId: string
  currentPage: number
  totalPages: number
  selectedType?: string
  selectedSubType?: string
  /** Client-side pagination — avoids full page reload when filtering. */
  onPageChange?: (page: number) => void
}) {
  if (totalPages <= 1) return null

  const items = pageItems(currentPage, totalPages)
  const clientMode = Boolean(onPageChange)

  const goToPage = (page: number) => {
    if (clientMode) {
      onPageChange!(page)
      return
    }
  }

  return (
    <nav aria-label="Course pages" className="mt-4 d-flex justify-content-center flex-wrap">
      <ul className="pagination mb-0 flex-wrap">
        <li className={`page-item ${currentPage <= 1 ? 'disabled' : ''}`}>
          {currentPage <= 1 ? (
            <span className="page-link">Previous</span>
          ) : clientMode ? (
            <button type="button" className="page-link" onClick={() => goToPage(currentPage - 1)}>
              Previous
            </button>
          ) : (
            <Link
              className="page-link"
              href={hrefForPage(slug, categoryId, currentPage - 1, selectedType, selectedSubType)}
            >
              Previous
            </Link>
          )}
        </li>
        {items.map((item, idx) =>
          item === 'gap' ? (
            <li key={`gap-${idx}`} className="page-item disabled">
              <span className="page-link">…</span>
            </li>
          ) : (
            <li key={item} className={`page-item ${item === currentPage ? 'active' : ''}`}>
              {clientMode ? (
                <button
                  type="button"
                  className="page-link"
                  onClick={() => goToPage(item)}
                  aria-current={item === currentPage ? 'page' : undefined}
                >
                  {item}
                </button>
              ) : (
                <Link
                  className="page-link"
                  href={hrefForPage(slug, categoryId, item, selectedType, selectedSubType)}
                >
                  {item}
                </Link>
              )}
            </li>
          )
        )}
        <li className={`page-item ${currentPage >= totalPages ? 'disabled' : ''}`}>
          {currentPage >= totalPages ? (
            <span className="page-link">Next</span>
          ) : clientMode ? (
            <button type="button" className="page-link" onClick={() => goToPage(currentPage + 1)}>
              Next
            </button>
          ) : (
            <Link
              className="page-link"
              href={hrefForPage(slug, categoryId, currentPage + 1, selectedType, selectedSubType)}
            >
              Next
            </Link>
          )}
        </li>
      </ul>
    </nav>
  )
}
