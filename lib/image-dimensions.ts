import {
  GALLERY_RESULTS_IMAGE_SIZE_LABEL,
  validateGalleryResultsDimensions,
} from '@/lib/gallery-results-image-spec'
import {
  HERO_BANNER_IMAGE_SIZE_LABEL,
  validateHeroBannerDimensions,
} from '@/lib/hero-banner-image-spec'

export function getImageDimensionsFromFile(file: File): Promise<{ width: number; height: number }> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file)
    const img = new Image()
    img.onload = () => {
      URL.revokeObjectURL(url)
      resolve({ width: img.naturalWidth, height: img.naturalHeight })
    }
    img.onerror = () => {
      URL.revokeObjectURL(url)
      reject(new Error('Invalid image'))
    }
    img.src = url
  })
}

export function readImageDimensionsFromBuffer(buffer: Buffer): { width: number; height: number } | null {
  if (buffer.length < 24) return null

  // PNG
  if (buffer[0] === 0x89 && buffer[1] === 0x50 && buffer[2] === 0x4e && buffer[3] === 0x47) {
    return {
      width: buffer.readUInt32BE(16),
      height: buffer.readUInt32BE(20),
    }
  }

  // JPEG
  if (buffer[0] === 0xff && buffer[1] === 0xd8) {
    let offset = 2
    while (offset + 9 < buffer.length) {
      if (buffer[offset] !== 0xff) {
        offset += 1
        continue
      }
      const marker = buffer[offset + 1]
      if (marker === 0xc0 || marker === 0xc1 || marker === 0xc2 || marker === 0xc3) {
        return {
          height: buffer.readUInt16BE(offset + 5),
          width: buffer.readUInt16BE(offset + 7),
        }
      }
      const segmentLength = buffer.readUInt16BE(offset + 2)
      if (segmentLength < 2) break
      offset += 2 + segmentLength
    }
  }

  // WebP (lossy VP8)
  if (
    buffer.length >= 30 &&
    buffer.toString('ascii', 0, 4) === 'RIFF' &&
    buffer.toString('ascii', 8, 12) === 'WEBP' &&
    buffer.toString('ascii', 12, 16) === 'VP8 '
  ) {
    return {
      width: buffer.readUInt16LE(26) & 0x3fff,
      height: buffer.readUInt16LE(28) & 0x3fff,
    }
  }

  // WebP (lossless VP8L)
  if (
    buffer.length >= 25 &&
    buffer.toString('ascii', 0, 4) === 'RIFF' &&
    buffer.toString('ascii', 8, 12) === 'WEBP' &&
    buffer.toString('ascii', 12, 16) === 'VP8L'
  ) {
    const bits = buffer.readUInt32LE(21)
    return {
      width: (bits & 0x3fff) + 1,
      height: ((bits >> 14) & 0x3fff) + 1,
    }
  }

  // GIF
  if (buffer.toString('ascii', 0, 3) === 'GIF' && buffer.length >= 10) {
    return {
      width: buffer.readUInt16LE(6),
      height: buffer.readUInt16LE(8),
    }
  }

  return null
}

export function validateGalleryResultsImageBuffer(
  buffer: Buffer,
  fileLabel?: string,
): string | null {
  const dimensions = readImageDimensionsFromBuffer(buffer)
  if (!dimensions) {
    return fileLabel
      ? `${fileLabel}: Could not read image dimensions. Use PNG or JPEG at ${GALLERY_RESULTS_IMAGE_SIZE_LABEL}.`
      : `Could not read image dimensions. Use PNG or JPEG at ${GALLERY_RESULTS_IMAGE_SIZE_LABEL}.`
  }
  return validateGalleryResultsDimensions(dimensions.width, dimensions.height, fileLabel)
}

export async function validateGalleryResultsImageFiles(files: File[]): Promise<string | null> {
  for (const file of files) {
    try {
      const { width, height } = await getImageDimensionsFromFile(file)
      const error = validateGalleryResultsDimensions(width, height, file.name)
      if (error) return error
    } catch {
      return `${file.name}: Invalid image file.`
    }
  }
  return null
}

export function validateHeroBannerImageBuffer(
  buffer: Buffer,
  fileLabel?: string,
): string | null {
  const dimensions = readImageDimensionsFromBuffer(buffer)
  if (!dimensions) {
    return fileLabel
      ? `${fileLabel}: Could not read image dimensions. Use PNG or JPEG at ${HERO_BANNER_IMAGE_SIZE_LABEL}.`
      : `Could not read image dimensions. Use PNG or JPEG at ${HERO_BANNER_IMAGE_SIZE_LABEL}.`
  }
  return validateHeroBannerDimensions(dimensions.width, dimensions.height, fileLabel)
}
