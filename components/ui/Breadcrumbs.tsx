'use client'

import Link from 'next/link'
import { ChevronRight } from 'lucide-react'

export type BreadcrumbItem = {
  label: string
  href?: string
}

type BreadcrumbsProps = {
  items: BreadcrumbItem[]
  className?: string
  /** Accessible name for the nav landmark. */
  ariaLabel?: string
}

/**
 * Admin / super-admin breadcrumb trail. Last item is the current page (no link).
 */
export default function Breadcrumbs({
  items,
  className = '',
  ariaLabel = 'Breadcrumb',
}: BreadcrumbsProps) {
  if (!items.length) return null

  return (
    <nav aria-label={ariaLabel} className={`cm-breadcrumbs ${className}`.trim()}>
      <ol className="cm-breadcrumbs__list">
        {items.map((item, index) => {
          const isLast = index === items.length - 1
          return (
            <li key={`${item.label}-${index}`} className="cm-breadcrumbs__item">
              {index > 0 ? (
                <ChevronRight className="cm-breadcrumbs__sep" aria-hidden />
              ) : null}
              {item.href && !isLast ? (
                <Link href={item.href} className="cm-breadcrumbs__link">
                  {item.label}
                </Link>
              ) : (
                <span className="cm-breadcrumbs__current" aria-current={isLast ? 'page' : undefined}>
                  {item.label}
                </span>
              )}
            </li>
          )
        })}
      </ol>
    </nav>
  )
}
