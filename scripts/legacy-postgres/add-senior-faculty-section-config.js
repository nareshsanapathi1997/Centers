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

async function addSeniorFacultySectionConfig() {
  const client = await pool.connect()
  
  try {
    console.log('Adding senior_faculty section config for all centers...')
    
    // Get all centers
    const centersResult = await client.query('SELECT id FROM centers')
    const centers = centersResult.rows
    
    if (centers.length === 0) {
      console.log('⚠️  No centers found. Please create a center first.')
      return
    }
    
    let added = 0
    let skipped = 0
    
    for (const center of centers) {
      // Check if section config already exists
      const existing = await client.query(
        'SELECT id FROM section_configs WHERE center_id = $1 AND section_key = $2',
        [center.id, 'senior_faculty']
      )
      
      if (existing.rows.length > 0) {
        console.log(`  ⏭️  Center ${center.id}: senior_faculty section config already exists`)
        skipped++
        continue
      }
      
      // Get the highest display_order for this center
      const maxOrderResult = await client.query(
        'SELECT MAX(display_order) as max_order FROM section_configs WHERE center_id = $1',
        [center.id]
      )
      const nextOrder = (maxOrderResult.rows[0]?.max_order || 0) + 1
      
      // Insert section config
      await client.query(
        `INSERT INTO section_configs (center_id, section_key, is_enabled, display_order)
         VALUES ($1, $2, $3, $4)`,
        [center.id, 'senior_faculty', true, nextOrder]
      )
      
      console.log(`  ✅ Center ${center.id}: Added senior_faculty section config (order: ${nextOrder})`)
      added++
    }
    
    console.log(`\n✅ Complete! Added ${added} section config(s), skipped ${skipped} existing.`)
    console.log('\nYou can now enable/disable Senior Faculty section in the admin panel:')
    console.log('  /admin/[centerId]/sections')
    
  } catch (error) {
    console.error('❌ Error adding senior_faculty section config:', error.message)
    process.exit(1)
  } finally {
    client.release()
    await pool.end()
  }
}

addSeniorFacultySectionConfig()
