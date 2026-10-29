'use client'

import { useEffect, useState } from 'react'

export type CourseNavItem = { id: string; label: string }

export default function CourseDetailsNav({ items }: { items: CourseNavItem[] }) {
  const [active, setActive] = useState(items[0]?.id ?? '')

  useEffect(() => {
    if (items.length === 0) return

    const sections = items
      .map((item) => document.getElementById(item.id))
      .filter((el): el is HTMLElement => el != null)

    if (sections.length === 0) return

    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((e) => e.isIntersecting)
          .sort((a, b) => b.intersectionRatio - a.intersectionRatio)
        if (visible[0]?.target.id) {
          setActive(visible[0].target.id)
        }
      },
      { rootMargin: '-18% 0px -60% 0px', threshold: [0, 0.25, 0.5, 1] }
    )

    for (const section of sections) observer.observe(section)
    return () => observer.disconnect()
  }, [items])

  if (items.length < 2) return null

  return (
    <nav className="cdp-nav" aria-label="Course sections">
      <div className="pub-container cdp-nav__track">
        <div className="cdp-nav__inner">
          {items.map((item, idx) => (
            <a
              key={item.id}
              href={`#${item.id}`}
              className={`cdp-nav__link${active === item.id ? ' cdp-nav__link--active' : ''}`}
              onClick={() => setActive(item.id)}
            >
              <span className="cdp-nav__num">{String(idx + 1).padStart(2, '0')}</span>
              <span>{item.label}</span>
            </a>
          ))}
        </div>
      </div>
    </nav>
  )
}
