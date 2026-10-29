'use client'

import { useMemo, useState } from 'react'
import { ArrowDown, ArrowUp, ChevronsUpDown, Inbox } from 'lucide-react'
import AdminErrorState from '@/components/admin/AdminErrorState'
import EmptyState from '@/components/ui/EmptyState'

export type AdminTableColumn<Row> = {
  /** Stable identifier, also used as the sort key. */
  key: string
  header: React.ReactNode
  render: (row: Row, index: number) => React.ReactNode
  /** Fixed column width, emitted as a <colgroup> entry. */
  width?: string
  align?: 'left' | 'center' | 'right'
  /**
   * Makes the header clickable. Return a string, number, or Date; rows sort by
   * the natural ordering of that value.
   */
  sortValue?: (row: Row) => string | number | Date | null | undefined
  /** Hidden below the `md` breakpoint, for secondary columns. */
  hideOnMobile?: boolean
  headerClassName?: string
  cellClassName?: string
}

type SortState = { key: string; direction: 'asc' | 'desc' } | null

type AdminDataTableProps<Row> = {
  columns: AdminTableColumn<Row>[]
  rows: Row[]
  rowKey: (row: Row, index: number) => string | number
  loading?: boolean
  error?: unknown
  onRetry?: () => void
  emptyMessage?: string
  emptyIcon?: React.ReactNode
  /** Extra class on <table>, for the per-screen column tuning already in CSS. */
  tableClassName?: string
  rowClassName?: (row: Row, index: number) => string | undefined
  /** Optional row click handler (e.g. open a detail panel). */
  onRowClick?: (row: Row, index: number) => void
  /** Rendered above the table when at least one row is selected. */
  selection?: {
    selectedKeys: Array<string | number>
    onChange: (keys: Array<string | number>) => void
  }
  caption?: string
  /** Number of skeleton rows while loading. */
  skeletonRows?: number
  /** Force cards on small screens (default: auto when 4+ columns). */
  mobileMode?: 'auto' | 'cards' | 'scroll'
}

const ALIGN_CLASS = {
  left: 'text-left',
  center: 'text-center',
  right: 'text-right',
} as const

function columnLabel<Row>(column: AdminTableColumn<Row>): string {
  if (typeof column.header === 'string' || typeof column.header === 'number') {
    return String(column.header)
  }
  return column.key.replace(/[_-]+/g, ' ')
}

function isActionsColumn<Row>(column: AdminTableColumn<Row>): boolean {
  return /^(action|actions)$/i.test(column.key)
}

function compare(a: unknown, b: unknown): number {
  if (a == null && b == null) return 0
  if (a == null) return 1 // nulls last regardless of direction
  if (b == null) return -1

  if (a instanceof Date || b instanceof Date) {
    return new Date(a as Date).getTime() - new Date(b as Date).getTime()
  }
  if (typeof a === 'number' && typeof b === 'number') return a - b

  return String(a).localeCompare(String(b), undefined, { numeric: true, sensitivity: 'base' })
}

/**
 * Shared table for admin list screens.
 *
 * Each screen previously hand-rolled its own <table> along with its own loading,
 * empty, and (usually missing) error branches, so the states were inconsistent
 * and sorting existed on some screens but not others. Column definitions here
 * are data, which keeps those states in one place.
 *
 * Sorting and selection are client-side and operate on the rows passed in; for
 * server-paginated screens, sort the query instead and omit `sortValue`.
 */
