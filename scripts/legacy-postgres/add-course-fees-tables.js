require('dotenv').config()
const fs = require('fs')
const path = require('path')
const { Pool } = require('pg')

const pool = new Pool({ connectionString: process.env.DATABASE_URL })

async function migrate() {
  try {
    const sqlPath = path.join(__dirname, '..', 'lib', 'course-fees-schema.sql')
    const sql = fs.readFileSync(sqlPath, 'utf8')
    console.log('Running course fee management migration...')
    await pool.query(sql)
    console.log('✅ course_base_fees')
    console.log('✅ course_fee_discounts')
    console.log('✅ course_center_assignments')
    console.log('✅ course_center_fees')
    console.log('✅ student_fee_payments')
    console.log('✅ student_payment_installments')
    console.log('✅ course_batch_base_fees')
    console.log('✅ course_batch_center_fees')
    console.log('✅ Migration succeeded!')
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
