'use client'

import { AlertCircle, CheckCircle2, Layers } from 'lucide-react'

type Status = 'needs_pricing' | 'saved' | 'approved' | 'partial'

type FeeStatusBadgeProps = {
  status: Status
  batchCount?: number
  batchesPriced?: number
}

export default function FeeStatusBadge({ status, batchCount = 0, batchesPriced = 0 }: FeeStatusBadgeProps) {
  if (status === 'partial' || (batchCount > 0 && batchesPriced > 0 && batchesPriced < batchCount)) {
    return (
      <span className="inline-flex items-center gap-1 text-amber-700 dark:text-amber-300 text-xs font-medium">
        <Layers className="w-3.5 h-3.5" />
        {batchesPriced}/{batchCount} batches priced
      </span>
    )
  }
  if (status === 'needs_pricing') {
    return (
      <span className="inline-flex items-center gap-1 text-amber-700 dark:text-amber-300 text-xs font-medium">
        <AlertCircle className="w-3.5 h-3.5" />
        {batchCount > 0 ? `Needs pricing (${batchCount} batches)` : 'Needs pricing'}
      </span>
    )
  }
  return (
    <span className="inline-flex items-center gap-1 text-green-700 dark:text-green-300 text-xs font-medium">
      <CheckCircle2 className="w-3.5 h-3.5" />
      {batchCount > 0 ? `Saved (${batchCount} batches)` : 'Saved'}
    </span>
  )
}
