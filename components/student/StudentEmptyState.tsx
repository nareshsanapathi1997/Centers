import type { LucideIcon } from 'lucide-react'
import type { ReactNode } from 'react'
import Link from 'next/link'

type Props = {
  icon: LucideIcon
  title?: string
  message: string
  actionHref?: string
  actionLabel?: string
  children?: ReactNode
}

export default function StudentEmptyState({
  icon: Icon,
  title,
  message,
  actionHref,
  actionLabel,
  children,
}: Props) {
  return (
    <div className="sp-empty">
      <span className="sp-empty__icon" aria-hidden>
        <Icon />
      </span>
      {title ? <p className="sp-empty__title">{title}</p> : null}
      <p className="sp-empty__text">{message}</p>
      {actionHref && actionLabel ? (
        <Link href={actionHref} className="sp-empty__link">
          {actionLabel}
        </Link>
      ) : null}
      {children}
    </div>
  )
}
