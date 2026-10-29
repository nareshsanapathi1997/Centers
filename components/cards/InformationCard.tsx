import type { LucideIcon } from 'lucide-react'
import type { ReactNode } from 'react'

type InformationCardProps = {
  title: string
  children: ReactNode
  icon?: LucideIcon
  footer?: ReactNode
  eyebrow?: string
  className?: string
}

/** Editorial / detail card for nested content blocks. */
export default function InformationCard({
  title,
  children,
  icon: Icon,
  footer,
  eyebrow,
  className = '',
}: InformationCardProps) {
  return (
    <article className={`admin-card p-5 sm:p-6 ${className}`.trim()}>
      <header className="mb-3 flex items-start gap-3">
        {Icon ? (
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md bg-primary-soft text-primary">
            <Icon className="h-5 w-5" aria-hidden />
          </span>
        ) : null}
        <div className="min-w-0">
          {eyebrow ? (
            <p className="text-[0.68rem] font-semibold uppercase tracking-[0.14em] text-primary">
              {eyebrow}
            </p>
          ) : null}
          <h3 className="font-display text-lg font-semibold tracking-tight text-[var(--cm-color-text)]">
            {title}
          </h3>
        </div>
      </header>
      <div className="text-sm leading-relaxed text-[var(--cm-color-text-muted)]">{children}</div>
      {footer ? <div className="mt-4 flex flex-wrap gap-2">{footer}</div> : null}
    </article>
  )
}
