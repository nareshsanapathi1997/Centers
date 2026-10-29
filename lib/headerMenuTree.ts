import type { HeaderMenuItem } from '@/types'

/** Build nested menu tree from flat DB rows (supports 3+ levels). */
export function buildHeaderMenuTree(flatItems: HeaderMenuItem[]): HeaderMenuItem[] {
  const nodes = flatItems.map((item) => ({ ...item, children: [] as HeaderMenuItem[] }))
  const byId = new Map(nodes.map((item) => [item.id, item]))
  const roots: HeaderMenuItem[] = []

  for (const item of nodes) {
    if (item.parent_id && byId.has(item.parent_id)) {
      byId.get(item.parent_id)!.children!.push(item)
    } else if (!item.parent_id) {
      roots.push(item)
    }
  }

  const sortTree = (list: HeaderMenuItem[]) => {
    list.sort((a, b) => a.display_order - b.display_order)
    list.forEach((node) => {
      if (node.children?.length) sortTree(node.children)
    })
  }
  sortTree(roots)
  return roots
}

export function findRootHeaderMenuByKey(
  tree: HeaderMenuItem[],
  menuKey: string,
): HeaderMenuItem | undefined {
  return tree.find((item) => item.menu_key === menuKey)
}

export const COURSES_MENU_KEY = 'courses'
export const COURSE_SCHOOL_SECTION_KEY = 'courses_school_level'
export const COURSE_COLLEGE_SECTION_KEY = 'courses_college_level'

export function getCourseSectionGroups(coursesMenu: HeaderMenuItem | undefined): HeaderMenuItem[] {
  if (!coursesMenu?.children?.length) return []
  return coursesMenu.children.filter(
    (c) => c.menu_key === COURSE_SCHOOL_SECTION_KEY || c.menu_key === COURSE_COLLEGE_SECTION_KEY,
  )
}

/** Resolve which School/College section a course link belongs to. */
export function resolveCourseLinkSectionId(
  item: HeaderMenuItem,
  coursesMenu: HeaderMenuItem | undefined,
): number | null {
  if (!coursesMenu) return null
  const sections = getCourseSectionGroups(coursesMenu)
  if (item.parent_id && sections.some((s) => s.id === item.parent_id)) {
    return item.parent_id
  }
  for (const section of sections) {
    if (section.children?.some((c) => c.id === item.id)) {
      return section.id
    }
  }
  // Legacy: link was added directly under Courses before sections existed
  if (item.parent_id === coursesMenu.id && sections.length > 0) {
    return sections[0].id
  }
  return sections[0]?.id ?? null
}

export function isCourseLinkItem(
  item: HeaderMenuItem | null,
  parent: HeaderMenuItem | null,
  coursesMenu: HeaderMenuItem | undefined,
): boolean {
  if (!coursesMenu) return false
  if (parent?.menu_key === COURSES_MENU_KEY) return true
  if (
    parent?.menu_key === COURSE_SCHOOL_SECTION_KEY ||
    parent?.menu_key === COURSE_COLLEGE_SECTION_KEY
  ) {
    return true
  }
  if (!item) return false
  if (
    item.menu_key === COURSES_MENU_KEY ||
    item.menu_key === COURSE_SCHOOL_SECTION_KEY ||
    item.menu_key === COURSE_COLLEGE_SECTION_KEY
  ) {
    return false
  }
  const sectionId = resolveCourseLinkSectionId(item, coursesMenu)
  if (sectionId == null) return false
  if (item.parent_id === coursesMenu.id) return true
  return sectionsContainLink(coursesMenu, item.id)
}

function sectionsContainLink(coursesMenu: HeaderMenuItem, linkId: number): boolean {
  return getCourseSectionGroups(coursesMenu).some((s) =>
    s.children?.some((c) => c.id === linkId),
  )
}

/** Section row (e.g. School Level Courses) — label only, links live in children. */
export function isMenuSectionHeader(item: HeaderMenuItem): boolean {
  return Boolean(item.children?.length) && !item.link_url && !item.target_section
}
