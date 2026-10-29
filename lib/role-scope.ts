import pool from './db'

/**
 * Roles are scoped to a center; `center_id IS NULL` marks a platform-wide
 * system role that any center may assign.
 *
 * Assignment endpoints take role_id straight from the request body, so without
 * this check a center admin could grant one of another tenant's roles — and
 * with it that role's permission set.
 */
export async function isRoleAssignableByCenter(
  roleId: number | string,
  centerId: number
): Promise<boolean> {
  const id = typeof roleId === 'string' ? parseInt(roleId, 10) : roleId
  if (!Number.isFinite(id)) return false

  const result = await pool.query('SELECT center_id FROM roles WHERE id = $1', [id])
  if (result.rows.length === 0) return false

  const roleCenterId = result.rows[0].center_id
  return roleCenterId === null || Number(roleCenterId) === centerId
}
