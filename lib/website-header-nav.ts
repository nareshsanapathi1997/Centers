import { websiteSectionFlagsFromConfigs, type WebsiteSectionConfig } from '@/lib/website-home-db'

export type WebsiteHeaderNavItem = {
  href: string
  label: string
}

/** Default main nav when the CMS header menu is empty. */
export const WEBSITE_DEFAULT_MAIN_NAV: WebsiteHeaderNavItem[] = [
  { href: '/about', label: 'About Us' },
  { href: '/results', label: 'Our Results' },
  { href: '/centers', label: 'Our Centres' },
  { href: '/#department', label: 'Courses' },
  { href: '/vacancies', label: 'Careers@EduSphere' },
]

export function homeCoursesHref(centerSlug = ''): string {
  return centerSlug ? `/${centerSlug}#department` : '/#department'
}

export function buildWebsiteHeaderNavItems(configs: WebsiteSectionConfig[]): WebsiteHeaderNavItem[] {
  const flags = websiteSectionFlagsFromConfigs(configs)
  const items: WebsiteHeaderNavItem[] = []

  if (flags.about) items.push({ href: '/about', label: 'About Us' })
  if (flags.results) items.push({ href: '/results', label: 'Our Results' })
  items.push({ href: '/centers', label: 'Our Centres' })
  if (flags.courses) items.push({ href: '/#department', label: 'Courses' })
  if (flags.gallery) items.push({ href: '/gallery', label: 'Gallery' })
  if (flags.blog) items.push({ href: '/blog', label: 'Blog' })
  items.push({ href: '/contact', label: 'Contact' })
  items.push({ href: '/vacancies', label: 'Careers@EduSphere' })

  return items
}
