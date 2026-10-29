type AdminAuthResult = { authorized: boolean; adminId?: number; error?: string }
type SuperAdminAuthResult = { authorized: boolean; adminId?: number; error?: string }

type CacheEntry<T> = { value: T; expiresAt: number }

const ADMIN_AUTH_TTL_MS = 60_000
const adminAuthCache = new Map<string, CacheEntry<AdminAuthResult>>()
const superAdminAuthCache = new Map<string, CacheEntry<SuperAdminAuthResult>>()

function cacheKey(token: string, scope: string): string {
  return `${scope}:${token.slice(-32)}`
}

export function getCachedAdminAuth(token: string, centerId: number): AdminAuthResult | null {
  const entry = adminAuthCache.get(cacheKey(token, `admin-${centerId}`))
  if (!entry || entry.expiresAt <= Date.now()) return null
  return entry.value
}

export function setCachedAdminAuth(token: string, centerId: number, value: AdminAuthResult): void {
  if (!value.authorized) return
  adminAuthCache.set(cacheKey(token, `admin-${centerId}`), {
    value,
    expiresAt: Date.now() + ADMIN_AUTH_TTL_MS,
  })
}

export function getCachedSuperAdminAuth(token: string): SuperAdminAuthResult | null {
  const entry = superAdminAuthCache.get(cacheKey(token, 'super-admin'))
  if (!entry || entry.expiresAt <= Date.now()) return null
  return entry.value
}

export function setCachedSuperAdminAuth(token: string, value: SuperAdminAuthResult): void {
  if (!value.authorized) return
  superAdminAuthCache.set(cacheKey(token, 'super-admin'), {
    value,
    expiresAt: Date.now() + ADMIN_AUTH_TTL_MS,
  })
}

export function clearServerAuthCache(): void {
  adminAuthCache.clear()
  superAdminAuthCache.clear()
}
