'use client'

import type { LucideIcon } from 'lucide-react'
import type { ReactNode } from 'react'
import { Inbox } from 'lucide-react'

type EmptyStateProps = {
  title?: string
  message: string
  icon?: LucideIcon
  action?: ReactNode
  className?: string
  compact?: boolean
}

/**
 * Shared empty state for admin/student kit surfaces.
 * Student-specific empty UI remains in `StudentEmptyState` (portal CSS).
 */
export default function EmptyState({
  title = 'Nothing here yet',
  message,
  icon: Icon = Inbox,
  action,
  className = '',
  compact = false,
}: EmptyStateProps) {
  return (
    <div
      className={`flex flex-col items-center justify-center gap-3 text-center ${
        compact ? 'p-6' : 'p-10'
      } ${className}`.trim()}
    >
      <span className="flex h-12 w-12 items-center justify-center rounded-md bg-[var(--cm-color-surface-muted)] text-[var(--cm-color-text-muted)]">
        <Icon className="h-10 w-10" aria-hidden />
      </span>
      <div>
        <p className="font-semibold text-[var(--cm-color-text)]">{title}</p>
        <p className="mt-1 max-w-md text-sm text-[var(--cm-color-text-muted)]">{message}</p>
      </div>
      {action}
    </div>
  )
}
