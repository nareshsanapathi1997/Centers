import { NextRequest } from 'next/server'
import pool from '@/lib/db'
import { verifySuperAdminAccess } from '@/lib/auth'
import { forbidden, unauthorized } from '@/lib/api-response'
import { httpMethodToAction } from '@/lib/admin-access'
import {
  buildSuperAdminPermissionSeedRecords,
  getSuperAdminResourceForPath,
  type SuperAdminPermissionAction,
  type SuperAdminPermissionRow,
} from '@/lib/super-admin-permission-catalog'

export type SuperAdminAccessGrant = {
  resource: string
  action: string
}

export type SuperAdminAccessProfile = {
  fullAccess: boolean
  roleId: number | null
  roleName: string | null
  grants: SuperAdminAccessGrant[]
}

export async function getSuperAdminAccessProfile(superAdminId: number): Promise<SuperAdminAccessProfile> {
  const roleResult = await pool.query(
    `SELECT r.id, r.name
     FROM super_admin_user_roles ur
     JOIN super_admin_roles r ON r.id = ur.role_id
     WHERE ur.super_admin_id = $1
     LIMIT 1`,
    [superAdminId]
  )

  if (roleResult.rows.length === 0) {
    return {
      fullAccess: true,
      roleId: null,
      roleName: null,
      grants: buildSuperAdminPermissionSeedRecords().map((item) => ({
        resource: item.resource,
        action: item.action,
      })),
    }
  }

  const role = roleResult.rows[0]
  const permResult = await pool.query(
    `SELECT p.resource, p.action
     FROM super_admin_role_permissions rp
     JOIN super_admin_permissions p ON p.id = rp.permission_id
     WHERE rp.role_id = $1
     ORDER BY p.resource, p.action`,
    [role.id]
  )

  return {
    fullAccess: false,
    roleId: role.id,
    roleName: role.name,
    grants: permResult.rows,
  }
}

export function hasSuperAdminPermission(
  profile: SuperAdminAccessProfile,
  resource: string,
  action: SuperAdminPermissionAction = 'read'
): boolean {
  if (profile.fullAccess) return true
  return profile.grants.some((grant) => grant.resource === resource && grant.action === action)
}

export function canAccessSuperAdminPath(
  pathname: string | null,
  profile: SuperAdminAccessProfile,
  action: SuperAdminPermissionAction = 'read'
): boolean {
  if (!pathname || pathname === '/super-admin/profile') return true
  const resource = getSuperAdminResourceForPath(pathname)
  if (!resource) return true
  return hasSuperAdminPermission(profile, resource, action)
}

export async function assignSuperAdminRole(superAdminId: number, roleId: number | null) {
  await pool.query('DELETE FROM super_admin_user_roles WHERE super_admin_id = $1', [superAdminId])

  if (roleId) {
    await pool.query(
      'INSERT INTO super_admin_user_roles (super_admin_id, role_id) VALUES ($1, $2)',
      [superAdminId, roleId]
    )
  }
}

export async function listSuperAdminPermissions(): Promise<SuperAdminPermissionRow[]> {
  const result = await pool.query('SELECT * FROM super_admin_permissions ORDER BY resource, action')
  return result.rows
}

export async function requireSuperAdminPermission(
  request: NextRequest,
  resource: string,
  action?: SuperAdminPermissionAction
): Promise<
  | { ok: true; adminId: number; profile: SuperAdminAccessProfile }
  | { ok: false; response: ReturnType<typeof unauthorized> }
> {
  const auth = await verifySuperAdminAccess(request)
  if (!auth.isValid || !auth.adminId) {
    return { ok: false, response: unauthorized(auth.error || 'Unauthorized') }
  }

  const resolvedAction = action || httpMethodToAction(request.method)
  const profile = await getSuperAdminAccessProfile(auth.adminId)
  if (!hasSuperAdminPermission(profile, resource, resolvedAction)) {
    return { ok: false, response: forbidden('Insufficient permissions') }
  }

  return { ok: true, adminId: auth.adminId, profile }
}
