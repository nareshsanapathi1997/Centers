import type { HeaderMenuItem } from '@/types'
import type { WebsiteHomeSectionFlags } from '@/lib/website-home-db'
import { COURSES_MENU_KEY } from '@/lib/headerMenuTree'

const TOP_LEVEL_SECTION: Record<string, keyof WebsiteHomeSectionFlags | 'always'> = {
  about_us: 'about',
  results: 'results',
  courses: 'courses',
  centers: 'always',
  jobs: 'always',
  blog: 'blog',
}

function isSectionEnabled(flags: WebsiteHomeSectionFlags, key: keyof WebsiteHomeSectionFlags | 'always'): boolean {
  if (key === 'always') return true
  return flags[key] === true
}

function filterMenuNodes(
  items: HeaderMenuItem[],
  flags: WebsiteHomeSectionFlags,
  parentSection: keyof WebsiteHomeSectionFlags | 'always' = 'always'
): HeaderMenuItem[] {
  const out: HeaderMenuItem[] = []

  for (const item of items) {
    if (item.is_active === false) continue

    const ownSection = item.menu_key ? TOP_LEVEL_SECTION[item.menu_key] : undefined
    const sectionKey = ownSection ?? parentSection

    if (!isSectionEnabled(flags, sectionKey)) continue

    const children = item.children?.length
      ? filterMenuNodes(item.children, flags, sectionKey)
      : []

    const isParent = Boolean(item.children?.length)
    const hasOwnLink = Boolean(item.link_url?.trim() || item.target_section?.trim())

    if (isParent && children.length === 0 && !hasOwnLink) continue

    out.push({
      ...item,
      children,
    })
  }

  return out
}

export function filterWebsiteHeaderMenuTree(
  items: HeaderMenuItem[],
  flags: WebsiteHomeSectionFlags
): HeaderMenuItem[] {
  return filterMenuNodes(items, flags)
}

/** Hide courses mega menu sections with no active child links. */
export function pruneEmptyCourseMegaSections(items: HeaderMenuItem[]): HeaderMenuItem[] {
  return items.map((item) => {
    if (item.menu_key !== COURSES_MENU_KEY || !item.children?.length) {
      return item
    }
    const children = item.children.filter((child) => {
      if (child.children?.length) {
        return child.children.some((link) => link.is_active !== false)
      }
      return child.is_active !== false
    })
    return { ...item, children }
  })
}
