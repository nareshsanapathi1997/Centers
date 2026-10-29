'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import {
  closeHeaderMobileMenu,
  isSameAppPath,
  navigateToHomeTop,
  navigateToSectionHash,
  splitPathAndHash,
} from '@/lib/smoothHashScroll'

type NavItem = {
  href: string
  label: string
}

export default function HeaderNavLinks({
  centerSlug,
  items,
}: {
  centerSlug: string
  items?: NavItem[]
}) {
  const pathname = usePathname()
  const router = useRouter()

  const defaultItems: NavItem[] = [
    { href: `/${centerSlug}`, label: 'Home' },
    { href: `/${centerSlug}#department`, label: 'Courses' },
    { href: `/${centerSlug}#results`, label: 'Results' },
    { href: `/${centerSlug}#senior-faculty`, label: 'Faculty' },
    { href: `/${centerSlug}#about`, label: 'About' },
    { href: `/${centerSlug}#contact`, label: 'Enquiry' },
  ]

  const navItems = items ?? defaultItems

  const handleClick = (e: React.MouseEvent<HTMLAnchorElement>, href: string) => {
    const { path, hash } = splitPathAndHash(href)
    closeHeaderMobileMenu()

    if (hash) {
      if (isSameAppPath(pathname, path)) {
        e.preventDefault()
        navigateToSectionHash(hash)
        return
      }
      e.preventDefault()
      void router.push(href)
      return
    }

    if (isSameAppPath(pathname, path)) {
      e.preventDefault()
      navigateToHomeTop()
    }
  }

  return (
    <>
      {navItems.map((item) => (
        <li key={`${item.label}-${item.href}`} className="relative">
          <Link
            className="pub-nav-link"
            href={item.href}
            onClick={(e) => handleClick(e, item.href)}
          >
            {item.label}
          </Link>
        </li>
      ))}
    </>
  )
}
