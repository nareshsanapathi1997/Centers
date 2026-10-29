const { Pool } = require('pg')
require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') })

const pool = new Pool({ connectionString: process.env.DATABASE_URL })

const sql = `
ALTER TABLE courses ADD COLUMN IF NOT EXISTS description TEXT;
`

async function run() {
  try {
    await pool.query(sql)
    console.log('Courses table: description column added or already exists.')
  } catch (e) {
    console.error(e)
    process.exit(1)
  } finally {
    await pool.end()
  }
}
run()
