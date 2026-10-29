// Run: node scripts/run-reorganize-courses-menu.js
require('dotenv').config();

const fs = require('fs');
const path = require('path');
const { Pool } = require('pg');

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

async function main() {
  if (!process.env.DATABASE_URL) {
    console.error('ERROR: DATABASE_URL is not set.');
    process.exit(1);
  }

  const sqlPath = path.join(__dirname, '../migrations/reorganize_courses_menu_sections.sql');
  const sql = fs.readFileSync(sqlPath, 'utf8');
  const client = await pool.connect();

  try {
    await client.query(sql);
    console.log('✅ reorganize_courses_menu_sections.sql completed');

    const verify = await client.query(`
      SELECT h.menu_key, h.title, COALESCE(p.title, '(root)') AS parent
      FROM header_menu_items h
      LEFT JOIN header_menu_items p ON p.id = h.parent_id
      WHERE h.menu_key = 'courses'
         OR h.menu_key IN ('courses_school_level', 'courses_college_level')
         OR h.menu_key LIKE 'courses_%'
      ORDER BY COALESCE(p.display_order, 0), h.display_order, h.id
    `);

    console.log('\nCourses menu structure:');
    for (const row of verify.rows) {
      console.log(`  [${row.parent}] ${row.title} (${row.menu_key})`);
    }
  } catch (err) {
    console.error('❌ Migration failed:', err.message);
    process.exit(1);
  } finally {
    client.release();
    await pool.end();
  }
}

main();
