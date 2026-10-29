require('dotenv').config()
const fs = require('fs')
const path = require('path')
const { Pool } = require('pg')

const pool = new Pool({ connectionString: process.env.DATABASE_URL })

async function migrate() {
  try {
    const sqlPath = path.join(__dirname, '..', 'lib', 'course-fees-payment-extensions.sql')
    const sql = fs.readFileSync(sqlPath, 'utf8')
    console.log('Running course fee payment extensions migration...')
    await pool.query(sql)
    console.log('✅ Payment extensions migration succeeded!')
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
