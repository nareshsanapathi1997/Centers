'use client'

import React from 'react'
import Link from 'next/link'

interface MetricCardProps {
  title: string
  value: number | string
  href?: string
  actionLabel?: string
  icon?: React.ReactNode
  trend?: { value: number; label?: string }
  subtitle?: string
  variant?: 'default' | 'primary' | 'success' | 'warning'
  loading?: boolean
}

const variantIconStyles = {
  default: 'bg-indigo-500/10 text-indigo-600 dark:bg-indigo-500/15 dark:text-indigo-300 border border-indigo-500/15',
  primary: 'bg-indigo-600/12 text-indigo-600 dark:bg-indigo-500/20 dark:text-indigo-300 border border-indigo-500/20',
  success: 'bg-emerald-500/12 text-emerald-600 dark:bg-emerald-500/20 dark:text-emerald-300 border border-emerald-500/20',
  warning: 'bg-amber-500/12 text-amber-600 dark:bg-amber-500/20 dark:text-amber-300 border border-amber-500/20',
}

export default function MetricCard({
  title,
  value,
  href,
  actionLabel = 'Manage',
  icon,
  trend,
  subtitle,
  variant = 'default',
  loading = false,
}: MetricCardProps) {
  const content = (
    <div className="flex h-full flex-col justify-between gap-3">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <p className="text-xs font-semibold uppercase tracking-wider text-[var(--color-text-muted)]">{title}</p>
          {loading ? (
            <div className="mt-2.5 h-8 w-20 rounded-md bg-[var(--color-border)] animate-pulse" aria-hidden />
          ) : (
            <p className="mt-2 text-2xl sm:text-3xl font-bold text-[var(--color-text)] tabular-nums tracking-tight leading-none">
              {value}
            </p>
          )}
        </div>
        {icon && (
          <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${variantIconStyles[variant]}`}>
            {icon}
          </div>
        )}
      </div>

      <div className="flex items-center justify-between gap-2 pt-2 border-t border-[var(--color-border-subtle)]">
        <div className="min-w-0 truncate">
          {trend && !loading ? (
            <span
              className={`inline-flex items-center gap-1 text-xs font-semibold ${
                trend.value >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-600 dark:text-red-400'
              }`}
            >
              {trend.value >= 0 ? '\u2191' : '\u2193'} {Math.abs(trend.value)}%
              {trend.label && <span className="text-[var(--color-text-muted)] font-normal">{trend.label}</span>}
            </span>
          ) : subtitle ? (
            <span className="text-xs text-[var(--color-text-muted)] truncate">{subtitle}</span>
          ) : (
            <span className="text-xs text-[var(--color-text-muted)]">Live record count</span>
          )}
        </div>
        {href && (
          <span className="inline-flex items-center gap-1 text-xs font-semibold text-indigo-600 dark:text-indigo-400 group-hover:translate-x-0.5 transition-transform shrink-0">
            {actionLabel} <i className="ri-arrow-right-line ml-0.5" aria-hidden="true" />
          </span>
        )}
      </div>
    </div>
  )

  const cardClass =
    'group relative h-full rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] p-5 shadow-[var(--shadow-sm)] transition-all duration-200 hover:-translate-y-0.5 hover:border-indigo-500/35 hover:shadow-[var(--shadow-md)]'

  if (href) {
    return (
      <Link
        href={href}
        className={`block h-full ${cardClass} focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-accent)] focus-visible:ring-offset-2`}
      >
        {content}
      </Link>
    )
  }

  return <div className={cardClass}>{content}</div>
}
