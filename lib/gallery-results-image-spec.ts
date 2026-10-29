/** Required dimensions for Gallery, Our Results, Blog, and Our Centers card images. */
export const GALLERY_RESULTS_IMAGE_WIDTH = 1280
export const GALLERY_RESULTS_IMAGE_HEIGHT = 720

export const GALLERY_RESULTS_IMAGE_SIZE_LABEL = `${GALLERY_RESULTS_IMAGE_WIDTH}×${GALLERY_RESULTS_IMAGE_HEIGHT} px`

export function validateGalleryResultsDimensions(
  width: number,
  height: number,
  fileLabel?: string,
): string | null {
  if (width === GALLERY_RESULTS_IMAGE_WIDTH && height === GALLERY_RESULTS_IMAGE_HEIGHT) {
    return null
  }
  const prefix = fileLabel ? `${fileLabel}: ` : ''
  return `${prefix}Image must be exactly ${GALLERY_RESULTS_IMAGE_SIZE_LABEL}. Current: ${width}×${height}.`
}

export function isGalleryOrResultsUploadFolder(folder: string | null | undefined): boolean {
  const value = String(folder ?? '')
    .trim()
    .toLowerCase()
  return value === 'gallery' || value === 'results' || value === 'blog' || value === 'centers'
}
