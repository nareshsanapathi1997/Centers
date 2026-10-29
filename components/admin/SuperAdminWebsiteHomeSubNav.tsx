'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { WEBSITE_HOME_NAV, isWebsiteHomeNavItemActive } from '@/lib/website-home-nav'

export default function SuperAdminWebsiteHomeSubNav() {
  const pathname = usePathname()

  return (
    <nav
      className="flex flex-wrap gap-2 rounded-xl border border-gray-200 bg-white p-2 dark:border-gray-700 dark:bg-gray-800"
      aria-label="Website home sections"
    >
      {WEBSITE_HOME_NAV.map((item) => {
        const active = isWebsiteHomeNavItemActive(pathname, item.href)
        const Icon = item.icon
        return (
          <Link
            key={item.href}
            href={item.href}
            className={`inline-flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
              active
                ? 'bg-blue-600 text-white'
                : 'text-gray-700 hover:bg-gray-100 dark:text-gray-200 dark:hover:bg-gray-700'
            }`}
          >
            <Icon className="h-4 w-4 shrink-0" />
            {item.label}
          </Link>
        )
      })}
    </nav>
  )
}