export default function AdminDataTable<Row>({
  columns,
  rows,
  rowKey,
  loading = false,
  error,
  onRetry,
  emptyMessage = 'No records found',
  emptyIcon: _emptyIcon,
  tableClassName = '',
  rowClassName,
  onRowClick,
  selection,
  caption,
  skeletonRows = 5,
  mobileMode = 'auto',
}: AdminDataTableProps<Row>) {
  const [sort, setSort] = useState<SortState>(null)

  // On narrow screens keep the first two columns + the last (usually actions),
  // and hide secondary middle columns unless a column opts out/in explicitly.
  const displayColumns = useMemo(
    () =>
      columns.map((column, index) => {
        if (column.hideOnMobile != null) return column
        const hideByDefault =
          columns.length > 3 && index >= 2 && index < columns.length - 1
        return hideByDefault ? { ...column, hideOnMobile: true } : column
      }),
    [columns],
  )

  const sortedRows = useMemo(() => {
    if (!sort) return rows
    const column = displayColumns.find((c) => c.key === sort.key)
    if (!column?.sortValue) return rows

    const factor = sort.direction === 'asc' ? 1 : -1
    // Copy first: sorting the prop array in place would mutate caller state.
    return [...rows].sort((a, b) => factor * compare(column.sortValue!(a), column.sortValue!(b)))
  }, [rows, sort, displayColumns])

  function toggleSort(key: string) {
    setSort((current) => {
      if (current?.key !== key) return { key, direction: 'asc' }
      if (current.direction === 'asc') return { key, direction: 'desc' }
      return null // third click clears, restoring the server's ordering
    })
  }

  const allKeys = useMemo(() => sortedRows.map(rowKey), [sortedRows, rowKey])
  const selectedSet = useMemo(
    () => new Set(selection?.selectedKeys ?? []),
    [selection?.selectedKeys],
  )
  const allSelected = allKeys.length > 0 && allKeys.every((k) => selectedSet.has(k))
  const someSelected = allKeys.some((k) => selectedSet.has(k))

  if (error) {
    return <AdminErrorState error={error} onRetry={onRetry} compact />
  }

  if (loading) {
    return (
      <div className="admin-data-table-wrap" aria-busy="true" aria-live="polite">
        <table className={`admin-data-table ${tableClassName}`}>
          <caption className="sr-only">Loading {caption || 'records'}</caption>
          <thead className="bg-gray-50 dark:bg-gray-700/60">
            <tr>
              {selection && <th style={{ width: '3rem' }} />}
              {displayColumns.map((column) => (
                <th
                  key={column.key}
                  className={`text-xs font-semibold uppercase text-gray-600 dark:text-gray-300 ${
                    ALIGN_CLASS[column.align ?? 'left']
                  } ${column.hideOnMobile ? 'hidden md:table-cell' : ''}`}
                >
                  {column.header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {Array.from({ length: skeletonRows }).map((_, rowIndex) => (
              <tr key={rowIndex}>
                {selection && <td />}
                {displayColumns.map((column) => (
                  <td
                    key={column.key}
                    className={column.hideOnMobile ? 'hidden md:table-cell' : undefined}
                  >
                    <span className="block h-4 w-full max-w-[12rem] animate-pulse rounded bg-gray-200 dark:bg-gray-700" />
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    )
  }

  if (sortedRows.length === 0) {
    return <EmptyState title="Nothing to show" message={emptyMessage} icon={Inbox} compact />
  }

  const useMobileCards =
    mobileMode === 'cards' || (mobileMode === 'auto' && displayColumns.length >= 4)
  const bodyColumns = displayColumns.filter((column) => !isActionsColumn(column))
  const actionColumns = displayColumns.filter((column) => isActionsColumn(column))
  const titleColumn = bodyColumns[0]
  const detailColumns = bodyColumns.slice(1)
  const sortableColumns = displayColumns.filter((column) => column.sortValue)

  return (
    <div className="admin-data-table-wrap">
      {useMobileCards && sortableColumns.length > 0 ? (
        <div className="admin-mobile-sort">
          <label htmlFor="admin-table-sort">Sort</label>
          <select
            id="admin-table-sort"
            className="admin-form-control"
            value={sort ? `${sort.key}:${sort.direction}` : ''}
            onChange={(event) => {
              const next = event.target.value
              if (!next) {
                setSort(null)
                return
              }
              const [key, direction] = next.split(':')
              setSort({ key, direction: direction === 'desc' ? 'desc' : 'asc' })
            }}
          >
            <option value="">Default</option>
            {sortableColumns.map((column) => (
              <option key={`${column.key}-asc`} value={`${column.key}:asc`}>
                {columnLabel(column)} ↑
              </option>
            ))}
            {sortableColumns.map((column) => (
              <option key={`${column.key}-desc`} value={`${column.key}:desc`}>
                {columnLabel(column)} ↓
              </option>
            ))}
          </select>
        </div>
      ) : null}

      {useMobileCards ? (
        <div className="admin-mobile-cards">
          {sortedRows.map((row, index) => {
            const key = rowKey(row, index)
            const selected = selectedSet.has(key)
            return (
              <article
                key={key}
                className="admin-mobile-card"
                data-selected={selected || undefined}
                onClick={onRowClick ? () => onRowClick(row, index) : undefined}
              >
                <div className="admin-mobile-card__title">
                  <span>
                    {selection ? (
                      <input
                        type="checkbox"
                        className="admin-checkbox mr-2"
                        checked={selected}
                        onChange={(e) =>
                          selection.onChange(
                            e.target.checked
                              ? [...selection.selectedKeys, key]
                              : selection.selectedKeys.filter((k) => k !== key),
                          )
                        }
                        aria-label={selected ? 'Deselect row' : 'Select row'}
                        onClick={(event) => event.stopPropagation()}
                      />
                    ) : null}
                    {titleColumn ? titleColumn.render(row, index) : `Row ${index + 1}`}
                  </span>
                </div>
                {detailColumns.length > 0 ? (
                  <dl>
                    {detailColumns.map((column) => (
                      <div key={column.key}>
                        <dt>{columnLabel(column)}</dt>
                        <dd>{column.render(row, index)}</dd>
                      </div>
                    ))}
                  </dl>
                ) : null}
                {actionColumns.length > 0 ? (
                  <div className="admin-mobile-card__actions">
                    {actionColumns.map((column) => (
                      <span key={column.key}>{column.render(row, index)}</span>
                    ))}
                  </div>
                ) : null}
              </article>
            )
          })}
        </div>
      ) : null}

      <div className={useMobileCards ? 'admin-data-table-desktop' : undefined}>
      <table
        className={`admin-data-table divide-y divide-gray-200 dark:divide-gray-700 ${tableClassName}`}
      >
        {caption && <caption className="sr-only">{caption}</caption>}

        {displayColumns.some((c) => c.width) && (
          <colgroup>
            {selection && <col style={{ width: '3rem' }} />}
            {displayColumns.map((column) => (
              <col key={column.key} style={column.width ? { width: column.width } : undefined} />
            ))}
          </colgroup>
        )}

        <thead className="bg-gray-50 dark:bg-gray-700/60">
          <tr>
            {selection && (
              <th scope="col">
                <input
                  type="checkbox"
                  checked={allSelected}
                  // Mixed state when only part of the page is selected.
                  ref={(el) => {
                    if (el) el.indeterminate = !allSelected && someSelected
                  }}
                  onChange={(e) =>
                    selection.onChange(
                      e.target.checked
                        ? Array.from(new Set([...selection.selectedKeys, ...allKeys]))
                        : selection.selectedKeys.filter((k) => !allKeys.includes(k)),
                    )
                  }
                  aria-label={allSelected ? 'Deselect all rows' : 'Select all rows'}
                  className="admin-checkbox"
                />
              </th>
            )}

            {displayColumns.map((column) => {
              const sortable = Boolean(column.sortValue)
              const active = sort?.key === column.key
              const alignClass = ALIGN_CLASS[column.align ?? 'left']

              return (
                <th
                  key={column.key}
                  scope="col"
                  aria-sort={
                    active ? (sort!.direction === 'asc' ? 'ascending' : 'descending') : undefined
                  }
                  className={`${alignClass} text-xs font-semibold uppercase text-gray-600 dark:text-gray-300 ${
                    column.hideOnMobile ? 'hidden md:table-cell' : ''
                  } ${column.headerClassName ?? ''}`}
                >
                  {sortable ? (
                    <button
                      type="button"
                      onClick={() => toggleSort(column.key)}
                      className="inline-flex items-center gap-1 uppercase hover:text-gray-900 dark:hover:text-white"
                    >
                      {column.header}
                      {active ? (
                        sort!.direction === 'asc' ? (
                          <ArrowUp className="h-3 w-3" aria-hidden />
                        ) : (
                          <ArrowDown className="h-3 w-3" aria-hidden />
                        )
                      ) : (
                        <ChevronsUpDown className="h-3 w-3 opacity-40" aria-hidden />
                      )}
                    </button>
                  ) : (
                    column.header
                  )}
                </th>
              )
            })}
          </tr>
        </thead>

        <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
          {sortedRows.map((row, index) => {
            const key = rowKey(row, index)
            const selected = selectedSet.has(key)

            return (
              <tr
                key={key}
                data-selected={selected || undefined}
                className={[rowClassName?.(row, index), onRowClick ? 'cursor-pointer' : '']
                  .filter(Boolean)
                  .join(' ')}
                onClick={onRowClick ? () => onRowClick(row, index) : undefined}
              >
                {selection && (
                  <td>
                    <input
                      type="checkbox"
                      checked={selected}
                      onChange={(e) =>
                        selection.onChange(
                          e.target.checked
                            ? [...selection.selectedKeys, key]
                            : selection.selectedKeys.filter((k) => k !== key),
                        )
                      }
                      aria-label={selected ? 'Deselect row' : 'Select row'}
                      className="admin-checkbox"
                    />
                  </td>
                )}

                {displayColumns.map((column) => (
                  <td
                    key={column.key}
                    className={`${ALIGN_CLASS[column.align ?? 'left']} ${
                      column.hideOnMobile ? 'hidden md:table-cell' : ''
                    } ${column.cellClassName ?? ''}`}
                  >
                    {column.render(row, index)}
                  </td>
                ))}
              </tr>
            )
          })}
        </tbody>
      </table>
      </div>
    </div>
  )
}
