import { unstable_cache } from 'next/cache'
import { getGlobalSettingValue } from '@/lib/api'
import { normalizeImageUrl } from '@/lib/image-utils'

/** Default matches `HeroSection` / `HeroSlider` when global setting is unset. */
export const DEFAULT_HERO_BG = '/assets/img/hero/hero-slider-1.jpg'

/** Same image as the home hero slider (`hero_common_background_image` global setting). */
export const getHeroCommonBackgroundImageUrl = unstable_cache(
  async (): Promise<string> => {
    const raw = await getGlobalSettingValue('hero_common_background_image', DEFAULT_HERO_BG)
    return normalizeImageUrl(raw) ?? normalizeImageUrl(DEFAULT_HERO_BG) ?? DEFAULT_HERO_BG
  },
  ['hero-common-background-image'],
  { revalidate: 300, tags: ['global-settings'] }
)
