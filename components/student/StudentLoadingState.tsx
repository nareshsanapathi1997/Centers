type Props = {
  /** Accessible label for the loading region. */
  label?: string
  /** Number of skeleton blocks. */
  rows?: number
  className?: string
  /** Compact height for nested sections (e.g. sessions list). */
  compact?: boolean
}

/**
 * Consistent student portal loading placeholder using `sp-skeleton`.
 */
export default function StudentLoadingState({
  label = 'Loading',
  rows = 1,
  className = '',
  compact = false,
}: Props) {
  return (
    <div
      className={`sp-loading ${className}`.trim()}
      role="status"
      aria-busy="true"
      aria-label={label}
    >
      {Array.from({ length: Math.max(1, rows) }).map((_, i) => (
        <div
          key={i}
          className="sp-skeleton"
          style={compact ? { height: 64 } : undefined}
        />
      ))}
    </div>
  )
}
