require('dotenv').config();
const { Pool } = require('pg');

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

// Icon mappings based on the template
const courseIcons = {
  'Bank Exams': 'ri-bank-line',
  'CAT': 'ri-graduation-cap-line',
  'CMAT': 'ri-file-paper-line',
  'CRT': 'ri-edit-box-line',
  'MAT': 'ri-calculator-line',
  'GATE': 'ri-building-line',
  'GMAT®': 'ri-book-open-line',
  'GRE®': 'ri-global-line',
  'TANCET': 'ri-file-list-line',
  'SSC': 'ri-government-line',
  'CLAT': 'ri-scales-line',
  'IPM': 'ri-lightbulb-line',
  // Add more as needed
};

async function addIconColumn() {
  try {
    // Add icon_class column if it doesn't exist
    await pool.query(`
      ALTER TABLE courses 
      ADD COLUMN IF NOT EXISTS icon_class VARCHAR(100) DEFAULT 'ri-book-open-line'
    `);
    console.log('Added icon_class column to courses table');

    // Update each course with its icon
    for (const [courseName, iconClass] of Object.entries(courseIcons)) {
      const result = await pool.query(
        'UPDATE courses SET icon_class = $1 WHERE name = $2',
        [iconClass, courseName]
      );
      if (result.rowCount > 0) {
        console.log(`Updated ${courseName} with icon: ${iconClass}`);
      }
    }

    // Verify the update
    const courses = await pool.query('SELECT id, name, category, icon_class FROM courses ORDER BY category, display_order');
    console.log('\nCurrent courses with icons:');
    courses.rows.forEach(row => {
      console.log(`  ${row.name} (${row.category}): ${row.icon_class}`);
    });

    console.log('\nAll courses updated with icons!');

  } catch (error) {
    console.error('Error:', error);
  } finally {
    pool.end();
  }
}

addIconColumn();
