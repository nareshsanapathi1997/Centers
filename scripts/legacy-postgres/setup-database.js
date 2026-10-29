const { Pool } = require('pg')
const fs = require('fs')
const path = require('path')
require('dotenv').config()

const { runPendingMigrations } = require('./migrate')

async function setupDatabase() {
  if (!process.env.DATABASE_URL) {
    console.error('DATABASE_URL is not set. Copy .env.example to .env first.')
    process.exit(1)
  }

  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
  })

  try {
    console.log('Reading database schema...')
    const schemaPath = path.join(__dirname, '..', 'lib', 'db-schema.sql')
    const schema = fs.readFileSync(schemaPath, 'utf8')

    console.log('Executing database schema...')
    await pool.query(schema)

    const extraMigrations = [
      path.join(__dirname, '..', 'lib', 'student-portal-schema.sql'),
      path.join(__dirname, '..', 'lib', 'student-portal-extensions.sql'),
      path.join(__dirname, '..', 'lib', 'course-fees-schema.sql'),
      path.join(__dirname, '..', 'lib', 'student-portal-security-schema.sql'),
    ]
    for (const migrationPath of extraMigrations) {
      if (fs.existsSync(migrationPath)) {
        console.log(`Running ${path.basename(migrationPath)}...`)
        await pool.query(fs.readFileSync(migrationPath, 'utf8'))
      }
    }

    console.log('\nApplying tracked migrations...')
    const applied = await runPendingMigrations(pool)
    if (applied === 0) {
      console.log('  (no pending migrations)')
    }

    console.log('\n✅ Database schema created successfully!')
    console.log('\nNext steps:')
    console.log('1. Run "npm run db:seed-permissions" and "npm run db:sync-permissions" for RBAC')
    console.log('2. Run "npm run db:seed" to add sample data (optional)')
    console.log('3. Run "npm run dev" to start the development server')
  } catch (error) {
    if (error.code === '42P07') {
      console.log('⚠️  Tables already exist. Running pending migrations only...')
      try {
        await runPendingMigrations(pool)
        console.log('✅ Pending migrations applied (or already up to date).')
      } catch (migrateError) {
        console.error('❌ Migration failed:', migrateError.message)
        process.exit(1)
      }
    } else {
      console.error('❌ Error setting up database:', error.message)
      console.error('\nMake sure:')
      console.error('1. PostgreSQL is running')
      console.error('2. DATABASE_URL in .env is correct')
      console.error('3. The database exists (create it if needed)')
      process.exit(1)
    }
  } finally {
    await pool.end()
  }
}

setupDatabase()
