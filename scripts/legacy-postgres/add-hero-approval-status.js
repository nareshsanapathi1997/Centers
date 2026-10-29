require('dotenv').config()
const { Pool } = require('pg')

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : undefined,
})

async function addHeroApprovalStatus() {
  try {
    console.log('Adding approval columns to hero_slides...')

    await pool.query(`
      ALTER TABLE hero_slides 
      ADD COLUMN IF NOT EXISTS approval_status VARCHAR(20) DEFAULT 'pending' 
      CHECK (approval_status IN ('pending', 'approved', 'rejected'));
    `)
    await pool.query(`
      ALTER TABLE hero_slides 
      ADD COLUMN IF NOT EXISTS approved_by INTEGER REFERENCES super_admins(id);
    `)
    await pool.query(`
      ALTER TABLE hero_slides 
      ADD COLUMN IF NOT EXISTS approved_at TIMESTAMP;
    `)
    await pool.query(`
      ALTER TABLE hero_slides 
      ADD COLUMN IF NOT EXISTS rejection_reason TEXT;
    `)

    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_hero_slides_approval_status ON hero_slides(approval_status);
    `)

    // Set existing rows to approved so current hero slides still show on the site
    await pool.query(`
      UPDATE hero_slides SET approval_status = 'approved' WHERE approval_status IS NULL;
    `)

    console.log('✅ Hero approval columns added successfully!')
  } catch (error) {
    console.error('❌ Error adding hero approval columns:', error)
    process.exit(1)
  } finally {
    await pool.end()
  }
}

addHeroApprovalStatus()
