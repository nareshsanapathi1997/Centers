require('dotenv').config()
const { Pool } = require('pg')

const pool = new Pool({ connectionString: process.env.DATABASE_URL })

const TABLES = process.argv.slice(2)

async function run() {
  const indexes = await pool.query(
    `SELECT tablename, indexdef FROM pg_indexes WHERE schemaname = 'public'
     ${TABLES.length ? 'AND tablename = ANY($1::text[])' : ''}
     ORDER BY tablename`,
    TABLES.length ? [TABLES] : []
  )
  for (const row of indexes.rows) {
    console.log(`${row.tablename}  ${row.indexdef.replace(/^CREATE (UNIQUE )?INDEX /, '')}`)
  }
  await pool.end()
}

run()
