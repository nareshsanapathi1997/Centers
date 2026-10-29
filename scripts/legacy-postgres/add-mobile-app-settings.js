require('dotenv').config()
const { Pool } = require('pg')

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
})

const MOBILE_APP_STORE_URL = 'https://apps.apple.com/in/app/time4education/id6756058344'
const MOBILE_PLAY_STORE_URL =
  'https://play.google.com/store/apps/details?id=com.time4education.timeforeducation'

if (!process.env.DATABASE_URL) {
  console.error('ERROR: DATABASE_URL environment variable is not set.')
  console.error('Make sure you have a .env file with DATABASE_URL configured.')
  process.exit(1)
}

async function addMobileAppSettings() {
  const client = await pool.connect()

  try {
    console.log('Adding mobile app settings...')

    await client.query(
      `
      INSERT INTO global_settings (setting_key, setting_value, setting_type, description) VALUES
        ($1, $2, 'string', 'App Store download URL for iOS devices'),
        ($3, $4, 'string', 'Google Play Store download URL for Android devices'),
        ('mobile_app_title', 'Download Our Mobile App', 'string', 'Title text for mobile app download section'),
        ('mobile_app_description', 'Get access to study materials, practice tests, and expert guidance on the go. Download our app for iOS and Android devices.', 'string', 'Description text for mobile app download section')
      ON CONFLICT (setting_key) DO NOTHING
    `,
      ['mobile_app_store_url', MOBILE_APP_STORE_URL, 'mobile_play_store_url', MOBILE_PLAY_STORE_URL]
    )

    await client.query(
      `
      UPDATE global_settings
      SET setting_value = $1, updated_at = CURRENT_TIMESTAMP
      WHERE setting_key = 'mobile_app_store_url'
        AND (setting_value IS NULL OR TRIM(setting_value) = '')
    `,
      [MOBILE_APP_STORE_URL]
    )

    await client.query(
      `
      UPDATE global_settings
      SET setting_value = $1, updated_at = CURRENT_TIMESTAMP
      WHERE setting_key = 'mobile_play_store_url'
        AND (setting_value IS NULL OR TRIM(setting_value) = '')
    `,
      [MOBILE_PLAY_STORE_URL]
    )

    console.log('✅ Mobile app settings added successfully!')
    console.log(`   iOS: ${MOBILE_APP_STORE_URL}`)
    console.log(`   Android: ${MOBILE_PLAY_STORE_URL}`)
    console.log('\nYou can customize these in Super Admin → Settings → Mobile App')
  } catch (error) {
    console.error('❌ Error adding mobile app settings:', error.message)
    process.exit(1)
  } finally {
    client.release()
    await pool.end()
  }
}

addMobileAppSettings()
