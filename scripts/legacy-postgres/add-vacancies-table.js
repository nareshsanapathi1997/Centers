const { Pool } = require('pg')
require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') })

const pool = new Pool({ connectionString: process.env.DATABASE_URL })

const sql = `
CREATE TABLE IF NOT EXISTS vacancies (
  id SERIAL PRIMARY KEY,
  center_id INTEGER REFERENCES centers(id) ON DELETE CASCADE NOT NULL,
  title VARCHAR(255) NOT NULL,
  description TEXT,
  experience VARCHAR(255),
  ctc VARCHAR(255),
  nature VARCHAR(255),
  contact_phone VARCHAR(50),
  display_order INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
`

async function run() {
  try {
    await pool.query(sql)
    console.log('Vacancies table created or already exists.')
  } catch (e) {
    console.error(e)
    process.exit(1)
  } finally {
    await pool.end()
  }
}
run()
