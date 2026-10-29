require('dotenv').config()
const { Pool } = require('pg')

const pool = new Pool({ connectionString: process.env.DATABASE_URL })

async function migrateLeafToCourse() {
  try {
    console.log('Merging leaf_course rows into course level...')

    const result = await pool.query(`
      UPDATE course_masters
      SET level_type = 'course', updated_at = CURRENT_TIMESTAMP
      WHERE level_type = 'leaf_course'
      RETURNING id
    `)

    console.log(`Updated ${result.rowCount} row(s) from leaf_course → course`)
    console.log('✅ Course levels unified')
  } catch (error) {
    console.error('Migration failed:', error)
    process.exit(1)
  } finally {
    await pool.end()
  }
}

if (!process.env.DATABASE_URL) {
  console.error('DATABASE_URL is not set')
  process.exit(1)
}

migrateLeafToCourse()
