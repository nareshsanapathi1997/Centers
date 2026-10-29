import { revalidatePath, revalidateTag } from 'next/cache'

export const WEBSITE_HOME_CACHE_TAG = 'website-home'
export const WEBSITE_CHROME_CACHE_TAG = 'website-chrome'
export const GLOBAL_SETTINGS_CACHE_TAG = 'global-settings'

/** Public website routes that should refresh after admin saves. */
export const WEBSITE_PUBLIC_PATHS = [
  '/',
  '/about',
  '/about/philosophy',
  '/about/promoters',
  '/blog',
  '/courses',
  '/results',
  '/centers',
  '/contact',
  '/vacancies',
  '/news',
] as const

function revalidateWebsitePaths() {
  for (const path of WEBSITE_PUBLIC_PATHS) {
    revalidatePath(path)
  }
}

/** Invalidate all website home caches and public pages. */
export function revalidateWebsiteHomeAll() {
  revalidateTag(WEBSITE_HOME_CACHE_TAG)
  revalidateTag(WEBSITE_CHROME_CACHE_TAG)
  revalidateTag(GLOBAL_SETTINGS_CACHE_TAG)
  revalidateWebsitePaths()
}

/** Section toggles and section content. */
export function revalidateWebsiteHomeContent() {
  revalidateTag(WEBSITE_HOME_CACHE_TAG)
  revalidateWebsitePaths()
}

/** Header/footer chrome, nav menus, global website settings. */
export function revalidateWebsiteHomeChrome() {
  revalidateTag(WEBSITE_CHROME_CACHE_TAG)
  revalidateTag(GLOBAL_SETTINGS_CACHE_TAG)
  revalidateWebsitePaths()
}
