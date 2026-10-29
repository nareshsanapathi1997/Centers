const { Pool } = require('pg')
require('dotenv').config()

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
})

async function fixCourseOrder() {
  try {
    const centerId = 1
    
    // Fix school level courses display order
    await pool.query(
      "UPDATE courses SET display_order = 1 WHERE center_id = $1 AND name = 'CLAT'",
      [centerId]
    )
    await pool.query(
      "UPDATE courses SET display_order = 2 WHERE center_id = $1 AND name = 'IPM'",
      [centerId]
    )

    // Get all courses
    const result = await pool.query(
      'SELECT name, category, display_order FROM courses WHERE center_id = $1 ORDER BY category, display_order',
      [centerId]
    )
    
    console.log('✅ Courses ordered correctly:')
    console.log(JSON.stringify(result.rows, null, 2))
    
  } catch (error) {
    console.error('Error:', error.message)
  } finally {
    await pool.end()
  }
}

fixCourseOrder()

