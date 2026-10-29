const { Pool } = require('pg')
require('dotenv').config()

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
})

async function addMissingCourses() {
  try {
    const centerId = 1
    
    // Courses from template that are missing
    const courses = [
      { name: 'CRT', category: 'college_level', display_order: 5 },
      { name: 'MAT', category: 'college_level', display_order: 6 },
      { name: 'GMAT®', category: 'college_level', display_order: 7 },
      { name: 'GRE®', category: 'college_level', display_order: 8 },
      { name: 'TANCET', category: 'college_level', display_order: 9 },
      { name: 'SSC', category: 'college_level', display_order: 10 },
    ]

    for (const course of courses) {
      // Check if course already exists
      const existing = await pool.query(
        'SELECT id FROM courses WHERE center_id = $1 AND name = $2',
        [centerId, course.name]
      )
      
      if (existing.rows.length === 0) {
        await pool.query(
          `INSERT INTO courses (center_id, name, category, display_order, is_active)
           VALUES ($1, $2, $3, $4, true)`,
          [centerId, course.name, course.category, course.display_order]
        )
        console.log(`✓ Added course: ${course.name}`)
      } else {
        console.log(`- Course already exists: ${course.name}`)
      }
    }

    // Update display_order for existing courses to match template order
    const courseOrder = {
      'Bank Exams': 1,
      'CAT': 2,
      'CMAT': 3,
      'GATE': 4,
      'CRT': 5,
      'MAT': 6,
      'GMAT®': 7,
      'GRE®': 8,
      'TANCET': 9,
      'SSC': 10,
    }

    for (const [name, order] of Object.entries(courseOrder)) {
      await pool.query(
        'UPDATE courses SET display_order = $1 WHERE center_id = $2 AND name = $3',
        [order, centerId, name]
      )
    }

    // Get all courses
    const result = await pool.query(
      'SELECT id, name, category, display_order FROM courses WHERE center_id = $1 ORDER BY display_order',
      [centerId]
    )
    
    console.log('\n✅ All courses:')
    console.log(JSON.stringify(result.rows, null, 2))
    
  } catch (error) {
    console.error('Error:', error.message)
  } finally {
    await pool.end()
  }
}

addMissingCourses()

