const { Pool } = require('pg')
require('dotenv').config()

async function createDatabase() {
  // Parse the DATABASE_URL to get connection details
  const dbUrl = process.env.DATABASE_URL
  if (!dbUrl) {
    console.error('❌ DATABASE_URL not found in .env file')
    process.exit(1)
  }

  // Extract database name from URL
  const urlParts = new URL(dbUrl)
  const dbName = urlParts.pathname.slice(1) // Remove leading '/'
  
  // Connect to default 'postgres' database to create our database
  const adminUrl = dbUrl.replace(`/${dbName}`, '/postgres')
  
  const pool = new Pool({
    connectionString: adminUrl,
  })

  try {
    console.log(`Creating database "${dbName}"...`)
    
    // Check if database exists
    const checkResult = await pool.query(
      "SELECT 1 FROM pg_database WHERE datname = $1",
      [dbName]
    )

    if (checkResult.rows.length > 0) {
      console.log(`✅ Database "${dbName}" already exists!`)
      console.log('You can now run "npm run db:setup" to create tables.')
    } else {
      // Create database
      await pool.query(`CREATE DATABASE ${dbName}`)
      console.log(`✅ Database "${dbName}" created successfully!`)
      console.log('You can now run "npm run db:setup" to create tables.')
    }
  } catch (error) {
    if (error.code === '42P04') {
      console.log(`✅ Database "${dbName}" already exists!`)
      console.log('You can now run "npm run db:setup" to create tables.')
    } else {
      console.error('❌ Error creating database:', error.message)
      console.error('\nTroubleshooting:')
      console.error('1. Make sure PostgreSQL is running')
      console.error('2. Check your DATABASE_URL in .env file')
      console.error('3. Ensure your PostgreSQL user has CREATE DATABASE permission')
      console.error('\nYou can also create the database manually:')
      console.error(`   psql -U postgres -c "CREATE DATABASE ${dbName};"`)
      process.exit(1)
    }
  } finally {
    await pool.end()
  }
}

createDatabase()

