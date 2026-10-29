/** Required dimensions for center hero slider banner images (admin upload). */
export const HERO_BANNER_IMAGE_WIDTH = 849
export const HERO_BANNER_IMAGE_HEIGHT = 444

export const HERO_BANNER_IMAGE_SIZE_LABEL = `${HERO_BANNER_IMAGE_WIDTH}×${HERO_BANNER_IMAGE_HEIGHT} px`

export function validateHeroBannerDimensions(
  width: number,
  height: number,
  fileLabel?: string,
): string | null {
  if (width === HERO_BANNER_IMAGE_WIDTH && height === HERO_BANNER_IMAGE_HEIGHT) {
    return null
  }
  const prefix = fileLabel ? `${fileLabel}: ` : ''
  return `${prefix}Banner image must be exactly ${HERO_BANNER_IMAGE_SIZE_LABEL}. Current: ${width}×${height}.`
}

/** Center hero slide uploads use folder "hero" with a centerId. */
export function isHeroBannerUpload(folder: string | null | undefined, centerId: string | null | undefined): boolean {
  const value = String(folder ?? '')
    .trim()
    .toLowerCase()
  return value === 'hero' && Boolean(String(centerId ?? '').trim())
}
