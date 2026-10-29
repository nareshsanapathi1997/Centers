const { Pool } = require('pg')
require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') })

const pool = new Pool({ connectionString: process.env.DATABASE_URL })

const sql = `
CREATE TABLE IF NOT EXISTS contact_page_content (
  id SERIAL PRIMARY KEY,
  center_id INTEGER REFERENCES centers(id) ON DELETE CASCADE NOT NULL UNIQUE,
  heading VARCHAR(500) DEFAULT 'Contact Us',
  intro_text TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
`

async function run() {
  try {
    await pool.query(sql)
    console.log('contact_page_content table created or already exists.')
  } catch (e) {
    console.error(e)
    process.exit(1)
  } finally {
    await pool.end()
  }
}
run()
