const { Pool } = require('pg')
const bcrypt = require('bcryptjs')
require('dotenv').config()

// Try .env.local first, then .env
if (!process.env.DATABASE_URL) {
  require('dotenv').config({ path: '.env.local' })
}

if (!process.env.DATABASE_URL) {
  console.error('❌ DATABASE_URL not found in .env or .env.local file')
  process.exit(1)
}

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
})

async function createDefaultSuperAdmin() {
  try {
    // One-time credentials — password is random and printed once
    const crypto = require('crypto')
    const username = 'superadmin'
    const email = 'superadmin@admin.com'
    const password = `Sa-${crypto.randomBytes(5).toString('hex')}!`
    const fullName = 'Super Admin'

    console.log('=== Creating Default Super Admin ===\n')
    console.log('Credentials (save now — not stored in plaintext):')
    console.log(`  Username: ${username}`)
    console.log(`  Email: ${email}`)
    console.log(`  Password: ${password}`)
    console.log(`  Full Name: ${fullName}\n`)

    // Check if super_admins table exists
    try {
      await pool.query('SELECT 1 FROM super_admins LIMIT 1')
    } catch (error) {
      console.log('⚠️  super_admins table does not exist. Creating it...')
      await pool.query(`
        CREATE TABLE IF NOT EXISTS super_admins (
          id SERIAL PRIMARY KEY,
          username VARCHAR(255) UNIQUE NOT NULL,
          email VARCHAR(255) UNIQUE NOT NULL,
          password_hash TEXT NOT NULL,
          full_name VARCHAR(255),
          is_active BOOLEAN DEFAULT true,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
      `)
      console.log('✅ super_admins table created')
    }

    // Check if username already exists
    const existingUser = await pool.query(
      'SELECT id FROM super_admins WHERE username = $1 OR email = $2',
      [username, email]
    )

    if (existingUser.rows.length > 0) {
      console.log('⚠️  Super admin already exists!')
      console.log('\nExisting super admin details:')
      const user = await pool.query(
        'SELECT id, username, email, full_name FROM super_admins WHERE username = $1',
        [username]
      )
      console.log(`  ID: ${user.rows[0].id}`)
      console.log(`  Username: ${user.rows[0].username}`)
      console.log(`  Email: ${user.rows[0].email}`)
      console.log(`  Full Name: ${user.rows[0].full_name || 'N/A'}`)
      console.log('\nYou can login at: http://localhost:3600/super-admin/login')
      await pool.end()
      return
    }

    // Hash password
    const passwordHash = await bcrypt.hash(password, 10)

    // Create super admin — force password change on first login when column exists
    const result = await pool.query(
      `INSERT INTO super_admins (username, email, password_hash, full_name, must_change_password)
       VALUES ($1, $2, $3, $4, true)
       RETURNING id, username, email, full_name`,
      [username, email, passwordHash, fullName]
    ).catch(async (error) => {
      if (error.code !== '42703') throw error
      return pool.query(
        `INSERT INTO super_admins (username, email, password_hash, full_name)
         VALUES ($1, $2, $3, $4)
         RETURNING id, username, email, full_name`,
        [username, email, passwordHash, fullName]
      )
    })

    console.log('\n✅ Super admin created successfully!')
    console.log('\nLogin Credentials:')
    console.log(`  Username: ${result.rows[0].username}`)
    console.log(`  Email: ${result.rows[0].email}`)
    console.log(`  Password: ${password}`)
    console.log(`  Full Name: ${result.rows[0].full_name}`)
    console.log('\n🔗 Login URL: http://localhost:3600/super-admin/login')
    console.log('\n⚠️  Please change the password after first login!')

  } catch (error) {
    console.error('\n❌ Error:', error.message)
    if (error.message.includes('password')) {
      console.error('\n💡 Tip: Check your DATABASE_URL in .env file')
      console.error('   Make sure the password in the connection string is properly URL-encoded')
    }
    console.error('\nFull error:', error)
  } finally {
    await pool.end()
  }
}

createDefaultSuperAdmin()

