import path from 'node:path'
import { getUploadBasePath } from '@/lib/upload-storage'

/**
 * Client-supplied upload folder names must be on this allowlist. Anything else
 * (including `../` sequences) is rejected before it reaches `path.join`.
 */
export const ADMIN_UPLOAD_FOLDERS = [
  'uploads',
  'hero',
  'gallery',
  'results',
  'blog',
  'news',
  'leadership',
  'senior-faculty',
  'testimonials',
  'about',
  'custom-sections',
  'cta-sliders',
  'student-stories',
  'image-library',
  'centers',
  'assessments',
] as const

/** Student self-service uploads (profile photo, etc.). */
export const STUDENT_UPLOAD_FOLDERS = ['student-photos'] as const

export const SUPER_ADMIN_UPLOAD_FOLDERS = [
  'course-masters',
  'website-home',
  'global',
  'promoters',
  'uploads',
  'hero',
  'gallery',
  'results',
  'blog',
  'news',
] as const

export type AdminUploadFolder = (typeof ADMIN_UPLOAD_FOLDERS)[number]
export type SuperAdminUploadFolder = (typeof SUPER_ADMIN_UPLOAD_FOLDERS)[number]

function isPathInsideRoot(root: string, candidate: string): boolean {
  const resolvedRoot = path.resolve(root)
  const resolvedCandidate = path.resolve(candidate)
  return (
    resolvedCandidate === resolvedRoot ||
    resolvedCandidate.startsWith(`${resolvedRoot}${path.sep}`)
  )
}

/**
 * Validate a folder name against an allowlist and resolve it under the upload
 * root. Returns null when the name is unknown or would escape the root.
 */
export function resolveAllowedUploadDir(
  folder: string | null | undefined,
  allowlist: readonly string[],
  ...extraSegments: string[]
): string | null {
  const raw = String(folder ?? '').trim()
  if (!raw || raw.includes('..') || raw.includes('/') || raw.includes('\\')) {
    return null
  }
  if (!allowlist.includes(raw)) {
    return null
  }

  const root = getUploadBasePath()
  const resolved = path.resolve(root, raw, ...extraSegments)
  if (!isPathInsideRoot(root, resolved)) {
    return null
  }
  return resolved
}
