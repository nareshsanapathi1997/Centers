/**
 * Supports the fail-closed RBAC change in lib/admin-access.ts.
 *
 * Previously an admin with no rows in admin_roles was granted full access, so
 * every center's first admin worked without any role assignment. Denying those
 * admins outright would lock existing centers out, so each center's earliest
 * admin is promoted to an explicit owner instead.
 */
exports.up = async function up(client) {
  await client.query(`
    ALTER TABLE center_admins
    ADD COLUMN IF NOT EXISTS is_owner BOOLEAN NOT NULL DEFAULT false
  `)

  const backfill = await client.query(`
    WITH first_admin AS (
      SELECT DISTINCT ON (center_id) id
      FROM center_admins
      WHERE center_id IS NOT NULL
      ORDER BY center_id, created_at ASC, id ASC
    )
    UPDATE center_admins ca
    SET is_owner = true
    FROM first_admin fa
    WHERE ca.id = fa.id
      AND ca.is_owner = false
    RETURNING ca.id, ca.center_id, ca.username
  `)

  for (const row of backfill.rows) {
    console.log(`\n    owner: center ${row.center_id} -> ${row.username} (id ${row.id})`)
  }

  // Admins that are neither an owner nor hold a role are now denied everything.
  // Surface them so they can be assigned a role deliberately.
  const orphans = await client.query(`
    SELECT ca.id, ca.center_id, ca.username
    FROM center_admins ca
    LEFT JOIN admin_roles ar
      ON ar.admin_id = ca.id AND ar.center_id = ca.center_id
    WHERE ca.is_owner = false
      AND ar.id IS NULL
      AND ca.is_active = true
    ORDER BY ca.center_id, ca.id
  `)

  if (orphans.rowCount > 0) {
    console.warn(
      `\n    WARNING: ${orphans.rowCount} active admin(s) have no owner flag and no role; they have no permissions until one is assigned:`,
    )
    for (const row of orphans.rows) {
      console.warn(`      center ${row.center_id}: ${row.username} (id ${row.id})`)
    }
  }
}
