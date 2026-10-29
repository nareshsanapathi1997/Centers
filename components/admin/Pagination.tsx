'use client'

import { ChevronLeft, ChevronRight } from 'lucide-react'
import AdminButton from './AdminButton'

interface PaginationProps {
  currentPage: number
  totalPages: number
  totalItems: number
  itemsPerPage: number
  startIndex: number
  endIndex: number
  onPageChange: (page: number) => void
}

export default function Pagination({
  currentPage,
  totalPages,
  totalItems,
  startIndex,
  endIndex,
  onPageChange,
}: PaginationProps) {
  if (totalPages <= 1) return null

  const goToPage = (page: number) => {
    if (page >= 1 && page <= totalPages) {
      onPageChange(page)
      window.scrollTo({ top: 0, behavior: 'smooth' })
    }
  }

  return (
    <div className="px-6 py-4 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-700/50">
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="text-sm text-gray-700 dark:text-gray-300">
          Showing <span className="font-semibold">{startIndex + 1}</span> to{' '}
          <span className="font-semibold">{Math.min(endIndex, totalItems)}</span> of{' '}
          <span className="font-semibold">{totalItems}</span> results
        </div>
        <div className="admin-pagination admin-btn-group">
          <AdminButton
            variant="secondary"
            size="sm"
            onClick={() => goToPage(currentPage - 1)}
            disabled={currentPage === 1}
            className="admin-btn--page"
            icon={<ChevronLeft />}
          >
            Previous
          </AdminButton>

          <div className="admin-btn-group">
            {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => {
              if (
                page === 1 ||
                page === totalPages ||
                (page >= currentPage - 1 && page <= currentPage + 1)
              ) {
                return (
                  <AdminButton
                    key={page}
                    variant="secondary"
                    size="sm"
                    onClick={() => goToPage(page)}
                    active={currentPage === page}
                    className={`admin-btn--page ${currentPage === page ? 'admin-btn--active' : ''}`}
                  >
                    {page}
                  </AdminButton>
                )
              }

              if (page === currentPage - 2 || page === currentPage + 2) {
                return (
                  <span key={page} className="px-1 text-sm text-gray-500 dark:text-gray-400">
                    ...
                  </span>
                )
              }

              return null
            })}
          </div>

          <AdminButton
            variant="secondary"
            size="sm"
            onClick={() => goToPage(currentPage + 1)}
            disabled={currentPage === totalPages}
            className="admin-btn--page"
            trailingIcon={<ChevronRight />}
          >
            Next
          </AdminButton>
        </div>
      </div>
    </div>
  )
}
