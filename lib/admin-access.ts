import pool from './db'
import { verifyAdminAccess } from './auth'
import type { PermissionAction } from './admin-permission-catalog'
import { revalidateCenterArea, type CenterCacheArea } from './center-cache'

/**
 * Permission resource → public cache areas invalidated by a write to it.
 *
 * Hooking invalidation here rather than in each of the ~60 CMS routes means a
 * new route cannot forget it: every mutation already declares its resource to
 * get authorised, and that is exactly the information needed.
 */
const RESOURCE_CACHE_AREAS: Record<string, CenterCacheArea[]> = {
  about: ['about'],
  alerts: ['alerts'],
  blog: ['blog'],
  courses: ['courses'],
  course_fees: ['courses'],
  student_payments: ['courses'],
  cta_sliders: ['cta_sliders'],
  custom_sections: ['custom_sections'],
  faq: ['faq'],
  gallery: ['gallery'],
  hero: ['hero'],
  leadership: ['leadership'],
  news: ['news'],
  notifications: ['notifications'],
  results: ['results'],
  sections: ['sections'],
  senior_faculty: ['senior_faculty'],
  settings: ['center', 'sections', 'seo'],
  student_stories: ['student_stories'],
  testimonials: ['testimonials'],
  vacancies: ['vacancies'],
}

const WRITE_ACTIONS = new Set<PermissionAction>(['create', 'update', 'delete'])

export type AdminAccessGrant = {
  resource: string
  action: string
}

export type AdminAccessProfile = {
  fullAccess: boolean
  roleIds: number[]
  roleNames: string[]
  grants: AdminAccessGrant[]
}

export async function getAdminAccessProfile(
  adminId: number,
  centerId: number
): Promise<AdminAccessProfile> {
  const [ownerResult, roleResult] = await Promise.all([
    pool.query(
      `SELECT is_owner FROM center_admins WHERE id = $1 AND center_id = $2`,
      [adminId, centerId]
    ),
    pool.query(
      `SELECT r.id, r.name
       FROM admin_roles ar
       JOIN roles r ON r.id = ar.role_id
       WHERE ar.admin_id = $1 AND ar.center_id = $2`,
      [adminId, centerId]
    ),
  ])

  // Only an explicit center owner gets unrestricted access. An admin with no
  // roles is denied everything rather than escalated to full access.
  if (ownerResult.rows[0]?.is_owner === true) {
    return {
      fullAccess: true,
      roleIds: roleResult.rows.map((r) => r.id),
      roleNames: roleResult.rows.map((r) => r.name),
      grants: [],
    }
  }

  if (roleResult.rows.length === 0) {
    return {
      fullAccess: false,
      roleIds: [],
      roleNames: [],
      grants: [],
    }
  }

  const roleIds = roleResult.rows.map((r) => r.id)
  const permResult = await pool.query(
    `SELECT DISTINCT p.resource, p.action
     FROM role_permissions rp
     JOIN permissions p ON p.id = rp.permission_id
     WHERE rp.role_id = ANY($1::int[])
     ORDER BY p.resource, p.action`,
    [roleIds]
  )

  return {
    fullAccess: false,
    roleIds,
    roleNames: roleResult.rows.map((r) => r.name),
    grants: permResult.rows,
  }
}

export function hasAdminPermission(
  profile: AdminAccessProfile,
  resource: string,
  action: PermissionAction = 'read'
): boolean {
  if (profile.fullAccess) return true
  return profile.grants.some((g) => g.resource === resource && g.action === action)
}

export async function requireAdminPermission(
  token: string,
  centerId: number,
  resource: string,
  action: PermissionAction = 'read'
): Promise<
  | { ok: true; adminId: number; profile: AdminAccessProfile }
  | { ok: false; error: string; status: number }
> {
  const auth = await verifyAdminAccess(token, centerId)
  if (!auth.authorized || !auth.adminId) {
    return { ok: false, error: auth.error || 'Unauthorized', status: 403 }
  }

  const profile = await getAdminAccessProfile(auth.adminId, centerId)
  if (!hasAdminPermission(profile, resource, action)) {
    return { ok: false, error: 'Insufficient permissions', status: 403 }
  }

  // Route handlers flush revalidations when the response is sent, so marking the
  // tags here still takes effect after the handler's database write.
  if (WRITE_ACTIONS.has(action)) {
    const areas = RESOURCE_CACHE_AREAS[resource]
    if (areas) revalidateCenterArea(centerId, ...areas)
  }

  return { ok: true, adminId: auth.adminId, profile }
}

export function httpMethodToAction(method: string): PermissionAction {
  switch (method.toUpperCase()) {
    case 'POST':
      return 'create'
    case 'PUT':
    case 'PATCH':
      return 'update'
    case 'DELETE':
      return 'delete'
    default:
      return 'read'
  }
}
