import { BRAND } from '@/lib/brand'
import { unstable_cache } from 'next/cache'
import pool from '@/lib/db'
import { buildHeaderMenuTree } from '@/lib/headerMenuTree'
import { getGlobalSettingsByKeys, globalSettingEnabled, globalSettingValue } from '@/lib/api'
import { WEBSITE_CHROME_SETTING_KEYS } from '@/lib/website-chrome-keys'
import {
  filterWebsiteHeaderMenuTree,
  pruneEmptyCourseMegaSections,
} from '@/lib/website-header-menu-filter'
import {
  getWebsiteSectionConfigs,
  websiteSectionFlagsFromConfigs,
} from '@/lib/website-home-db'
import type { HeaderMenuItem } from '@/types'

export type WebsiteMainNavItem = {
  id: number
  label: string
  href: string
  display_order: number
  is_active: boolean
}

export type WebsiteFooterMenuItem = {
  id: number
  menu_group: string
  group_title?: string | null
  title: string
  icon_class?: string | null
  link_url?: string | null
  target_section?: string | null
  display_order: number
  is_active: boolean
}

export type WebsiteChromeSettings = {
  siteName: string
  tagline: string
  headerTopEnabled: boolean
  phone: string
  whatsapp: string
  email: string
  socialFacebook: string
  socialTwitter: string
  socialInstagram: string
  socialLinkedin: string
  footerCopyright: string
  brandingCenterSlug: string
  heroBadgeBrand: string
  heroBadgeTitle: string
}

const CACHE_TAG = 'website-chrome'

export async function getWebsiteHeaderTopMenuItems(): Promise<HeaderMenuItem[]> {
  const result = await pool.query(
    `SELECT * FROM website_header_menu_items WHERE is_active = true ORDER BY display_order, id`
  )
  return buildHeaderMenuTree(result.rows as HeaderMenuItem[])
}

export async function getFilteredWebsiteHeaderMenuItems(): Promise<HeaderMenuItem[]> {
  const [tree, configs] = await Promise.all([
    getWebsiteHeaderTopMenuItems(),
    getWebsiteSectionConfigs(),
  ])
  const flags = websiteSectionFlagsFromConfigs(configs)
  return pruneEmptyCourseMegaSections(filterWebsiteHeaderMenuTree(tree, flags))
}

export async function getWebsiteMainNavItems(): Promise<WebsiteMainNavItem[]> {
  const result = await pool.query(
    `SELECT * FROM website_main_nav_items WHERE is_active = true ORDER BY display_order, id`
  )
  return result.rows as WebsiteMainNavItem[]
}

export async function getWebsiteFooterMenuItems(): Promise<WebsiteFooterMenuItem[]> {
  const result = await pool.query(
    `SELECT * FROM website_footer_menu_items WHERE is_active = true ORDER BY menu_group, display_order, id`
  )
  return result.rows as WebsiteFooterMenuItem[]
}

export async function getWebsiteChromeSettings(): Promise<WebsiteChromeSettings> {
  const settings = await getGlobalSettingsByKeys([...WEBSITE_CHROME_SETTING_KEYS])
  return {
    siteName: globalSettingValue(settings, 'website_site_name', BRAND.shortName),
    tagline: globalSettingValue(
      settings,
      'website_site_tagline',
      BRAND.tagline
    ),
    headerTopEnabled: globalSettingEnabled(settings, 'website_header_top_enabled', false),
    phone: globalSettingValue(settings, 'website_header_phone', ''),
    whatsapp: globalSettingValue(settings, 'website_header_whatsapp', ''),
    email: globalSettingValue(settings, 'website_header_email', ''),
    socialFacebook: globalSettingValue(settings, 'website_social_facebook', ''),
    socialTwitter: globalSettingValue(settings, 'website_social_twitter', ''),
    socialInstagram: globalSettingValue(settings, 'website_social_instagram', ''),
    socialLinkedin: globalSettingValue(settings, 'website_social_linkedin', ''),
    footerCopyright: globalSettingValue(
      settings,
      'website_footer_copyright',
      globalSettingValue(settings, 'footer_copyright_text', `${BRAND.name} Pvt. Ltd.`)
    ),
    brandingCenterSlug: globalSettingValue(settings, 'website_home_branding_center_slug', ''),
    heroBadgeBrand: globalSettingValue(settings, 'website_hero_badge_brand', BRAND.shortName),
    heroBadgeTitle: globalSettingValue(settings, 'website_hero_badge_title', ''),
  }
}

export const getCachedWebsiteChromeSettings = unstable_cache(
  getWebsiteChromeSettings,
  ['website-chrome-settings'],
  { revalidate: 120, tags: [CACHE_TAG] }
)

export const getCachedWebsiteHeaderTopMenu = unstable_cache(
  getFilteredWebsiteHeaderMenuItems,
  ['website-header-top-menu-v2'],
  { revalidate: 120, tags: [CACHE_TAG, 'website-home'] }
)

export const getCachedWebsiteMainNav = unstable_cache(
  getWebsiteMainNavItems,
  ['website-main-nav'],
  { revalidate: 120, tags: [CACHE_TAG] }
)

export const getCachedWebsiteFooterMenu = unstable_cache(
  getWebsiteFooterMenuItems,
  ['website-footer-menu'],
  { revalidate: 120, tags: [CACHE_TAG] }
)

export function resolveWebsiteMenuHref(item: {
  link_url?: string | null
  target_section?: string | null
}): string {
  const raw = (item.link_url || item.target_section || '#').trim()
  if (raw.startsWith('#')) return raw.startsWith('/#') ? raw : `/${raw}`
  if (raw.startsWith('http://') || raw.startsWith('https://')) return raw
  return raw.startsWith('/') ? raw : `/${raw}`
}

export function groupWebsiteFooterItems(items: WebsiteFooterMenuItem[]) {
  const groups = new Map<string, { title: string; items: WebsiteFooterMenuItem[] }>()
  for (const item of items) {
    const key = item.menu_group || 'quick_links_1'
    if (!groups.has(key)) {
      groups.set(key, { title: item.group_title || 'Quick Links', items: [] })
    }
    groups.get(key)!.items.push(item)
  }
  return Array.from(groups.entries()).map(([key, value]) => ({ key, ...value }))
}
