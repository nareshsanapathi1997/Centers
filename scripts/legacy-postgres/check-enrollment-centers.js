/**
 * Surveys student_enrollments.center_name before it is replaced by a real
 * center_id, so the backfill's match rate is known rather than assumed.
 */
require('dotenv').config()
const { Pool } = require('pg')

const pool = new Pool({ connectionString: process.env.DATABASE_URL })

async function main() {
  const total = await pool.query('SELECT COUNT(*)::int AS n FROM student_enrollments')
  console.log(`rows: ${total.rows[0].n}`)

  const distinct = await pool.query(`
    SELECT se.center_name, COUNT(*)::int AS rows, c.id AS matched_center_id
    FROM student_enrollments se
    LEFT JOIN centers c ON LOWER(TRIM(c.name)) = LOWER(TRIM(se.center_name))
    GROUP BY se.center_name, c.id
    ORDER BY rows DESC
  `)

  console.log('\ncenter_name -> centers.id')
  for (const row of distinct.rows) {
    console.log(
      `  ${String(row.center_name ?? '(null)').padEnd(28)} ${String(row.rows).padStart(4)} rows  -> ${
        row.matched_center_id ?? 'NO MATCH'
      }`,
    )
  }

  const centers = await pool.query('SELECT id, name, slug FROM centers ORDER BY id')
  console.log('\ncenters')
  for (const row of centers.rows) {
    console.log(`  ${row.id}  ${row.name}  (${row.slug})`)
  }

  await pool.end()
}

main().catch((error) => {
  console.error(error.message)
  process.exitCode = 1
})
