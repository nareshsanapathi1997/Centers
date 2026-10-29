/**
 * Sync permissions table with lib/admin-permission-catalog.ts definitions.
 * Adds missing permissions and removes deprecated resources (centers, contact page, etc.).
 *
 * Run: node scripts/sync-permissions.js
 */
require('dotenv').config()

const { Pool } = require('pg')

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
})

const DEPRECATED_RESOURCES = [
  'centers',
  'contact_page',
  'contact-page',
  'student_stories',
  'image_library',
  'cta_sliders',
  'alerts',
]

const PERMISSION_RESOURCES = [
  { resource: 'sections', label: 'Sections', actions: ['read', 'update'] },
  { resource: 'hero', label: 'Home Page Slider', actions: ['read', 'create', 'update', 'delete'] },
  { resource: 'news', label: 'News & Notifications', actions: ['read', 'create', 'update', 'delete'] },
  { resource: 'courses', label: 'Courses', actions: ['read', 'create', 'update', 'delete'] },
  { resource: 'results', label: 'Results', actions: ['read', 'create', 'update', 'delete'] },
  { resource: 'testimonials', label: 'Testimonials', actions: ['read', 'create', 'update', 'delete'] },
  { resource: 'leadership', label: 'Directors', actions: ['read', 'create', 'update', 'delete'] },
  { resource: 'senior_faculty', label: 'Senior Faculty', actions: ['read', 'create', 'update', 'delete'] },
  { resource: 'gallery', label: 'Gallery', actions: ['read', 'create', 'update', 'delete'] },
  { resource: 'blog', label: 'Blog', actions: ['read', 'create', 'update', 'delete'] },
  { resource: 'faq', label: 'People Also Ask', actions: ['read', 'create', 'update', 'delete'] },
  { resource: 'vacancies', label: 'Vacancies', actions: ['read', 'create', 'update', 'delete'] },
  { resource: 'about', label: 'Get To Know Us', actions: ['read', 'create', 'update', 'delete'] },
  { resource: 'custom_sections', label: 'Custom Sections', actions: ['read', 'create', 'update', 'delete'] },
  { resource: 'enquiries', label: 'Enquiries', actions: ['read', 'update', 'delete'] },
  { resource: 'settings', label: 'Center Settings', actions: ['read', 'update'] },
  { resource: 'center_admins', label: 'Center Admins', actions: ['read', 'create', 'update', 'delete'] },
  { resource: 'roles', label: 'Roles & Permissions', actions: ['read', 'create', 'update', 'delete'] },
  { resource: 'course_fees', label: 'Course Pricing', actions: ['read', 'create', 'update'] },
  { resource: 'student_payments', label: 'Student Payments', actions: ['read', 'create', 'update', 'delete'] },
  { resource: 'students', label: 'Student Portal Accounts', actions: ['read', 'create', 'update'] },
  { resource: 'course_materials', label: 'Study Materials', actions: ['read', 'create', 'update', 'delete'] },
  { resource: 'assessments', label: 'Quizzes & Exams', actions: ['read', 'create', 'update', 'delete'] },
  { resource: 'employees', label: 'Employees', actions: ['read', 'create', 'update', 'delete'] },
  { resource: 'expenses', label: 'Expenses', actions: ['read', 'create', 'update', 'delete', 'approve'] },
  { resource: 'reports', label: 'Reports', actions: ['read', 'export'] },
  { resource: 'batches', label: 'Batches', actions: ['read', 'create', 'update', 'delete'] },
  { resource: 'attendance', label: 'Attendance', actions: ['read', 'create', 'update', 'delete'] },
]

async function syncPermissions() {
  const client = await pool.connect()

  try {
    await client.query('BEGIN')

    console.log('Removing deprecated permission resources...')
    const deprecated = await client.query(
      `SELECT id, name, resource FROM permissions WHERE resource = ANY($1::text[])`,
      [DEPRECATED_RESOURCES]
    )

    if (deprecated.rows.length > 0) {
      const ids = deprecated.rows.map((row) => row.id)
      await client.query('DELETE FROM role_permissions WHERE permission_id = ANY($1::int[])', [ids])
      await client.query('DELETE FROM permissions WHERE id = ANY($1::int[])', [ids])
      console.log(`  Removed ${deprecated.rows.length} deprecated permissions`)
    } else {
      console.log('  No deprecated permissions found')
    }

    console.log('Upserting content & management permissions...')
    let added = 0
    for (const def of PERMISSION_RESOURCES) {
      for (const action of def.actions) {
        const name = `${def.resource}.${action}`
        const result = await client.query(
          `INSERT INTO permissions (name, resource, action, description)
           VALUES ($1, $2, $3, $4)
           ON CONFLICT (name) DO UPDATE SET
             resource = EXCLUDED.resource,
             action = EXCLUDED.action,
             description = EXCLUDED.description
           RETURNING (xmax = 0) AS inserted`,
          [name, def.resource, action, `${action} ${def.label}`]
        )
        if (result.rows[0]?.inserted) added++
      }
    }

    console.log(`  Synced ${PERMISSION_RESOURCES.length} resources (${added} new rows)`)

    const adminRoles = await client.query(
      "SELECT id FROM roles WHERE name = 'Admin' AND is_system_role = true LIMIT 1"
    )
    if (adminRoles.rows.length > 0) {
      const adminRoleId = adminRoles.rows[0].id
      const allPerms = await client.query('SELECT id FROM permissions')
      for (const perm of allPerms.rows) {
        await client.query(
          'INSERT INTO role_permissions (role_id, permission_id) VALUES ($1, $2) ON CONFLICT DO NOTHING',
          [adminRoleId, perm.id]
        )
      }
      console.log('  Ensured Admin system role has all current permissions')
    }

    await client.query('COMMIT')
    console.log('\n✅ Permission sync completed')
  } catch (error) {
    await client.query('ROLLBACK')
    console.error('❌ Permission sync failed:', error)
    process.exit(1)
  } finally {
    client.release()
    await pool.end()
  }
}

if (!process.env.DATABASE_URL) {
  console.error('DATABASE_URL is not set in .env')
  process.exit(1)
}

syncPermissions()
