require('dotenv').config()

const { Pool } = require('pg')

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
})

async function addSuperAdminRbac() {
  const client = await pool.connect()

  try {
    await client.query('BEGIN')

    console.log('Creating super admin RBAC tables...')

    await client.query(`
      CREATE TABLE IF NOT EXISTS super_admin_permissions (
        id SERIAL PRIMARY KEY,
        name VARCHAR(120) UNIQUE NOT NULL,
        resource VARCHAR(100) NOT NULL,
        action VARCHAR(50) NOT NULL,
        description TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `)

    await client.query(`
      CREATE TABLE IF NOT EXISTS super_admin_roles (
        id SERIAL PRIMARY KEY,
        name VARCHAR(100) UNIQUE NOT NULL,
        description TEXT,
        is_system_role BOOLEAN DEFAULT false,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `)

    await client.query(`
      CREATE TABLE IF NOT EXISTS super_admin_role_permissions (
        id SERIAL PRIMARY KEY,
        role_id INTEGER REFERENCES super_admin_roles(id) ON DELETE CASCADE,
        permission_id INTEGER REFERENCES super_admin_permissions(id) ON DELETE CASCADE,
        UNIQUE(role_id, permission_id)
      )
    `)

    await client.query(`
      CREATE TABLE IF NOT EXISTS super_admin_user_roles (
        id SERIAL PRIMARY KEY,
        super_admin_id INTEGER REFERENCES super_admins(id) ON DELETE CASCADE,
        role_id INTEGER REFERENCES super_admin_roles(id) ON DELETE CASCADE,
        assigned_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(super_admin_id)
      )
    `)

    await client.query('COMMIT')
    console.log('✅ Super admin RBAC tables ready')
    console.log('\nNext: node scripts/sync-super-admin-permissions.js')
  } catch (error) {
    await client.query('ROLLBACK')
    console.error('❌ Failed:', error)
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

addSuperAdminRbac()
