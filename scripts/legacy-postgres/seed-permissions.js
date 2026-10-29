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

async function seedPermissions() {
  const client = await pool.connect()

  try {
    await client.query('BEGIN')

    console.log('Seeding default permissions...')

    for (const def of PERMISSION_RESOURCES) {
      for (const action of def.actions) {
        await client.query(
          'INSERT INTO permissions (name, resource, action, description) VALUES ($1, $2, $3, $4) ON CONFLICT (name) DO NOTHING',
          [`${def.resource}.${action}`, def.resource, action, `${action} ${def.label}`]
        )
      }
    }

    console.log('✓ Seeded permissions')

    console.log('Creating default roles...')

    const adminRoleResult = await client.query(
      'INSERT INTO roles (name, description, is_system_role) VALUES ($1, $2, $3) ON CONFLICT (name) DO NOTHING RETURNING id',
      ['Admin', 'Full access to all features', true]
    )

    if (adminRoleResult.rows.length > 0) {
      const adminRoleId = adminRoleResult.rows[0].id
      const allPermsResult = await client.query(
        'SELECT id FROM permissions WHERE NOT (resource = ANY($1::text[]))',
        [DEPRECATED_RESOURCES]
      )
      for (const perm of allPermsResult.rows) {
        await client.query(
          'INSERT INTO role_permissions (role_id, permission_id) VALUES ($1, $2) ON CONFLICT DO NOTHING',
          [adminRoleId, perm.id]
        )
      }
      console.log('✓ Created Admin role with all permissions')
    }

    const editorRoleResult = await client.query(
      'INSERT INTO roles (name, description, is_system_role) VALUES ($1, $2, $3) ON CONFLICT (name) DO NOTHING RETURNING id',
      ['Editor', 'Can create and update content but cannot delete', true]
    )

    if (editorRoleResult.rows.length > 0) {
      const editorRoleId = editorRoleResult.rows[0].id
      const readCreateUpdatePerms = await client.query(
        "SELECT id FROM permissions WHERE action IN ('read', 'create', 'update') AND NOT (resource = ANY($1::text[]))",
        [DEPRECATED_RESOURCES]
      )
      for (const perm of readCreateUpdatePerms.rows) {
        await client.query(
          'INSERT INTO role_permissions (role_id, permission_id) VALUES ($1, $2) ON CONFLICT DO NOTHING',
          [editorRoleId, perm.id]
        )
      }
      console.log('✓ Created Editor role')
    }

    const viewerRoleResult = await client.query(
      'INSERT INTO roles (name, description, is_system_role) VALUES ($1, $2, $3) ON CONFLICT (name) DO NOTHING RETURNING id',
      ['Viewer', 'Read-only access', true]
    )

    if (viewerRoleResult.rows.length > 0) {
      const viewerRoleId = viewerRoleResult.rows[0].id
      const readPerms = await client.query(
        "SELECT id FROM permissions WHERE action = 'read' AND NOT (resource = ANY($1::text[]))",
        [DEPRECATED_RESOURCES]
      )
      for (const perm of readPerms.rows) {
        await client.query(
          'INSERT INTO role_permissions (role_id, permission_id) VALUES ($1, $2) ON CONFLICT DO NOTHING',
          [viewerRoleId, perm.id]
        )
      }
      console.log('✓ Created Viewer role')
    }

    await client.query('COMMIT')
    console.log('\n✅ Permissions and roles seeded successfully!')
  } catch (error) {
    await client.query('ROLLBACK')
    console.error('Error seeding permissions:', error)
    throw error
  } finally {
    client.release()
  }
}

seedPermissions()
  .then(() => {
    console.log('\nMigration completed!')
    process.exit(0)
  })
  .catch((error) => {
    console.error('\nMigration failed:', error)
    process.exit(1)
  })
