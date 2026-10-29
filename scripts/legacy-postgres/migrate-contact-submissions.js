const { Pool } = require('pg')
require('dotenv').config()

async function migrateContactSubmissions() {
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
  })

  try {
    console.log('Migrating contact_submissions table...')

    // Check if contact_submissions table exists
    const tableCheck = await pool.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_name = 'contact_submissions'
      )
    `)

    if (!tableCheck.rows[0].exists) {
      // Create the table if it doesn't exist
      console.log('Creating contact_submissions table...')
      await pool.query(`
        CREATE TABLE contact_submissions (
          id SERIAL PRIMARY KEY,
          center_id INTEGER REFERENCES centers(id) ON DELETE CASCADE,
          full_name VARCHAR(255) NOT NULL,
          email VARCHAR(255) NOT NULL,
          phone VARCHAR(50),
          course_name VARCHAR(255),
          message TEXT,
          is_read BOOLEAN DEFAULT false,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
      `)
      console.log('✅ Table created successfully!')
    } else {
      // Table exists, check for columns and migrate if needed
      console.log('Table exists, checking columns...')

      // Check if 'location' column exists and 'course_name' doesn't
      const locationCheck = await pool.query(`
        SELECT column_name FROM information_schema.columns 
        WHERE table_name = 'contact_submissions' AND column_name = 'location'
      `)

      const courseNameCheck = await pool.query(`
        SELECT column_name FROM information_schema.columns 
        WHERE table_name = 'contact_submissions' AND column_name = 'course_name'
      `)

      if (locationCheck.rows.length > 0 && courseNameCheck.rows.length === 0) {
        // Rename location to course_name
        console.log('Renaming location column to course_name...')
        await pool.query('ALTER TABLE contact_submissions RENAME COLUMN location TO course_name')
        console.log('✅ Column renamed successfully!')
      } else if (courseNameCheck.rows.length === 0) {
        // Add course_name column
        console.log('Adding course_name column...')
        await pool.query('ALTER TABLE contact_submissions ADD COLUMN course_name VARCHAR(255)')
        console.log('✅ Column added successfully!')
      } else {
        console.log('✅ course_name column already exists!')
      }

      // Check if is_read column exists
      const isReadCheck = await pool.query(`
        SELECT column_name FROM information_schema.columns 
        WHERE table_name = 'contact_submissions' AND column_name = 'is_read'
      `)

      if (isReadCheck.rows.length === 0) {
        console.log('Adding is_read column...')
        await pool.query('ALTER TABLE contact_submissions ADD COLUMN is_read BOOLEAN DEFAULT false')
        console.log('✅ is_read column added successfully!')
      } else {
        console.log('✅ is_read column already exists!')
      }
    }

    console.log('\n✅ Migration completed successfully!')

  } catch (error) {
    console.error('❌ Migration failed:', error.message)
    process.exit(1)
  } finally {
    await pool.end()
  }
}

migrateContactSubmissions()
