require('dotenv').config()

const { Pool } = require('pg')

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
})

const PERMISSION_RESOURCES = [
  { resource: 'dashboard', label: 'Dashboard', actions: ['read'] },
  { resource: 'centers', label: 'Centers', actions: ['read', 'create', 'update', 'delete'] },
  { resource: 'courses', label: 'Courses', actions: ['read', 'create', 'update', 'delete'] },
  { resource: 'course_masters', label: 'Course Masters', actions: ['read', 'create', 'update', 'delete'] },
  { resource: 'nearby_centers', label: 'Nearby Centers', actions: ['read', 'create', 'update', 'delete'] },
  { resource: 'course_fees', label: 'Course Fee Management', actions: ['read', 'create', 'update', 'delete'] },
  { resource: 'employees', label: 'Employees', actions: ['read', 'create', 'update', 'delete'] },
  { resource: 'expenses', label: 'Expenses', actions: ['read', 'create', 'update', 'delete', 'approve'] },
  { resource: 'batches', label: 'Batches', actions: ['read', 'create', 'update', 'delete'] },
  { resource: 'attendance', label: 'Attendance', actions: ['read', 'create', 'update', 'delete'] },
  { resource: 'analytics', label: 'Analytics', actions: ['read'] },
  { resource: 'reports', label: 'Reports', actions: ['read', 'export'] },
  { resource: 'activity_logs', label: 'Activity Logs', actions: ['read'] },
  { resource: 'super_admins', label: 'Super Admins', actions: ['read', 'create', 'update', 'delete'] },
  { resource: 'center_admins', label: 'Center Admins', actions: ['read', 'create', 'update', 'delete'] },
  { resource: 'super_admin_roles', label: 'Roles & Permissions', actions: ['read', 'create', 'update', 'delete'] },
  { resource: 'contact_submissions', label: 'Contact Submissions', actions: ['read', 'update', 'delete'] },
  { resource: 'notifications', label: 'Notifications', actions: ['read', 'update'] },
  { resource: 'send_messages', label: 'Send Messages', actions: ['read', 'create'] },
  { resource: 'email_templates', label: 'Email Templates', actions: ['read', 'create', 'update', 'delete'] },
  { resource: 'approvals', label: 'Content Approvals', actions: ['read', 'update'] },
  { resource: 'seo', label: 'SEO Management', actions: ['read', 'create', 'update', 'delete'] },
  { resource: 'settings_hero', label: 'Settings · Hero Section', actions: ['read', 'update'] },
  { resource: 'settings_logo', label: 'Settings · Logo & Favicon', actions: ['read', 'update'] },
  { resource: 'settings_theme', label: 'Settings · Theme', actions: ['read', 'update'] },
  { resource: 'settings_navigation', label: 'Settings · Header Navigation', actions: ['read', 'update'] },
  { resource: 'settings_menu_items', label: 'Settings · Menu Items', actions: ['read', 'update'] },
  { resource: 'settings_mobile_app', label: 'Settings · Mobile App', actions: ['read', 'update'] },
  { resource: 'settings_footer', label: 'Settings · Footer', actions: ['read', 'update'] },
  { resource: 'settings_approvals', label: 'Settings · Content Approvals', actions: ['read', 'update'] },
  { resource: 'settings_global', label: 'Settings · Global Settings', actions: ['read', 'update'] },
]

async function syncSuperAdminPermissions() {
  const client = await pool.connect()

  try {
    await client.query('BEGIN')

    console.log('Upserting super admin permissions...')
    for (const def of PERMISSION_RESOURCES) {
      for (const action of def.actions) {
        await client.query(
          `INSERT INTO super_admin_permissions (name, resource, action, description)
           VALUES ($1, $2, $3, $4)
           ON CONFLICT (name) DO UPDATE SET
             resource = EXCLUDED.resource,
             action = EXCLUDED.action,
             description = EXCLUDED.description`,
          [`sa.${def.resource}.${action}`, def.resource, action, `${action} ${def.label}`]
        )
      }
    }

    const roleResult = await client.query(
      `INSERT INTO super_admin_roles (name, description, is_system_role)
       VALUES ($1, $2, true)
       ON CONFLICT (name) DO UPDATE SET description = EXCLUDED.description
       RETURNING id`,
      ['Super Admin', 'Full access to all super admin sections']
    )
    const superAdminRoleId = roleResult.rows[0].id

    const allPerms = await client.query('SELECT id FROM super_admin_permissions')
    for (const perm of allPerms.rows) {
      await client.query(
        'INSERT INTO super_admin_role_permissions (role_id, permission_id) VALUES ($1, $2) ON CONFLICT DO NOTHING',
        [superAdminRoleId, perm.id]
      )
    }

    const editorRole = await client.query(
      `INSERT INTO super_admin_roles (name, description, is_system_role)
       VALUES ($1, $2, true)
       ON CONFLICT (name) DO UPDATE SET description = EXCLUDED.description
       RETURNING id`,
      ['Editor', 'Can manage content but not super admin users or roles']
    )
    const editorRoleId = editorRole.rows[0].id
    await client.query('DELETE FROM super_admin_role_permissions WHERE role_id = $1', [editorRoleId])
    const editorPerms = await client.query(
      `SELECT id FROM super_admin_permissions
       WHERE action IN ('read', 'create', 'update')
       AND resource NOT IN ('super_admins', 'super_admin_roles')`
    )
    for (const perm of editorPerms.rows) {
      await client.query(
        'INSERT INTO super_admin_role_permissions (role_id, permission_id) VALUES ($1, $2) ON CONFLICT DO NOTHING',
        [editorRoleId, perm.id]
      )
    }

    const viewerRole = await client.query(
      `INSERT INTO super_admin_roles (name, description, is_system_role)
       VALUES ($1, $2, true)
       ON CONFLICT (name) DO UPDATE SET description = EXCLUDED.description
       RETURNING id`,
      ['Viewer', 'Read-only access to super admin sections']
    )
    const viewerRoleId = viewerRole.rows[0].id
    await client.query('DELETE FROM super_admin_role_permissions WHERE role_id = $1', [viewerRoleId])
    const readPerms = await client.query("SELECT id FROM super_admin_permissions WHERE action = 'read'")
    for (const perm of readPerms.rows) {
      await client.query(
        'INSERT INTO super_admin_role_permissions (role_id, permission_id) VALUES ($1, $2) ON CONFLICT DO NOTHING',
        [viewerRoleId, perm.id]
      )
    }

    await client.query('COMMIT')
    console.log('✅ Super admin permissions and default roles synced')
  } catch (error) {
    await client.query('ROLLBACK')
    console.error('❌ Sync failed:', error)
    process.exit(1)
  } finally {
    client.release()
    await pool.end()
  }
}

if (!process.env.DATABASE_URL) {
  console.error('DATABASE_URL is not set')
  process.exit(1)
}

syncSuperAdminPermissions()
