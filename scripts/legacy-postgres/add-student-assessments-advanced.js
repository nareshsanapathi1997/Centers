require('dotenv').config()
const fs = require('fs')
const path = require('path')
const { Pool } = require('pg')

const pool = new Pool({ connectionString: process.env.DATABASE_URL })

async function migrate() {
  try {
    const sqlPath = path.join(__dirname, '..', 'lib', 'student-assessments-advanced-schema.sql')
    const sql = fs.readFileSync(sqlPath, 'utf8')
    console.log('Running advanced student assessments migration...')
    await pool.query(sql)
    console.log('✅ assessments.directions')
    console.log('✅ assessment_sections.directions')
    console.log('✅ assessment_passages')
    console.log('✅ assessment_questions advanced columns + backfill')
    console.log('✅ assessment_answers multi/numeric columns')
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
