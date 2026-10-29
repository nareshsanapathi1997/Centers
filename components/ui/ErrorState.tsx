'use client'

import AdminErrorState from '@/components/admin/AdminErrorState'

type ErrorStateProps = {
  error: unknown
  onRetry?: () => void
  title?: string
  compact?: boolean
}

/**
 * Shared error state — reuses AdminErrorState so admin + kit stay consistent.
 */
export default function ErrorState(props: ErrorStateProps) {
  return <AdminErrorState {...props} />
}
