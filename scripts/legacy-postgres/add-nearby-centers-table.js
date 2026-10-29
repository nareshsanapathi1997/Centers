const { Pool } = require('pg')
const path = require('path')
require('dotenv').config({ path: path.join(__dirname, '../.env.local') })

const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '5432'),
  database: process.env.DB_NAME,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
})

async function addNearbyCentersTable() {
  try {
    console.log('Creating nearby_centers table...')

    await pool.query(`
      CREATE TABLE IF NOT EXISTS nearby_centers (
        id SERIAL PRIMARY KEY,
        center_id INTEGER REFERENCES centers(id) ON DELETE CASCADE,
        nearby_center_id INTEGER REFERENCES centers(id) ON DELETE CASCADE,
        display_order INTEGER DEFAULT 0,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(center_id, nearby_center_id),
        CHECK (center_id != nearby_center_id)
      )
    `)

    console.log('Creating index on nearby_centers...')
    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_nearby_centers_center_id ON nearby_centers(center_id)
    `)
    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_nearby_centers_nearby_center_id ON nearby_centers(nearby_center_id)
    `)

    console.log('✅ nearby_centers table created successfully!')
    process.exit(0)
  } catch (error) {
    console.error('❌ Error creating nearby_centers table:', error)
    process.exit(1)
  }
}

addNearbyCentersTable()
