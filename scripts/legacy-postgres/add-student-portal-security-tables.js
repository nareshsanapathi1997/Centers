require('dotenv').config()
const { Pool } = require('pg')
const fs = require('fs')
const path = require('path')

const pool = new Pool({ connectionString: process.env.DATABASE_URL })

async function run() {
  const schemaPath = path.join(__dirname, '..', 'lib', 'student-portal-security-schema.sql')
  const sql = fs.readFileSync(schemaPath, 'utf8')
  await pool.query(sql)
  console.log('✅ Student portal security tables migrated')
  await pool.end()
}

run().catch((err) => {
  console.error(err)
  process.exit(1)
})
