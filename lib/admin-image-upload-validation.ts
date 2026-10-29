/** Admin / super-admin image uploads: JPG and PNG only. */

export const ADMIN_IMAGE_ACCEPT = '.jpg,.jpeg,.png,image/jpeg,image/png'

export const ADMIN_IMAGE_MAX_BYTES = 500 * 1024

export const ADMIN_IMAGE_MAX_SIZE_LABEL = '500KB'

export const ADMIN_IMAGE_FORMAT_HINT = `JPG or PNG only, up to ${ADMIN_IMAGE_MAX_SIZE_LABEL}`

const ALLOWED_EXTENSIONS = new Set(['jpg', 'jpeg', 'png'])

const BLOCKED_EXTENSIONS = new Set([
  'exe',
  'bat',
  'cmd',
  'com',
  'scr',
  'pif',
  'msi',
  'dll',
  'js',
  'vbs',
  'ps1',
  'sh',
  'gif',
  'webp',
  'svg',
  'ico',
  'bmp',
  'tiff',
  'tif',
  'avif',
  'heic',
  'heif',
])

const ALLOWED_MIME_TYPES = new Set(['image/jpeg', 'image/jpg', 'image/png'])

export type AdminImageFormat = 'jpeg' | 'png'

export function detectAdminImageFormat(buffer: Buffer): AdminImageFormat | null {
  if (buffer.length >= 3 && buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff) {
    return 'jpeg'
  }
  if (
    buffer.length >= 8 &&
    buffer[0] === 0x89 &&
    buffer[1] === 0x50 &&
    buffer[2] === 0x4e &&
    buffer[3] === 0x47 &&
    buffer[4] === 0x0d &&
    buffer[5] === 0x0a &&
    buffer[6] === 0x1a &&
    buffer[7] === 0x0a
  ) {
    return 'png'
  }
  return null
}

export function validateAdminImageFileName(fileName: string, fileLabel?: string): string | null {
  const prefix = fileLabel ? `${fileLabel}: ` : ''
  const raw = String(fileName ?? '').trim()

  if (!raw) {
    return `${prefix}File name is required.`
  }
  if (raw.includes('\0') || /[\\/]/.test(raw)) {
    return `${prefix}Invalid file name.`
  }

  const base = raw.split(/[/\\]/).pop() ?? raw
  const dotIndex = base.lastIndexOf('.')
  if (dotIndex <= 0 || dotIndex === base.length - 1) {
    return `${prefix}File must have a .jpg, .jpeg, or .png extension.`
  }

  const extPart = base.slice(dotIndex + 1).toLowerCase()
  if (!ALLOWED_EXTENSIONS.has(extPart)) {
    return `${prefix}Only JPG and PNG images are allowed.`
  }

  const segments = base.split('.')
  if (segments.length > 2) {
    for (let i = 1; i < segments.length - 1; i += 1) {
      const segment = segments[i].toLowerCase()
      if (BLOCKED_EXTENSIONS.has(segment) || ALLOWED_EXTENSIONS.has(segment)) {
        return `${prefix}Double file extensions are not allowed.`
      }
    }
  }

  return null
}

export function validateAdminImageMimeType(mimeType: string, fileLabel?: string): string | null {
  const prefix = fileLabel ? `${fileLabel}: ` : ''
  const mime = String(mimeType ?? '').trim().toLowerCase()

  if (!mime || !ALLOWED_MIME_TYPES.has(mime)) {
    return `${prefix}Only JPG and PNG images are allowed.`
  }

  return null
}

export function validateAdminImageFileSize(size: number, fileLabel?: string): string | null {
  const prefix = fileLabel ? `${fileLabel}: ` : ''
  if (size > ADMIN_IMAGE_MAX_BYTES) {
    return `${prefix}File too large. Maximum size is ${ADMIN_IMAGE_MAX_SIZE_LABEL}.`
  }
  return null
}

export function validateAdminImageBuffer(buffer: Buffer, fileLabel?: string): string | null {
  const prefix = fileLabel ? `${fileLabel}: ` : ''
  const format = detectAdminImageFormat(buffer)
  if (!format) {
    return `${prefix}Only JPG and PNG images are allowed.`
  }
  return null
}

export function validateAdminImageUpload(input: {
  fileName: string
  mimeType?: string
  buffer: Buffer
}): string | null {
  const label = input.fileName
  return (
    validateAdminImageFileName(input.fileName, label) ||
    (input.mimeType ? validateAdminImageMimeType(input.mimeType, label) : null) ||
    validateAdminImageFileSize(input.buffer.length, label) ||
    validateAdminImageBuffer(input.buffer, label)
  )
}

export function validateAdminImageFile(file: File): string | null {
  return (
    validateAdminImageFileName(file.name, file.name) ||
    validateAdminImageMimeType(file.type, file.name) ||
    validateAdminImageFileSize(file.size, file.name)
  )
}

export function validateAdminImageFiles(files: File[]): string | null {
  for (const file of files) {
    const error = validateAdminImageFile(file)
    if (error) return error
  }
  return null
}

export function buildSafeAdminImageFileName(originalName: string, buffer: Buffer): string {
  const format = detectAdminImageFormat(buffer)
  const ext = format === 'jpeg' ? '.jpg' : '.png'
  const stem =
    originalName
      .replace(/\.[^/.]+$/, '')
      .replace(/[^a-zA-Z0-9_-]/g, '_')
      .replace(/_+/g, '_')
      .slice(0, 80) || 'image'
  return `${stem}_${Date.now()}${ext}`
}
