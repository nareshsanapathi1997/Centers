/**
 * Scopes `roles` to a center so a center admin cannot read or modify another
 * tenant's roles.
 *
 * `center_id IS NULL` means a platform-wide role (the seeded system roles).
 * Those stay readable by every center but are not editable by center admins.
 *
 * The old global UNIQUE(name) is replaced so two centers can both have a role
 * called e.g. "Manager". Postgres does not enforce uniqueness across NULLs, so
 * global role names need their own partial index.
 */
exports.up = async function up(client) {
  await client.query(`
    ALTER TABLE roles
    ADD COLUMN IF NOT EXISTS center_id INTEGER REFERENCES centers(id) ON DELETE CASCADE
  `)

  // Infer the owning center for custom roles from who they are assigned to.
  // Only unambiguous cases (exactly one center) are backfilled.
  const backfill = await client.query(`
    WITH role_center AS (
      SELECT role_id, MIN(center_id) AS center_id, COUNT(DISTINCT center_id) AS center_count
      FROM admin_roles
      WHERE center_id IS NOT NULL
      GROUP BY role_id
    )
    UPDATE roles r
    SET center_id = rc.center_id
    FROM role_center rc
    WHERE r.id = rc.role_id
      AND rc.center_count = 1
      AND r.center_id IS NULL
      AND COALESCE(r.is_system_role, false) = false
    RETURNING r.id, r.name, r.center_id
  `)

  for (const row of backfill.rows) {
    console.log(`\n    scoped role "${row.name}" (id ${row.id}) to center ${row.center_id}`)
  }

  const ambiguous = await client.query(`
    SELECT r.id, r.name, COUNT(DISTINCT ar.center_id) AS center_count
    FROM roles r
    JOIN admin_roles ar ON ar.role_id = r.id
    WHERE r.center_id IS NULL
      AND COALESCE(r.is_system_role, false) = false
    GROUP BY r.id, r.name
    HAVING COUNT(DISTINCT ar.center_id) > 1
  `)

  if (ambiguous.rowCount > 0) {
    console.warn(
      `\n    WARNING: ${ambiguous.rowCount} custom role(s) are assigned across multiple centers and stay global:`,
    )
    for (const row of ambiguous.rows) {
      console.warn(`      "${row.name}" (id ${row.id}) used by ${row.center_count} centers`)
    }
    console.warn('      Split these per center manually if they should not be shared.')
  }

  // Replace the global name uniqueness with per-center uniqueness.
  const constraints = await client.query(`
    SELECT conname FROM pg_constraint
    WHERE conrelid = 'roles'::regclass AND contype = 'u'
  `)
  for (const row of constraints.rows) {
    await client.query(`ALTER TABLE roles DROP CONSTRAINT IF EXISTS ${row.conname}`)
  }

  await client.query(`
    CREATE UNIQUE INDEX IF NOT EXISTS idx_roles_center_name
      ON roles(center_id, name) WHERE center_id IS NOT NULL
  `)
  await client.query(`
    CREATE UNIQUE INDEX IF NOT EXISTS idx_roles_global_name
      ON roles(name) WHERE center_id IS NULL
  `)
}
