require('dotenv').config()
const { Pool } = require('pg')

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
})

if (!process.env.DATABASE_URL) {
  console.error('ERROR: DATABASE_URL environment variable is not set.')
  console.error('Make sure you have a .env file with DATABASE_URL configured.')
  process.exit(1)
}

async function createAnalyticsTable() {
  const client = await pool.connect()
  
  try {
    console.log('Checking if analytics_tracking table exists...')
    
    // Check if table exists
    const tableCheck = await client.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_name = 'analytics_tracking'
      )
    `)
    
    if (tableCheck.rows[0].exists) {
      console.log('✅ analytics_tracking table already exists!')
      return
    }
    
    console.log('Creating analytics_tracking table...')

    // Create the table
    await client.query(`
      CREATE TABLE IF NOT EXISTS analytics_tracking (
        id SERIAL PRIMARY KEY,
        center_id INTEGER REFERENCES centers(id) ON DELETE CASCADE,
        item_type VARCHAR(50) NOT NULL, -- 'news', 'notification', 'course', 'nearby_center', 'hero_slide', 'blog_post', etc.
        item_id INTEGER NOT NULL, -- ID of the item that was clicked/viewed
        action_type VARCHAR(50) NOT NULL DEFAULT 'click', -- 'click', 'view', 'impression'
        user_ip VARCHAR(45), -- IPv4 or IPv6
        user_agent TEXT,
        referrer TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `)

    // Create indexes for better query performance
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_analytics_center_id ON analytics_tracking(center_id)
    `)
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_analytics_item_type ON analytics_tracking(item_type)
    `)
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_analytics_created_at ON analytics_tracking(created_at)
    `)
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_analytics_center_item ON analytics_tracking(center_id, item_type, item_id)
    `)

    console.log('✅ Analytics tracking table created successfully!')
    console.log('\nYou can now:')
    console.log('1. View analytics at /super-admin/analytics')
    console.log('2. Track clicks automatically as users interact with content')
    
  } catch (error) {
    console.error('❌ Error creating analytics table:', error.message)
    process.exit(1)
  } finally {
    client.release()
    await pool.end()
  }
}

createAnalyticsTable()
