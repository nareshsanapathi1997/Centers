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

async function createSuperAdmin() {
  try {
    const readline = require('readline').createInterface({
      input: process.stdin,
      output: process.stdout,
    })

    const question = (query) =>
      new Promise((resolve) => readline.question(query, resolve))

    console.log('=== Create Super Admin ===\n')

    const username = await question('Username: ')
    const email = await question('Email: ')
    const password = await question('Password: ')
    const fullName = await question('Full Name: ')

    if (!username || !email || !password) {
      console.log('\n❌ Username, email, and password are required!')
      readline.close()
      await pool.end()
      return
    }

    // Check if username already exists
    const existingUser = await pool.query(
      'SELECT id FROM super_admins WHERE username = $1 OR email = $2',
      [username, email]
    )

    if (existingUser.rows.length > 0) {
      console.log('\n❌ Username or email already exists!')
      readline.close()
      await pool.end()
      return
    }

    // Hash password
    const passwordHash = await bcrypt.hash(password, 10)

    // Create super admin
    const result = await pool.query(
      `INSERT INTO super_admins (username, email, password_hash, full_name)
       VALUES ($1, $2, $3, $4)
       RETURNING id, username, email, full_name`,
      [username, email, passwordHash, fullName || null]
    )

    console.log('\n✅ Super admin created successfully!')
    console.log('\nDetails:')
    console.log(`  ID: ${result.rows[0].id}`)
    console.log(`  Username: ${result.rows[0].username}`)
    console.log(`  Email: ${result.rows[0].email}`)
    console.log(`  Full Name: ${result.rows[0].full_name || 'N/A'}`)
    console.log('\nYou can now login at: http://localhost:3600/super-admin/login')

    readline.close()
  } catch (error) {
    console.error('Error:', error.message)
    console.error(error)
  } finally {
    await pool.end()
  }
}

createSuperAdmin()

