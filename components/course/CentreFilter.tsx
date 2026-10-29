'use client'

import { useEffect, useId, useMemo, useRef, useState } from 'react'
import './CentreFilter.css'

export type CentreFilterOption = { slug: string; label: string; count?: number }

export function rememberCentre(slug: string) {
  if (!slug) return
  document.cookie = `cm_last_centre=${encodeURIComponent(slug)}; path=/; max-age=${60 * 60 * 24 * 180}; samesite=lax`
}

export default function CentreFilter({
  options,
  value,
  onSelect,
  allCount,
  summary,
  noun = 'centres',
}: {
  options: CentreFilterOption[]
  value: string
  onSelect: (slug: string) => void
  allCount?: number
  summary?: string
  noun?: string
}) {
  const [open, setOpen] = useState(false)
  const [q, setQ] = useState('')
  const box = useRef<HTMLDivElement>(null)
  const listId = useId()
  const current = options.find((o) => o.slug === value)

  useEffect(() => {
    if (!open) return
    const close = (e: MouseEvent) => {
      if (box.current && !box.current.contains(e.target as Node)) setOpen(false)
    }
    const esc = (e: KeyboardEvent) => e.key === 'Escape' && setOpen(false)
    document.addEventListener('mousedown', close)
    document.addEventListener('keydown', esc)
    return () => {
      document.removeEventListener('mousedown', close)
      document.removeEventListener('keydown', esc)
    }
  }, [open])

  const filtered = useMemo(() => {
    const t = q.trim().toLowerCase()
    return t ? options.filter((o) => o.label.toLowerCase().includes(t)) : options
  }, [q, options])

  const pick = (slug: string) => {
    setOpen(false)
    setQ('')
    onSelect(slug)
  }

  const countTag = (n?: number) => (typeof n === 'number' ? <span className="cf-count">{n}</span> : null)

  return (
    <div className="cf" role="group" aria-label="Filter by centre">
      <div className="cf-top">
        <span className="cf-label"><i className="ri-map-pin-2-line" aria-hidden /> Centre</span>
        {summary ? <span className="cf-summary" aria-live="polite">{summary}</span> : null}
      </div>

      <div className="cf-pills">
        <button type="button" className={`cf-pill${value === '' ? ' is-on' : ''}`} aria-pressed={value === ''} onClick={() => pick('')}>
          All {noun} {countTag(allCount)}
        </button>
        {options.map((o) => (
          <button
            key={o.slug}
            type="button"
            className={`cf-pill${value === o.slug ? ' is-on' : ''}`}
            aria-pressed={value === o.slug}
            disabled={o.count === 0 && value !== o.slug}
            onClick={() => pick(o.slug)}
          >
            {o.label} {countTag(o.count)}
          </button>
        ))}
      </div>

      <div className="cf-combo" ref={box}>
        <button
          type="button"
          className="cf-combo__btn"
          aria-haspopup="listbox"
          aria-expanded={open}
          aria-controls={listId}
          onClick={() => setOpen((v) => !v)}
        >
          <span>{current ? current.label : `All ${noun}`}</span>
          <i className={`ri-arrow-${open ? 'up' : 'down'}-s-line`} aria-hidden />
        </button>
        {open ? (
          <div className="cf-combo__panel">
            <input
              autoFocus
              className="cf-combo__search"
              placeholder="Search centre or city"
              value={q}
              onChange={(e) => setQ(e.target.value)}
              aria-label="Search centres"
            />
            <ul id={listId} role="listbox" className="cf-combo__list">
              {!q ? (
                <li role="option" aria-selected={value === ''} className={value === '' ? 'is-on' : ''} onClick={() => pick('')}>
                  All {noun} {countTag(allCount)}
                </li>
              ) : null}
              {filtered.map((o) => (
                <li
                  key={o.slug}
                  role="option"
                  aria-selected={value === o.slug}
                  className={`${value === o.slug ? 'is-on' : ''}${o.count === 0 ? ' is-empty' : ''}`}
                  onClick={() => pick(o.slug)}
                >
                  {o.label} {countTag(o.count)}
                </li>
              ))}
              {!filtered.length ? <li className="cf-combo__none">No centre matches “{q}”</li> : null}
            </ul>
          </div>
        ) : null}
      </div>
    </div>
  )
}
