'use client'

import { AlertTriangle, RefreshCw } from 'lucide-react'

type Props = {
  error?: unknown
  /** Prefer this when you already have a string message. */
  message?: string
  title?: string
  onRetry?: () => void
}

function resolveMessage(error: unknown, message?: string) {
  if (message) return message
  if (error instanceof Error) return error.message
  if (typeof error === 'string') return error
  return 'Please try again.'
}

/**
 * Student-native error/retry state using portal tokens (`sp-alert`), not admin cards.
 */
export default function StudentErrorState({
  error,
  message,
  title = 'Could not load this page',
  onRetry,
}: Props) {
  const text = resolveMessage(error, message)

  return (
    <div className="sp-alert sp-alert--error sp-error-state" role="alert">
      <div className="sp-error-state__row">
        <span className="sp-error-state__icon" aria-hidden>
          <AlertTriangle />
        </span>
        <div className="sp-error-state__copy">
          <p className="sp-error-state__title">{title}</p>
          <p className="sp-error-state__message">{text}</p>
        </div>
      </div>
      {onRetry ? (
        <button type="button" onClick={onRetry} className="sp-btn sp-btn--secondary sp-btn--sm">
          <RefreshCw aria-hidden style={{ width: 14, height: 14, marginRight: 6 }} />
          Try again
        </button>
      ) : null}
    </div>
  )
}
