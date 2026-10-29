import Link from 'next/link'
import { ABOUT_SUB_PAGES, type AboutSubPageKey } from '@/lib/website-about-pages'

type AboutUsSubNavProps = {
  active: AboutSubPageKey
}

export default function AboutUsSubNav({ active }: AboutUsSubNavProps) {
  return (
    <nav className="about-us-subnav" aria-label="About Us sections">
      <div className="container">
        <ul className="about-us-subnav__list">
          {ABOUT_SUB_PAGES.map((page) => {
            const isActive = page.key === active
            return (
              <li key={page.key}>
                <Link
                  href={page.href}
                  className={`about-us-subnav__link${isActive ? ' about-us-subnav__link--active' : ''}`}
                  aria-current={isActive ? 'page' : undefined}
                >
                  <i className={page.icon} aria-hidden />
                  <span>{page.label}</span>
                </Link>
              </li>
            )
          })}
        </ul>
      </div>
    </nav>
  )
}
