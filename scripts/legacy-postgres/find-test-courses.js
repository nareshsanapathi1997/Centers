require('dotenv').config()
const { Pool } = require('pg')
const pool = new Pool({ connectionString: process.env.DATABASE_URL })

async function main() {
  const leaf = await pool.query(`
    WITH RECURSIVE tree AS (
      SELECT cm.id, cm.parent_id, cm.title, cm.slug, cm.level_type
      FROM course_masters cm
      WHERE cm.level_type = 'main_course' AND cm.is_active = true
      UNION ALL
      SELECT c.id, c.parent_id, c.title, c.slug, c.level_type
      FROM course_masters c JOIN tree t ON c.parent_id = t.id WHERE c.is_active = true
    )
    SELECT id, title, slug, level_type FROM tree WHERE level_type IN ('course','leaf_course') LIMIT 10
  `)
  console.log('Leaf courses:', JSON.stringify(leaf.rows, null, 2))

  const batches = await pool.query(
    'SELECT id, course_master_id, batch_name FROM course_master_batches WHERE is_active = true LIMIT 5'
  )
  console.log('Batches:', batches.rows)

  await pool.end()
}

main().catch(console.error)
