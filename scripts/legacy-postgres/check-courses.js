const { Pool } = require('pg')
require('dotenv').config()

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
})

async function checkCourses() {
  try {
    // Check section config
    const configResult = await pool.query(
      'SELECT * FROM section_configs WHERE center_id = 1 AND section_key = $1',
      ['courses']
    )
    console.log('Courses section config:', JSON.stringify(configResult.rows, null, 2))

    // Check college level courses
    const collegeResult = await pool.query(
      'SELECT COUNT(*) as count FROM courses WHERE center_id = 1 AND category = $1 AND is_active = true',
      ['college_level']
    )
    console.log('College level courses:', collegeResult.rows[0].count)

    // Check school level courses
    const schoolResult = await pool.query(
      'SELECT COUNT(*) as count FROM courses WHERE center_id = 1 AND category = $1 AND is_active = true',
      ['school_level']
    )
    console.log('School level courses:', schoolResult.rows[0].count)

    // List all courses
    const allCourses = await pool.query(
      'SELECT id, name, category, display_order, is_active FROM courses WHERE center_id = 1 ORDER BY category, display_order'
    )
    console.log('\nAll courses:')
    allCourses.rows.forEach(course => {
      console.log(`  - ${course.name} (${course.category}) - Order: ${course.display_order} - Active: ${course.is_active}`)
    })

    // If section is disabled, enable it
    if (configResult.rows.length === 0 || !configResult.rows[0].is_enabled) {
      console.log('\n⚠️  Courses section is disabled or not configured!')
      if (configResult.rows.length === 0) {
        await pool.query(
          'INSERT INTO section_configs (center_id, section_key, is_enabled, display_order) VALUES ($1, $2, $3, $4)',
          [1, 'courses', true, 3]
        )
        console.log('✅ Created and enabled courses section config')
      } else {
        await pool.query(
          'UPDATE section_configs SET is_enabled = true WHERE center_id = $1 AND section_key = $2',
          [1, 'courses']
        )
        console.log('✅ Enabled courses section config')
      }
    } else {
      console.log('\n✅ Courses section is enabled')
    }
  } catch (error) {
    console.error('Error:', error.message)
  } finally {
    await pool.end()
  }
}

checkCourses()

