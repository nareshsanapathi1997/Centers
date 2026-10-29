require('dotenv').config()

const { Pool } = require('pg')

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
})

const DEFAULT_SETTINGS = {
  news: true,
  alert: true,
  hero: true,
}

async function addApprovalSectionSettings() {
  const client = await pool.connect()

  try {
    console.log('Seeding approval_section_settings in global_settings...')

    await client.query(`
      INSERT INTO global_settings (setting_key, setting_value, setting_type, description)
      VALUES ($1, $2, 'json', 'Per-section super admin approval ON/OFF settings')
      ON CONFLICT (setting_key) DO NOTHING
    `, ['approval_section_settings', JSON.stringify(DEFAULT_SETTINGS)])

    console.log('✅ approval_section_settings ready')
    console.log('Default values:', DEFAULT_SETTINGS)
    console.log('\nManage toggles in Super Admin → Settings → Content Approvals')
  } catch (error) {
    console.error('❌ Error seeding approval section settings:', error)
    process.exit(1)
  } finally {
    client.release()
    await pool.end()
  }
}

addApprovalSectionSettings()
