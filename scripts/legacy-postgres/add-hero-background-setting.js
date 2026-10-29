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

async function addHeroBackgroundSetting() {
  const client = await pool.connect()
  
  try {
    console.log('Adding hero_common_background_image setting...')
    
    // Insert the setting if it doesn't exist
    await client.query(`
      INSERT INTO global_settings (setting_key, setting_value, setting_type, description) 
      VALUES ('hero_common_background_image', '/assets/img/hero/hero-slider-1.jpg', 'string', 'Common background image URL for all hero slides')
      ON CONFLICT (setting_key) DO NOTHING
    `)
    
    console.log('✅ Hero background image setting added successfully!')
    console.log('\nYou can now:')
    console.log('1. Set the common background image in Super Admin Settings')
    console.log('2. All hero slides will use this common background')
    console.log('3. Only banner images need to be uploaded per slide')
    
  } catch (error) {
    console.error('❌ Error adding hero background setting:', error.message)
    process.exit(1)
  } finally {
    client.release()
    await pool.end()
  }
}

addHeroBackgroundSetting()
