require('dotenv').config()
const { Pool } = require('pg')
const fs = require('fs')
const path = require('path')

const pool = new Pool({ connectionString: process.env.DATABASE_URL })

async function run() {
  const schemaPath = path.join(__dirname, '..', 'lib', 'student-profile-extras-schema.sql')
  const sql = fs.readFileSync(schemaPath, 'utf8')
  await pool.query(sql)
  console.log('✅ Student profile extras migrated (photo_url, notify_email, notify_in_app)')
  await pool.end()
}

run().catch((err) => {
  console.error(err)
  process.exit(1)
})
