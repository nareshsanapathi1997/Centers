require('dotenv').config()
const { Pool } = require('pg')

const pool = new Pool({ connectionString: process.env.DATABASE_URL })

const COLUMNS = [
  { name: 'batch_timing', sql: 'VARCHAR(255)' },
  { name: 'schedule_days', sql: 'VARCHAR(255)' },
  { name: 'capacity', sql: 'INTEGER' },
  { name: 'enrollment_deadline', sql: 'DATE' },
  { name: 'notes', sql: 'TEXT' },
]

async function migrate() {
  try {
    console.log('Adding course_master_batches columns...')
    for (const col of COLUMNS) {
      await pool.query(
        `ALTER TABLE course_master_batches ADD COLUMN IF NOT EXISTS ${col.name} ${col.sql}`
      )
      console.log(`  + ${col.name}`)
    }
    console.log('✅ Batch columns ready')
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

migrate()
