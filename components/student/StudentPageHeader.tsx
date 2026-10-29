import type { ReactNode } from 'react'
import Link from 'next/link'
import { ChevronRight } from 'lucide-react'

export type StudentBreadcrumbItem = {
  label: string
  href?: string
}

type Props = {
  title: string
  subtitle?: ReactNode
  actions?: ReactNode
  /** Optional trail shown above the title (student-styled). */
  breadcrumbs?: StudentBreadcrumbItem[]
}

export default function StudentPageHeader({ title, subtitle, actions, breadcrumbs }: Props) {
  return (
    <div className="sp-page__header">
      {breadcrumbs?.length ? (
        <nav aria-label="Breadcrumb" className="sp-breadcrumbs">
          <ol className="sp-breadcrumbs__list">
            {breadcrumbs.map((item, index) => {
              const isLast = index === breadcrumbs.length - 1
              return (
                <li key={`${item.label}-${index}`} className="sp-breadcrumbs__item">
                  {index > 0 ? (
                    <ChevronRight className="sp-breadcrumbs__sep" aria-hidden />
                  ) : null}
                  {item.href && !isLast ? (
                    <Link href={item.href} className="sp-breadcrumbs__link">
                      {item.label}
                    </Link>
                  ) : (
                    <span
                      className="sp-breadcrumbs__current"
                      aria-current={isLast ? 'page' : undefined}
                    >
                      {item.label}
                    </span>
                  )}
                </li>
              )
            })}
          </ol>
        </nav>
      ) : null}

      <div className="sp-page__head">
        <div>
          <h1>{title}</h1>
          {subtitle ? <p>{subtitle}</p> : null}
        </div>
        {actions ? <div className="sp-page__actions">{actions}</div> : null}
      </div>
    </div>
  )
}
