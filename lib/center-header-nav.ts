import { sectionFlagsFromStates } from '@/lib/center-home-section-data'

export type HeaderNavItem = {
  href: string
  label: string
}

export function buildHeaderNavItems(
  centerSlug: string,
  sectionStates: Record<string, boolean>
): HeaderNavItem[] {
  const flags = sectionFlagsFromStates(sectionStates)
  const base = `/${centerSlug}`

  const items: HeaderNavItem[] = [{ href: base, label: 'Home' }]

  if (flags.courses) {
    items.push({ href: `${base}#department`, label: 'Courses' })
  }
  if (flags.results) {
    items.push({ href: `${base}#results`, label: 'Results' })
  }
  if (flags.seniorFaculty) {
    items.push({ href: `${base}#senior-faculty`, label: 'Faculty' })
  } else if (flags.leadership) {
    items.push({ href: `${base}#leadership`, label: 'Faculty' })
  }
  if (flags.about) {
    items.push({ href: `${base}#about`, label: 'About' })
  }

  items.push({ href: `${base}#contact`, label: 'Enquiry' })

  return items
}
