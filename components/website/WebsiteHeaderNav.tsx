'use client'

import { useCallback, useState } from 'react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { HeaderMenuItem } from '@/types'
import { withBasePathHref, stripBasePath } from '@/lib/with-base-path'
import {
  isMenuSectionHeader,
  COURSE_COLLEGE_SECTION_KEY,
  COURSE_SCHOOL_SECTION_KEY,
} from '@/lib/headerMenuTree'
import {
  closeHeaderMobileMenu,
  isSameAppPath,
  navigateToHomeTop,
  navigateToSectionHash,
  splitPathAndHash,
} from '@/lib/smoothHashScroll'

const MEGA_MENU_LINKS_PER_COLUMN = 7
const MEGA_MENU_SECTION_ORDER = [COURSE_COLLEGE_SECTION_KEY, COURSE_SCHOOL_SECTION_KEY]

function resolveMenuHref(
  item: Pick<HeaderMenuItem, 'link_url' | 'target_section'>,
  homeBase = '/'
): string {
  const raw = (item.link_url || item.target_section || '#').trim()
  if (raw.startsWith('#')) {
    return withBasePathHref(`${homeBase}${raw}`)
  }
  return withBasePathHref(raw)
}

function megaMenuSectionRank(item: HeaderMenuItem): number {
  const index = MEGA_MENU_SECTION_ORDER.indexOf(item.menu_key ?? '')
  return index === -1 ? MEGA_MENU_SECTION_ORDER.length : index
}

function isCoursesMegaMenu(item: HeaderMenuItem): boolean {
  return item.menu_key === 'courses' && (item.children?.some(isMenuSectionHeader) ?? false)
}

function chunkLinksIntoColumns(links: HeaderMenuItem[]): HeaderMenuItem[][] {
  if (links.length <= MEGA_MENU_LINKS_PER_COLUMN) return [links]
  const columnCount = Math.ceil(links.length / MEGA_MENU_LINKS_PER_COLUMN)
  const perColumn = Math.ceil(links.length / columnCount)
  const columns: HeaderMenuItem[][] = []
  for (let i = 0; i < links.length; i += perColumn) {
    columns.push(links.slice(i, i + perColumn))
  }
  return columns
}

export default function WebsiteHeaderNav({ items }: { items: HeaderMenuItem[] }) {
  const pathname = usePathname()
  const router = useRouter()
  const [openId, setOpenId] = useState<number | null>(null)

  const handleNavClick = useCallback(
    (e: React.MouseEvent<HTMLAnchorElement>, href: string) => {
      const { path, hash } = splitPathAndHash(href)
      if (!hash) {
        if (isSameAppPath(pathname, path)) {
          e.preventDefault()
          navigateToHomeTop()
        }
        closeHeaderMobileMenu()
        setOpenId(null)
        return
      }
      if (isSameAppPath(pathname, path)) {
        e.preventDefault()
        navigateToSectionHash(hash)
        closeHeaderMobileMenu()
        setOpenId(null)
        return
      }
      e.preventDefault()
      closeHeaderMobileMenu()
      setOpenId(null)
      router.push(stripBasePath(href))
    },
    [pathname, router]
  )

  if (items.length === 0) return null

  return (
    <>
      {items.map((item) => {
        const hasChildren = Boolean(item.children?.length)
        const href = item.menu_key === 'courses' ? '/#department' : resolveMenuHref(item)
        const isMega = isCoursesMegaMenu(item)

        if (!hasChildren || item.menu_key === 'courses') {
          return (
            <li key={item.id} className="relative">
              <Link
                href={stripBasePath(href)}
                className="pub-nav-link"
                onClick={(e) => handleNavClick(e, href)}
              >
                {item.title}
              </Link>
            </li>
          )
        }

        const panel = isMega ? (
          <div className="website-nav-mega pub-dropdown grid min-w-[18rem] gap-4 sm:grid-cols-2 lg:min-w-[36rem] lg:grid-cols-3">
            {[...item.children!]
              .sort((a, b) => megaMenuSectionRank(a) - megaMenuSectionRank(b))
              .map((section) => {
                const sectionLinks = (section.children ?? []).filter((c) => c.is_active !== false)
                if (!isMenuSectionHeader(section) || sectionLinks.length === 0) return null

                return chunkLinksIntoColumns(sectionLinks).map((column, columnIndex) => (
                  <div key={`${section.id}-${columnIndex}`}>
                    <p className="mb-2 text-[0.72rem] font-bold uppercase tracking-[0.14em] text-pub-copper">
                      {columnIndex === 0 ? section.title : '\u00A0'}
                    </p>
                    <ul className="m-0 list-none p-0">
                      {column.map((link) => {
                        const linkHref = resolveMenuHref(link)
                        return (
                          <li key={link.id}>
                            <a
                              className="website-nav-dropdown-item"
                              href={linkHref}
                              onClick={(e) => handleNavClick(e, linkHref)}
                            >
                              {link.icon_class ? <i className={link.icon_class} aria-hidden /> : null}
                              <span>{link.title}</span>
                            </a>
                          </li>
                        )
                      })}
                    </ul>
                  </div>
                ))
              })}
          </div>
        ) : (
          <ul className="website-nav-panel pub-dropdown m-0 min-w-[14rem] list-none">
            {item.children!.map((child) => {
              const childHref = resolveMenuHref(child)
              return (
                <li key={child.id}>
                  <a
                    className="website-nav-dropdown-item"
                    href={childHref}
                    onClick={(e) => handleNavClick(e, childHref)}
                  >
                    {child.icon_class ? <i className={child.icon_class} aria-hidden /> : null}
                    <span>{child.title}</span>
                  </a>
                </li>
              )
            })}
          </ul>
        )

        return (
          <li key={item.id} className="group relative">
            <button
              type="button"
              className="pub-nav-link"
              aria-expanded={openId === item.id}
              onClick={() => setOpenId((current) => (current === item.id ? null : item.id))}
            >
              <span>{item.title}</span>
              <i className="ri-arrow-down-s-line text-sm" aria-hidden />
            </button>
            <div className="absolute left-0 top-full z-50 hidden pt-2 group-hover:block xl:min-w-max">
              {panel}
            </div>
            {openId === item.id ? <div className="mt-2 xl:hidden">{panel}</div> : null}
          </li>
        )
      })}
    </>
  )
}
