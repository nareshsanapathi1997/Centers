'use client'

import { useState, type ReactNode } from 'react'
import CentreFilter, { rememberCentre } from '@/components/course/CentreFilter'

export default function BrandCentreFilterGrid({
  items,
  initial,
}: {
  items: { slug: string; label: string; node: ReactNode }[]
  initial: string
}) {
  const [sel, setSel] = useState(items.some((i) => i.slug === initial) ? initial : '')
  const shown = sel ? items.filter((i) => i.slug === sel) : items

  const onSelect = (slug: string) => {
    setSel(slug)
    if (slug) rememberCentre(slug)
    const url = new URL(window.location.href)
    url.searchParams.set('centre', slug || 'all')
    window.history.replaceState(window.history.state, '', url.toString())
  }

  return (
    <>
      {items.length > 1 ? (
        <CentreFilter
          options={items.map((i) => ({ slug: i.slug, label: i.label }))}
          value={sel}
          onSelect={onSelect}
          allCount={items.length}
          summary={`Showing ${shown.length} of ${items.length} centres`}
        />
      ) : null}
      <ul className="bcp-centre-grid">
        {shown.map((i) => (
          <li key={i.slug} className="bcp-centre-slot">{i.node}</li>
        ))}
      </ul>
    </>
  )
}
