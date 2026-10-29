require('dotenv').config()
const { Pool } = require('pg')

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
})

if (!process.env.DATABASE_URL) {
  console.error('ERROR: DATABASE_URL environment variable is not set.')
  console.error('Make sure you have a .env file with DATABASE_URL configured.')
  process.exit(1)
}

async function addSeniorFacultyTable() {
  const client = await pool.connect()
  
  try {
    console.log('Checking if senior_faculty table exists...')
    
    // Check if table exists
    const tableCheck = await client.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_name = 'senior_faculty'
      )
    `)
    
    if (tableCheck.rows[0].exists) {
      console.log('✅ senior_faculty table already exists!')
      return
    }
    
    console.log('Creating senior_faculty table...')
    
    // Create the table
    await client.query(`
      CREATE TABLE IF NOT EXISTS senior_faculty (
        id SERIAL PRIMARY KEY,
        center_id INTEGER REFERENCES centers(id) ON DELETE CASCADE,
        name VARCHAR(255) NOT NULL,
        role VARCHAR(255) NOT NULL,
        description TEXT,
        image_url TEXT,
        display_order INTEGER DEFAULT 0,
        is_active BOOLEAN DEFAULT true,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `)
    
    console.log('✅ senior_faculty table created successfully!')
    console.log('\nYou can now:')
    console.log('1. Access the admin panel at /admin/[centerId]/senior-faculty')
    console.log('2. Add senior faculty members through the admin interface')
    
  } catch (error) {
    console.error('❌ Error creating senior_faculty table:', error.message)
    process.exit(1)
  } finally {
    client.release()
    await pool.end()
  }
}

addSeniorFacultyTable()
