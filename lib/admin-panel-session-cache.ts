/** Short-lived in-memory cache to avoid repeat auth/center round-trips during admin navigation. */

const TTL_MS = 5 * 60 * 1000

type AdminVerifyEntry = { centerId: string; verifiedAt: number }
type CenterEntry = { data: Record<string, unknown>; fetchedAt: number }
type SuperAdminPermissionsEntry = { data: unknown; fetchedAt: number }
type AdminPermissionsEntry = { centerId: string; data: unknown; fetchedAt: number }

let adminVerify: AdminVerifyEntry | null = null
const adminCenterById = new Map<string, CenterEntry>()
let superAdminVerifiedAt: number | null = null
let superAdminPermissions: SuperAdminPermissionsEntry | null = null
let adminPermissions: AdminPermissionsEntry | null = null

function isFresh(fetchedAt: number): boolean {
  return Date.now() - fetchedAt < TTL_MS
}

export function clearAdminSessionCache() {
  adminVerify = null
  adminCenterById.clear()
  adminPermissions = null
}

export function clearSuperAdminSessionCache() {
  superAdminVerifiedAt = null
  superAdminPermissions = null
}

export function isAdminSessionVerified(centerId: string): boolean {
  return adminVerify?.centerId === centerId && isFresh(adminVerify.verifiedAt)
}

export function markAdminSessionVerified(centerId: string) {
  adminVerify = { centerId, verifiedAt: Date.now() }
}

export function getCachedAdminCenter(centerId: string): Record<string, unknown> | null {
  const entry = adminCenterById.get(centerId)
  if (!entry || !isFresh(entry.fetchedAt)) return null
  return entry.data
}

export function setCachedAdminCenter(centerId: string, data: Record<string, unknown>) {
  adminCenterById.set(centerId, { data, fetchedAt: Date.now() })
}

export function isSuperAdminSessionVerified(): boolean {
  return superAdminVerifiedAt != null && isFresh(superAdminVerifiedAt)
}

export function markSuperAdminSessionVerified() {
  superAdminVerifiedAt = Date.now()
}

export function getCachedSuperAdminPermissions<T>(): T | null {
  if (!superAdminPermissions || !isFresh(superAdminPermissions.fetchedAt)) return null
  return superAdminPermissions.data as T
}

export function setCachedSuperAdminPermissions(data: unknown) {
  superAdminPermissions = { data, fetchedAt: Date.now() }
}

export function getCachedAdminPermissions<T>(centerId: string): T | null {
  if (!adminPermissions || adminPermissions.centerId !== centerId || !isFresh(adminPermissions.fetchedAt)) {
    return null
  }
  return adminPermissions.data as T
}

export function setCachedAdminPermissions(centerId: string, data: unknown) {
  adminPermissions = { centerId, data, fetchedAt: Date.now() }
}
