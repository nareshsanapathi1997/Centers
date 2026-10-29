const { Pool } = require('pg')
const fs = require('fs')
const path = require('path')
require('dotenv').config()

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
})

async function addStudentStoriesTable() {
  try {
    console.log('Reading student stories schema...')
    const schemaPath = path.join(__dirname, '..', 'lib', 'student-stories-schema.sql')
    const schema = fs.readFileSync(schemaPath, 'utf-8')

    console.log('Executing schema...')
    await pool.query(schema)

    console.log('✅ Student Stories table created successfully!')
    
    // Verify table exists
    const result = await pool.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'student_stories'
      );
    `)
    
    if (result.rows[0].exists) {
      console.log('✅ Verification: student_stories table exists')
    } else {
      console.log('⚠️  Warning: Could not verify table creation')
    }
  } catch (error) {
    console.error('❌ Error creating student stories table:', error)
    process.exit(1)
  } finally {
    await pool.end()
  }
}

addStudentStoriesTable()
