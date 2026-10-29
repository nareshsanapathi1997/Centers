import { withBasePath } from '@/lib/with-base-path'
import { clearServerSession } from '@/lib/logout'

/**
 * Cookie-authenticated fetch for super-admin screens.
 */
export async function superAdminFetch(
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
    localStorage.removeItem('superAdminId')
    await clearServerSession('super-admin')
    window.location.href = withBasePath('/super-admin/login')
  }

  return response
}

/** @deprecated Tokens are no longer stored client-side. Kept as a no-op stub. */
export function getSuperAdminToken(): string | null {
  return null
}
