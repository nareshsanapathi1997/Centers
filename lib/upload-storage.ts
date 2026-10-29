/**
 * Shared upload disk root — same contract as `prelogin_backend/config/uploadConfig.js`.
 * Public URLs stay `/uploads/...`; this path is where those files live on disk (e.g. S: drive).
 *
 * Set in `.env` (same variable as prelogin):
 *   UPLOAD_BASE_PATH=S:\prelogin
 * If unset, defaults to `S:\prelogin` then falls back to `<project>/uploads` when not accessible.
 */
import path from 'node:path'
import { existsSync, mkdirSync } from 'node:fs'

const ALT_IMAGE_EXTENSIONS = ['.jpg', '.jpeg', '.png', '.webp', '.gif'] as const

let cachedBase: string | null = null
let cachedProjectUploads: string | null = null

function getProjectUploadsPath(): string {
  if (!cachedProjectUploads) {
    cachedProjectUploads = path.join(process.cwd(), 'uploads')
  }
  return cachedProjectUploads
}

function getPublicUploadsPath(): string {
  return path.join(process.cwd(), 'public', 'uploads')
}

function uploadSearchRoots(): string[] {
  return Array.from(new Set([getUploadBasePath(), getProjectUploadsPath(), getPublicUploadsPath()]))
}

export function getUploadBasePath(): string {
  if (cachedBase) return cachedBase

  const projectUploads = path.join(process.cwd(), 'uploads')
  const envRaw = process.env.UPLOAD_BASE_PATH
  const envPath = (envRaw != null && String(envRaw).trim() !== '' ? String(envRaw).trim() : 'S:\\prelogin')
  const normalized = path.normalize(envPath)

  try {
    if (existsSync(normalized)) {
      cachedBase = normalized
      return cachedBase
    }
    mkdirSync(normalized, { recursive: true })
    cachedBase = normalized
    return cachedBase
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    console.warn(
      `[upload-storage] UPLOAD_BASE_PATH "${envPath}" not accessible (${msg}). Using project folder: ${projectUploads}`
    )
    if (!existsSync(projectUploads)) {
      mkdirSync(projectUploads, { recursive: true })
    }
    cachedBase = projectUploads
    return cachedBase
  }
}

/** Full path under the upload root (same as prelogin `getUploadPath`). */
export function getUploadPath(...segments: string[]): string {
  if (segments.length === 0) return getUploadBasePath()
  return path.join(getUploadBasePath(), ...segments)
}

function isPathInsideRoot(root: string, candidate: string): boolean {
  const resolvedRoot = path.resolve(root)
  const resolvedCandidate = path.resolve(candidate)
  return (
    resolvedCandidate === resolvedRoot ||
    resolvedCandidate.startsWith(`${resolvedRoot}${path.sep}`)
  )
}

function tryResolveInRoot(root: string, safePath: string): string | null {
  const filePath = path.resolve(root, safePath)
  if (!isPathInsideRoot(root, filePath)) return null
  if (existsSync(filePath)) return filePath

  const ext = path.extname(safePath).toLowerCase()
  const base = safePath.slice(0, safePath.length - ext.length)
  for (const altExt of ALT_IMAGE_EXTENSIONS) {
    if (altExt === ext) continue
    const altPath = path.resolve(root, `${base}${altExt}`)
    if (isPathInsideRoot(root, altPath) && existsSync(altPath)) return altPath
  }

  return null
}

/**
 * Resolve a public `/uploads/...` path on disk.
 * Tries the configured upload root, alternate image extensions, then local `uploads/` fallback.
 */
export function resolveUploadFilePath(safePath: string): string | null {
  for (const root of uploadSearchRoots()) {
    const resolved = tryResolveInRoot(root, safePath)
    if (resolved) return resolved
  }
  return null
}

/**
 * Resolve a stored `/uploads/...` URL to a path guaranteed to sit inside an
 * upload root, with no alternate-extension guessing.
 *
 * Use this whenever the relative path originates from stored data rather than a
 * request the caller fully controls: a `..` sequence written into a `file_url`
 * column would otherwise let `path.join` escape the upload directory.
 */
export function resolveStoredUploadPath(publicUrl: string): string | null {
  const rel = publicUrl.replace(/^\/+uploads\/+/, '')
  if (!rel || rel === publicUrl.replace(/^\/+/, '')) {
    // Not an /uploads/ URL at all.
    if (!publicUrl.startsWith('/uploads/')) return null
  }

  for (const root of uploadSearchRoots()) {
    const candidate = path.resolve(root, rel)
    if (isPathInsideRoot(root, candidate) && existsSync(candidate)) return candidate
  }
  return null
}
