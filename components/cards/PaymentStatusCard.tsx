import type { ReactNode } from 'react'

type PaymentStatus = 'pending' | 'paid' | 'failed' | 'completed' | 'unpaid' | string

type PaymentStatusCardProps = {
  title: string
  amount: ReactNode
  status: PaymentStatus
  meta?: ReactNode
  action?: ReactNode
  className?: string
}

function statusClass(status: PaymentStatus) {
  if (status === 'completed' || status === 'paid') return 'cm-status cm-status--ok'
  if (status === 'pending' || status === 'unpaid') return 'cm-status cm-status--warn'
  if (status === 'failed') return 'cm-status cm-status--danger'
  return 'cm-status'
}

/** Fee / installment / receipt card — presentation only. */
export default function PaymentStatusCard({
  title,
  amount,
  status,
  meta,
  action,
  className = '',
}: PaymentStatusCardProps) {
  return (
    <article className={`admin-card cm-card-hover flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between ${className}`.trim()}>
      <div className="min-w-0">
        <div className="flex flex-wrap items-center gap-2">
          <h3 className="font-semibold text-[var(--cm-color-text)]">{title}</h3>
          <span className={statusClass(status)}>{status}</span>
        </div>
        {meta ? <div className="mt-1 text-sm text-[var(--cm-color-text-muted)]">{meta}</div> : null}
      </div>
      <div className="flex shrink-0 flex-wrap items-center gap-3">
        <p className="font-display text-xl font-semibold text-[var(--cm-color-text)]">{amount}</p>
        {action}
      </div>
    </article>
  )
}
