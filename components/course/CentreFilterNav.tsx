'use client'

import { useTransition } from 'react'
import { usePathname, useRouter, useSearchParams } from 'next/navigation'
import CentreFilter, { rememberCentre, type CentreFilterOption } from '@/components/course/CentreFilter'

/** Centre filter for listing pages: server re-renders with ?centre=. */
export default function CentreFilterNav({
  options,
  value,
  allCount,
  summary,
}: {
  options: CentreFilterOption[]
  value: string
  allCount: number
  summary: string
}) {
  const router = useRouter()
  const pathname = usePathname()
  const sp = useSearchParams()
  const [pending, start] = useTransition()

  const onSelect = (slug: string) => {
    if (slug) rememberCentre(slug)
    const p = new URLSearchParams(sp?.toString() || '')
    p.set('centre', slug || 'all')
    p.delete('page')
    start(() => router.push(`${pathname}?${p.toString()}`, { scroll: false }))
  }

  return (
    <div style={{ opacity: pending ? 0.6 : 1, transition: 'opacity .15s' }}>
      <CentreFilter options={options} value={value} onSelect={onSelect} allCount={allCount} summary={pending ? 'Updating…' : summary} noun="centres" />
    </div>
  )
}
