const { Pool } = require('pg')
const fs = require('fs')
const path = require('path')
require('dotenv').config()

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
})

async function addApprovalStatus() {
  try {
    console.log('Reading approval schema...')
    const schemaPath = path.join(__dirname, '..', 'lib', 'approval-schema.sql')
    const schema = fs.readFileSync(schemaPath, 'utf-8')

    console.log('Executing schema...')
    await pool.query(schema)

    console.log('✅ Approval status columns added successfully!')
    
    // Verify columns exist
    const newsCheck = await pool.query(`
      SELECT column_name FROM information_schema.columns 
      WHERE table_name = 'news_items' AND column_name = 'approval_status'
    `)
    
    const alertsCheck = await pool.query(`
      SELECT column_name FROM information_schema.columns 
      WHERE table_name = 'alerts' AND column_name = 'approval_status'
    `)
    
    if (newsCheck.rows.length > 0 && alertsCheck.rows.length > 0) {
      console.log('✅ Verification: approval_status columns exist in both tables')
    } else {
      console.log('⚠️  Warning: Could not verify column creation')
    }
  } catch (error) {
    console.error('❌ Error adding approval status columns:', error)
    process.exit(1)
  } finally {
    await pool.end()
  }
}

addApprovalStatus()
