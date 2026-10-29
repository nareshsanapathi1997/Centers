'use client'

type LoadingSkeletonProps = {
  /** Number of skeleton rows/blocks. */
  rows?: number
  className?: string
  /** `table` mimics AdminDataTable loading; `cards` for dashboard grids; `line` for text. */
  variant?: 'line' | 'table' | 'cards'
}

function SkeletonBlock({ className = '' }: { className?: string }) {
  return (
    <div
      className={`animate-pulse rounded-md bg-[var(--cm-color-surface-muted)] ${className}`.trim()}
      aria-hidden
    />
  )
}

/**
 * Generic loading placeholders for kit screens.
 * Prefer AdminDataTable's built-in skeleton when rendering tables.
 */
export default function LoadingSkeleton({
  rows = 5,
  className = '',
  variant = 'line',
}: LoadingSkeletonProps) {
  if (variant === 'table') {
    return (
      <div className={`space-y-2 p-4 ${className}`.trim()} role="status" aria-label="Loading">
        <SkeletonBlock className="h-8 w-full" />
        {Array.from({ length: rows }).map((_, i) => (
          <SkeletonBlock key={i} className="h-10 w-full" />
        ))}
      </div>
    )
  }

  if (variant === 'cards') {
    return (
      <div
        className={`grid grid-cols-1 gap-4 sm:grid-cols-3 ${className}`.trim()}
        role="status"
        aria-label="Loading"
      >
        {Array.from({ length: rows }).map((_, i) => (
          <SkeletonBlock key={i} className="h-24 w-full" />
        ))}
      </div>
    )
  }

  return (
    <div className={`space-y-3 ${className}`.trim()} role="status" aria-label="Loading">
      {Array.from({ length: rows }).map((_, i) => (
        <SkeletonBlock key={i} className="h-4 w-full" />
      ))}
    </div>
  )
}
