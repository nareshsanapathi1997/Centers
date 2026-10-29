require('dotenv').config()
const { Pool } = require('pg')
const fs = require('fs')
const path = require('path')

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
})

async function addSEOSettingsTable() {
  try {
    console.log('Reading SEO schema file...')
    const schemaPath = path.join(__dirname, '..', 'lib', 'seo-schema.sql')
    const schema = fs.readFileSync(schemaPath, 'utf8')

    console.log('Executing SEO schema...')
    await pool.query(schema)
    
    console.log('✅ SEO settings table created successfully!')
    
    // Verify the table was created
    const result = await pool.query(`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'center_seo_settings'
      ORDER BY ordinal_position
    `)
    
    console.log('\ncenter_seo_settings table columns:')
    result.rows.forEach(row => {
      console.log(`  - ${row.column_name}: ${row.data_type}`)
    })

    console.log('\n✅ Migration completed successfully!')
  } catch (error) {
    if (error.code === '42P07') {
      console.log('⚠️  Table already exists. SEO settings table is already set up.')
    } else {
      console.error('❌ Error creating SEO settings table:', error.message)
      console.error('\nMake sure:')
      console.error('1. PostgreSQL is running')
      console.error('2. DATABASE_URL in .env is correct')
      console.error('3. The centers table exists')
      process.exit(1)
    }
  } finally {
    await pool.end()
  }
}

addSEOSettingsTable()
