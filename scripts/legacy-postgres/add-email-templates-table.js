require('dotenv').config()
const { Pool } = require('pg')
const fs = require('fs')
const path = require('path')

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
})

async function addEmailTemplatesTable() {
  try {
    console.log('Reading email templates schema file...')
    const schemaPath = path.join(__dirname, '..', 'lib', 'email-templates-schema.sql')
    const schema = fs.readFileSync(schemaPath, 'utf8')

    console.log('Executing email templates schema...')
    await pool.query(schema)
    
    console.log('✅ Email templates table created successfully!')
    
    // Verify the table was created
    const result = await pool.query(`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'email_templates'
      ORDER BY ordinal_position
    `)
    
    console.log('\nemail_templates table columns:')
    result.rows.forEach(row => {
      console.log(`  - ${row.column_name}: ${row.data_type}`)
    })

    // Check default templates
    const templatesResult = await pool.query('SELECT template_key, template_name FROM email_templates')
    console.log('\nDefault email templates:')
    templatesResult.rows.forEach(row => {
      console.log(`  - ${row.template_key}: ${row.template_name}`)
    })

    console.log('\n✅ Migration completed successfully!')
  } catch (error) {
    if (error.code === '42P07') {
      console.log('⚠️  Table already exists. Email templates table is already set up.')
    } else {
      console.error('❌ Error creating email templates table:', error.message)
      console.error('\nMake sure:')
      console.error('1. PostgreSQL is running')
      console.error('2. DATABASE_URL in .env is correct')
      process.exit(1)
    }
  } finally {
    await pool.end()
  }
}

addEmailTemplatesTable()
