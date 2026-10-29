export default function AdminPageSpinner({ message = 'Loading' }: { message?: string }) {
  return (
    <div className="flex h-64 items-center justify-center">
      <div className="flex flex-col items-center gap-4" role="status" aria-live="polite">
        <div className="h-10 w-10 animate-spin rounded-full border-2 border-[var(--cm-admin-border)] border-t-[var(--cm-admin-primary)]" />
        <p className="text-sm text-[var(--cm-color-text-muted)]">{message}</p>
      </div>
    </div>
  )
}
