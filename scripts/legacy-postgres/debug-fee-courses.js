require('dotenv').config()
const { Pool } = require('pg')
const pool = new Pool({ connectionString: process.env.DATABASE_URL })

async function main() {
  const co = await pool.query('SELECT center_id, name FROM courses WHERE is_active = true LIMIT 10')
  console.log('center courses:', co.rows)
  const cm = await pool.query(
    "SELECT id, title, level_type FROM course_masters WHERE level_type = 'main_course' AND is_active = true LIMIT 10"
  )
  console.log('main courses:', cm.rows)
  const fee = await pool.query(`
    WITH RECURSIVE tree AS (
       SELECT cm.id, cm.parent_id, cm.title, cm.slug, cm.level_type, cm.is_active, cm.title AS main_title
       FROM courses co
       JOIN course_masters cm ON cm.level_type = 'main_course' AND lower(trim(cm.title)) = lower(trim(co.name))
       WHERE co.is_active = true
       UNION ALL
       SELECT cm.id, cm.parent_id, cm.title, cm.slug, cm.level_type, cm.is_active, t.main_title
       FROM course_masters cm JOIN tree t ON cm.parent_id = t.id
     )
     SELECT * FROM tree WHERE level_type IN ('course','leaf_course') LIMIT 15
  `)
  console.log('fee courses:', fee.rows.length, fee.rows)
  const allLevels = await pool.query(
    "SELECT level_type, count(*)::int FROM course_masters WHERE is_active = true GROUP BY level_type"
  )
  console.log('level counts:', allLevels.rows)

  const center1 = await pool.query(`
    SELECT name FROM courses WHERE center_id = 1 AND is_active = true
  `)
  console.log('center 1 assigned:', center1.rows.map(r => r.name))

  const { listFeeCoursesForCenter } = require('../lib/course-fees-db')
  // dynamic import won't work easily - inline test via duplicate logic
  await pool.end()
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
