import type { LucideIcon } from 'lucide-react'
import {
  LayoutGrid,
  Sliders,
  Menu,
  ListTree,
  Newspaper,
  GraduationCap,
  Trophy,
  Video,
  MessageSquare,
  BookOpen,
  Images,
  FileText,
  Info,
  MapPin,
  HelpCircle,
  PanelBottom,
  Phone,
} from 'lucide-react'

export const WEBSITE_HOME_SECTION_KEYS = [
  'hero',
  'news',
  'courses',
  'results',
  'video_testimonials',
  'text_testimonials',
  'student_stories',
  'leadership',
  'senior_faculty',
  'gallery',
  'blog',
  'about',
  'centers',
  'faq',
] as const

export type WebsiteHomeSectionKey = (typeof WEBSITE_HOME_SECTION_KEYS)[number]

export const WEBSITE_HOME_SECTION_LABELS: Record<WebsiteHomeSectionKey, string> = {
  hero: 'Hero Slider',
  news: 'News & Notifications',
  courses: 'Courses',
  results: 'Results',
  video_testimonials: 'Video Testimonials',
  text_testimonials: 'Text Testimonials',
  student_stories: 'Student Stories',
  leadership: 'Leadership / Promoters',
  senior_faculty: 'Senior Faculty',
  gallery: 'Gallery',
  blog: 'Blog',
  about: 'About Us',
  centers: 'Our Centres Page',
  faq: 'FAQ',
}

export type WebsiteHomeNavItem = {
  href: string
  label: string
  icon: LucideIcon
  sectionKey?: WebsiteHomeSectionKey
  singleton?: boolean
}

export const WEBSITE_HOME_NAV: WebsiteHomeNavItem[] = [
  { href: '/super-admin/website-home', label: 'Overview', icon: LayoutGrid },
  { href: '/super-admin/website-home/sections', label: 'Section Toggles', icon: Sliders },
  { href: '/super-admin/website-home/chrome', label: 'Header & Footer Settings', icon: Phone },
  { href: '/super-admin/website-home/header-menu', label: 'Header Dropdown Menu', icon: ListTree },
  { href: '/super-admin/website-home/main-nav', label: 'Main Navigation (legacy)', icon: Menu },
  { href: '/super-admin/website-home/footer', label: 'Footer Links', icon: PanelBottom },
  { href: '/super-admin/website-home/hero', label: 'Hero Slider', icon: Sliders, sectionKey: 'hero' },
  { href: '/super-admin/website-home/news', label: 'News & Notifications', icon: Newspaper, sectionKey: 'news' },
  { href: '/super-admin/website-home/courses', label: 'Courses', icon: GraduationCap, sectionKey: 'courses' },
  { href: '/super-admin/website-home/results', label: 'Results', icon: Trophy, sectionKey: 'results' },
  {
    href: '/super-admin/website-home/video-testimonials',
    label: 'Video Testimonials',
    icon: Video,
    sectionKey: 'video_testimonials',
  },
  {
    href: '/super-admin/website-home/text-testimonials',
    label: 'Text Testimonials',
    icon: MessageSquare,
    sectionKey: 'text_testimonials',
  },
  {
    href: '/super-admin/website-home/student-stories',
    label: 'Student Stories',
    icon: BookOpen,
    sectionKey: 'student_stories',
  },
  {
    href: '/super-admin/website-home/about-us',
    label: 'About Us Pages',
    icon: Info,
    sectionKey: 'about',
    singleton: true,
  },
  { href: '/super-admin/website-home/gallery', label: 'Gallery', icon: Images, sectionKey: 'gallery' },
  { href: '/super-admin/website-home/blog', label: 'Blog', icon: FileText, sectionKey: 'blog' },
  { href: '/super-admin/website-home/centers', label: 'Our Centres Page', icon: MapPin },
  { href: '/super-admin/website-home/faq', label: 'FAQ', icon: HelpCircle, sectionKey: 'faq' },
]

export function isWebsiteHomePath(pathname: string | null): boolean {
  return Boolean(pathname === '/super-admin/website-home' || pathname?.startsWith('/super-admin/website-home/'))
}

export function isWebsiteHomeNavItemActive(pathname: string | null, href: string): boolean {
  if (href === '/super-admin/website-home') {
    return pathname === '/super-admin/website-home'
  }
  return pathname === href || pathname?.startsWith(`${href}/`) === true
}

export function getWebsiteHomePageTitle(pathname: string | null): string {
  if (!pathname) return 'Website Home'
  const item = WEBSITE_HOME_NAV.find(
    (nav) => pathname === nav.href || pathname.startsWith(`${nav.href}/`)
  )
  return item?.label || 'Website Home'
}

export function websiteHomeResourceFromPath(pathname: string | null): string | null {
  if (!pathname?.startsWith('/super-admin/website-home/')) return null
  const segment = pathname.replace('/super-admin/website-home/', '').split('/')[0]
  if (!segment || segment === 'sections') return null
  return segment
}
