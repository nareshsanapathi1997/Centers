'use client'

import { AlertTriangle, RefreshCw } from 'lucide-react'

type AdminErrorStateProps = {
  error: unknown
  /** Omit to hide the retry button (e.g. when the failure is not transient). */
  onRetry?: () => void
  title?: string
  compact?: boolean
}

/**
 * Failed-load state for admin screens.
 *
 * `useAdminFetch` has always returned an `error`, but no page rendered it — a
 * failed request left an empty table that was indistinguishable from "no data",
 * so users retried by reloading the whole page.
 */
export default function AdminErrorState({
  error,
  onRetry,
  title = 'Could not load this data',
  compact = false,
}: AdminErrorStateProps) {
  const message =
    error instanceof Error
      ? error.message
      : typeof error === 'string'
        ? error
        : 'An unexpected error occurred.'

  return (
    <div
      role="alert"
      className={`flex flex-col items-center justify-center gap-3 text-center ${
        compact ? 'p-6' : 'p-10'
      }`}
    >
      <span className="flex h-12 w-12 items-center justify-center rounded-full bg-red-50 text-red-600 dark:bg-red-900/30 dark:text-red-400">
        <AlertTriangle className="h-6 w-6" aria-hidden />
      </span>

      <div>
        <p className="font-semibold text-gray-900 dark:text-white">{title}</p>
        <p className="mt-1 max-w-md text-sm text-gray-600 dark:text-gray-400">{message}</p>
      </div>

      {onRetry && (
        <button type="button" onClick={onRetry} className="admin-btn admin-btn--primary admin-btn--sm">
          <RefreshCw className="h-4 w-4" aria-hidden />
          Try again
        </button>
      )}
    </div>
  )
}
