require('dotenv').config()
const fs = require('fs')
const path = require('path')
const { Pool } = require('pg')

const pool = new Pool({ connectionString: process.env.DATABASE_URL })

async function migrate() {
  const schemaPath = path.join(__dirname, '..', 'lib', 'student-portal-schema.sql')
  const extensionsPath = path.join(__dirname, '..', 'lib', 'student-portal-extensions.sql')
  const baseSql = fs.readFileSync(schemaPath, 'utf8')
  const extSql = fs.readFileSync(extensionsPath, 'utf8')

  try {
    console.log('Running student portal migration...')
    await pool.query(baseSql)
    console.log('✓ students table and student_id column ready')

    console.log('Running student portal extensions...')
    await pool.query(extSql)
    console.log('✓ OTP and course materials tables ready')

    const linkResult = await pool.query(`
      UPDATE student_fee_payments sfp
      SET student_id = s.id
      FROM students s
      WHERE sfp.student_id IS NULL
        AND sfp.center_id = s.center_id
        AND sfp.student_mobile = s.mobile
    `)
    console.log(`✓ Linked ${linkResult.rowCount || 0} existing payments to student accounts`)

    console.log('✅ Student portal migration succeeded!')
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
