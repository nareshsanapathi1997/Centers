import AdminPageSpinner from '@/components/admin/AdminPageSpinner'
import AdminErrorState from '@/components/admin/AdminErrorState'

type AdminPageShellProps = {
  loading?: boolean
  loadingMessage?: string
  /** Renders a retryable error state instead of `children` when set. */
  error?: unknown
  onRetry?: () => void
  children: React.ReactNode
}

/** In-page loading and error states only — chrome comes from app/admin/[centerId]/layout.tsx */
export default function AdminPageShell({
  loading = false,
  loadingMessage,
  error,
  onRetry,
  children,
}: AdminPageShellProps) {
  if (loading) {
    return <AdminPageSpinner message={loadingMessage} />
  }

  // Error takes precedence over children: a partially rendered page built from
  // missing data is more confusing than an explicit failure.
  if (error) {
    return <AdminErrorState error={error} onRetry={onRetry} />
  }

  return <>{children}</>
}
