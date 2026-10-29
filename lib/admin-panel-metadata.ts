import type { Metadata } from 'next'
import { getCenterById, getGlobalSetting } from '@/lib/api'
import { getDefaultImageUrl } from '@/lib/image-utils'

const DEFAULT_FAVICON = '/assets/img/favicon.png'

async function resolveFaviconFromSettings(): Promise<string> {
  const [globalFavicon, globalLogo] = await Promise.all([
    getGlobalSetting('global_favicon'),
    getGlobalSetting('global_logo_light'),
  ])
  const raw =
    globalFavicon?.setting_value?.trim() ||
    globalLogo?.setting_value?.trim() ||
    DEFAULT_FAVICON
  return getDefaultImageUrl(raw, DEFAULT_FAVICON)
}

export async function buildAdminPanelIconMetadata(): Promise<NonNullable<Metadata['icons']>> {
  const icon = await resolveFaviconFromSettings()
  return {
    icon,
    shortcut: icon,
    apple: icon,
  }
}

export async function buildAdminPanelMetadata(
  title: string,
  description: string,
): Promise<Metadata> {
  return {
    title,
    description,
    icons: await buildAdminPanelIconMetadata(),
  }
}

export async function buildCenterAdminPanelMetadata(
  centerId: string,
  title: string,
  description: string,
): Promise<Metadata> {
  const id = Number.parseInt(centerId, 10)
  const [center, globalFavicon] = await Promise.all([
    Number.isFinite(id) ? getCenterById(id) : Promise.resolve(null),
    getGlobalSetting('global_favicon'),
  ])

  const raw =
    center?.favicon_url?.trim() ||
    globalFavicon?.setting_value?.trim() ||
    center?.logo_url?.trim() ||
    DEFAULT_FAVICON

  const icon = getDefaultImageUrl(raw, DEFAULT_FAVICON)

  return {
    title,
    description,
    icons: {
      icon,
      shortcut: icon,
      apple: icon,
    },
  }
}
