require('dotenv').config()
const { Pool } = require('pg')

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
})

if (!process.env.DATABASE_URL) {
  console.error('ERROR: DATABASE_URL environment variable is not set.')
  process.exit(1)
}

async function migrate() {
  const client = await pool.connect()

  try {
    console.log('Adding display_order and is_active to leadership table...')

    await client.query(`
      ALTER TABLE leadership
      ADD COLUMN IF NOT EXISTS display_order INTEGER DEFAULT 0,
      ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT true
    `)

    await client.query(`
      UPDATE leadership
      SET display_order = COALESCE(display_order, 0),
          is_active = COALESCE(is_active, true)
      WHERE display_order IS NULL OR is_active IS NULL
    `)

    console.log('✅ leadership table updated for multiple center directors')
  } catch (error) {
    console.error('❌ Migration failed:', error.message)
    process.exit(1)
  } finally {
    client.release()
    await pool.end()
  }
}

migrate()
