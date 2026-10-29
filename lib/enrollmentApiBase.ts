/**
 * Base URL for prelogin_backend API (no trailing slash, no /api suffix).
 * Used by enquiry course-variant loading.
 *
 * Set `NEXT_PUBLIC_PRELOGIN_API_URL` (e.g. `http://localhost:5000`).
 */
function normalizeBase(raw: string): string {
  let base = raw.replace(/\/+$/, '')
  if (base.endsWith('/api')) base = base.slice(0, -4).replace(/\/+$/, '')
  return base
}

export function getEnrollmentApiBaseUrl(): string {
  const raw =
    process.env.NEXT_PUBLIC_PRELOGIN_API_URL?.trim() ||
    process.env.PRELOGIN_API_URL?.trim() ||
    ''
  return raw ? normalizeBase(raw) : ''
}

export const ENROLLMENT_API_BASE_URL = getEnrollmentApiBaseUrl()
