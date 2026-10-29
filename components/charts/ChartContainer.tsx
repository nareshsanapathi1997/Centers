'use client'

import type { ReactNode } from 'react'
import {
  ResponsiveContainer,
  type ResponsiveContainerProps,
} from 'recharts'

export const CHART_COLORS = [
  '#4f46e5',
  '#6366f1',
  '#0e7490',
  '#b45309',
  '#0f7a4a',
  '#4338ca',
  '#4338ca',
] as const

export const chartAxisTick = {
  fontSize: 11,
  fill: 'var(--cm-color-text-muted)',
} as const

export const chartGridStroke = 'var(--cm-color-border)'

type ChartContainerProps = {
  children: ResponsiveContainerProps['children']
  height?: number | `${number}%`
  className?: string
  title?: string
  empty?: boolean
  emptyFallback?: ReactNode
}

export default function ChartContainer({
  children,
  height = 280,
  className = '',
  title,
  empty = false,
  emptyFallback = (
    <p className="text-sm text-[var(--cm-color-text-muted)]">No chart data yet</p>
  ),
}: ChartContainerProps) {
  const resolvedHeight =
    typeof height === 'number' ? Math.max(180, Math.min(height, 420)) : height

  return (
    <div
      className={`cm-chart w-full overflow-hidden rounded-lg border border-[var(--cm-color-border)] bg-[var(--cm-color-surface)] p-3 sm:p-4 ${className}`.trim()}
      role="img"
      aria-label={title ?? 'Chart'}
    >
      {title ? (
        <p className="mb-3 font-display text-sm font-semibold tracking-tight text-[var(--cm-color-text)]">
          {title}
        </p>
      ) : null}
      {empty ? (
        <div
          className="flex items-center justify-center"
          style={{ height: typeof resolvedHeight === 'number' ? `${resolvedHeight}px` : resolvedHeight }}
        >
          {emptyFallback}
        </div>
      ) : (
        <div className="min-h-[180px] w-full min-w-0">
          <ResponsiveContainer width="100%" height={resolvedHeight}>
            {children}
          </ResponsiveContainer>
        </div>
      )}
    </div>
  )
}

export {
  ResponsiveContainer,
  BarChart,
  Bar,
  LineChart,
  Line,
  AreaChart,
  Area,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
} from 'recharts'
