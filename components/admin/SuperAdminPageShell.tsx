import AdminPageSpinner from '@/components/admin/AdminPageSpinner'
import AdminErrorState from '@/components/admin/AdminErrorState'

type SuperAdminPageShellProps = {
  loading?: boolean
  loadingMessage?: string
  /** Renders a retryable error state instead of `children` when set. */
  error?: unknown
  onRetry?: () => void
  children: React.ReactNode
}

/** In-page loading and error states only — chrome comes from app/super-admin/layout.tsx */
export default function SuperAdminPageShell({
  loading = false,
  loadingMessage,
  error,
  onRetry,
  children,
}: SuperAdminPageShellProps) {
  if (loading) {
    return <AdminPageSpinner message={loadingMessage} />
  }

  if (error) {
    return <AdminErrorState error={error} onRetry={onRetry} />
  }

  return <>{children}</>
}
