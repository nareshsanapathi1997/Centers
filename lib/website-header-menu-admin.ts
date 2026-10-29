import type { HeaderMenuItem } from '@/types'

export type HeaderMenuFlatRow = HeaderMenuItem & { depth: number }

export type HeaderMenuLinkType = 'page' | 'hash' | 'none'

export const HEADER_MENU_ICON_PRESETS: Array<{ className: string; label: string }> = [
  { className: 'ri-information-line', label: 'Info' },
  { className: 'ri-file-list-line', label: 'Overview' },
  { className: 'ri-lightbulb-line', label: 'Philosophy' },
  { className: 'ri-team-line', label: 'Team' },
  { className: 'ri-trophy-line', label: 'Results' },
  { className: 'ri-graduation-cap-line', label: 'CAT/MBA' },
  { className: 'ri-bank-line', label: 'Bank' },
  { className: 'ri-book-open-line', label: 'Courses' },
  { className: 'ri-calculator-line', label: 'JEE' },
  { className: 'ri-heart-pulse-line', label: 'NEET' },
  { className: 'ri-scales-line', label: 'CLAT' },
  { className: 'ri-building-line', label: 'IPM' },
  { className: 'ri-map-pin-line', label: 'Centres' },
  { className: 'ri-briefcase-line', label: 'Jobs' },
  { className: 'ri-article-line', label: 'Blog' },
  { className: 'ri-link', label: 'Link' },
]

export const HEADER_MENU_PAGE_PRESETS: Array<{ label: string; href: string }> = [
  { label: 'Home', href: '/' },
  { label: 'About — Overview', href: '/about' },
  { label: 'About — Philosophy', href: '/about/philosophy' },
  { label: 'About — Promoters', href: '/about/promoters' },
  { label: 'Our Results', href: '/results' },
  { label: 'Our Centres', href: '/centers' },
  { label: 'Courses', href: '/courses' },
  { label: 'Contact', href: '/contact' },
  { label: 'Blog', href: '/blog' },
  { label: 'Jobs / Vacancies', href: '/vacancies' },
]

export const HEADER_MENU_HASH_PRESETS: Array<{ label: string; hash: string }> = [
  { label: 'Hero', hash: '#hero' },
  { label: 'Gallery', hash: '#gallery' },
  { label: 'FAQ', hash: '#faq' },
]

export function flattenHeaderMenuTree(
  items: HeaderMenuItem[],
  depth = 0
): HeaderMenuFlatRow[] {
  const out: HeaderMenuFlatRow[] = []
  for (const item of items) {
    out.push({ ...item, depth })
    if (item.children?.length) {
      out.push(...flattenHeaderMenuTree(item.children, depth + 1))
    }
  }
  return out
}

export function slugifyMenuKey(title: string): string {
  return title
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '')
    .slice(0, 80)
}

export function inferHeaderMenuLinkType(row: Pick<HeaderMenuItem, 'link_url' | 'target_section'>): HeaderMenuLinkType {
  if (row.link_url?.trim()) return 'page'
  if (row.target_section?.trim()) return 'hash'
  return 'none'
}

export function formatHeaderMenuDestination(row: Pick<HeaderMenuItem, 'link_url' | 'target_section'>): string {
  const type = inferHeaderMenuLinkType(row)
  if (type === 'page') return row.link_url!.trim()
  if (type === 'hash') return row.target_section!.trim()
  return 'Section label only'
}

export function headerMenuRowLabel(row: HeaderMenuFlatRow): string {
  const prefix = row.depth > 0 ? `${'— '.repeat(row.depth)}` : ''
  return `${prefix}${row.title}`
}

export function canHaveHeaderMenuChildren(row: HeaderMenuFlatRow): boolean {
  return row.depth < 2
}

export function getHeaderMenuParentOptions(
  flat: HeaderMenuFlatRow[],
  editingId?: number | null
): Array<{ id: number; label: string }> {
  return flat
    .filter((row) => row.id !== editingId && canHaveHeaderMenuChildren(row))
    .map((row) => ({
      id: row.id,
      label: headerMenuRowLabel(row),
    }))
}

export function buildHeaderMenuFormPayload(form: {
  menu_key: string
  parent_id: string
  title: string
  icon_class: string
  link_type: HeaderMenuLinkType
  link_url: string
  target_section: string
  display_order: number
  is_active: boolean
}) {
  const linkUrl = form.link_type === 'page' ? form.link_url.trim() || null : null
  const targetSection =
    form.link_type === 'hash'
      ? form.target_section.trim().startsWith('#')
        ? form.target_section.trim()
        : form.target_section.trim()
          ? `#${form.target_section.trim()}`
          : null
      : null

  return {
    menu_key: form.menu_key.trim() || slugifyMenuKey(form.title) || `item_${Date.now()}`,
    parent_id: form.parent_id ? Number(form.parent_id) : null,
    title: form.title.trim(),
    icon_class: form.icon_class.trim() || null,
    link_url: linkUrl,
    target_section: targetSection,
    display_order: Number(form.display_order) || 0,
    is_active: form.is_active !== false,
  }
}

export function siblingsForHeaderMenuItem(
  flat: HeaderMenuFlatRow[],
  row: HeaderMenuFlatRow
): HeaderMenuFlatRow[] {
  return flat
    .filter((item) => (item.parent_id ?? null) === (row.parent_id ?? null))
    .sort((a, b) => a.display_order - b.display_order || a.id - b.id)
}
