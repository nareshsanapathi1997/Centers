'use client'

import type { ReactNode } from 'react'
import Breadcrumbs, { type BreadcrumbItem } from '@/components/ui/Breadcrumbs'

type PageHeaderProps = {
  title: ReactNode
  description?: ReactNode
  breadcrumbs?: BreadcrumbItem[]
  actions?: ReactNode
  className?: string
}

/** Standard page header for admin / super-admin kit migrations. */
export default function PageHeader({
  title,
  description,
  breadcrumbs,
  actions,
  className = '',
}: PageHeaderProps) {
  return (
    <div className={`space-y-2 ${className}`.trim()}>
      {breadcrumbs?.length ? <Breadcrumbs items={breadcrumbs} /> : null}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="font-display text-2xl font-semibold tracking-tight text-[var(--cm-color-text)] sm:text-3xl">{title}</h1>
          {description ? (
            <p className="mt-1 text-[var(--cm-color-text-muted)]">{description}</p>
          ) : null}
        </div>
        {actions ? <div className="flex shrink-0 flex-wrap items-center gap-2">{actions}</div> : null}
      </div>
    </div>
  )
}
