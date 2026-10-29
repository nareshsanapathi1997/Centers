import { withBasePath } from '@/lib/with-base-path'
import { clearServerSession } from '@/lib/logout'

/**
 * Cookie-authenticated fetch for center-admin screens.
 * The httpOnly session cookie is sent automatically (same-origin).
 */
export async function authenticatedFetch(
  url: string,
  options: RequestInit = {}
): Promise<Response> {
  const headers = new Headers(options.headers)

  if (!headers.has('Content-Type') && options.body && !(options.body instanceof FormData)) {
    headers.set('Content-Type', 'application/json')
  }

  const resolved = url.startsWith('/') ? withBasePath(url) : url
  const response = await fetch(resolved, {
    ...options,
    credentials: 'include',
    headers,
  })

  if (response.status === 401 && typeof window !== 'undefined') {
    localStorage.removeItem('centerId')
    await clearServerSession('admin')
    window.location.href = withBasePath('/admin/login')
  }

  return response
}

/**
 * Probe whether a center-admin session cookie is present by hitting verify.
 * Redirects to login on failure.
 */
export async function requireAuth(): Promise<void> {
  const response = await fetch(withBasePath('/api/admin/verify'), {
    method: 'POST',
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({}),
  })
  if (!response.ok) {
    localStorage.removeItem('centerId')
    await clearServerSession('admin')
    window.location.href = withBasePath('/admin/login')
    throw new Error('Not authenticated')
  }
}

/** @deprecated Tokens are no longer stored client-side. Kept as a no-op stub. */
export function getAdminToken(): string | null {
  return null
}
