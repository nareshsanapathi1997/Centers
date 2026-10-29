// Adds Courses dropdown children under the existing Courses header menu parent.
// Run once on existing databases: node scripts/add-courses-dropdown-menu.js

require('dotenv').config();

const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

const DEFAULT_COURSE_LINKS = [
  { menu_key: 'courses_cat', title: 'CAT/MBA', icon_class: 'ri-graduation-cap-line', target_section: '#department', display_order: 1 },
  { menu_key: 'courses_bank', title: 'Bank Exams', icon_class: 'ri-bank-line', target_section: '#department', display_order: 2 },
  { menu_key: 'courses_gate', title: 'GATE', icon_class: 'ri-book-open-line', target_section: '#department', display_order: 3 },
  { menu_key: 'courses_gmat', title: 'GMAT', icon_class: 'ri-file-paper-line', target_section: '#department', display_order: 4 },
  { menu_key: 'courses_jee', title: 'JEE/Engg', icon_class: 'ri-calculator-line', target_section: '#department', display_order: 5 },
  { menu_key: 'courses_neet', title: 'NEET', icon_class: 'ri-heart-pulse-line', target_section: '#department', display_order: 6 },
  { menu_key: 'courses_clat', title: 'CLAT', icon_class: 'ri-scales-line', target_section: '#department', display_order: 7 },
  { menu_key: 'courses_ipm', title: 'IPM/BBA', icon_class: 'ri-building-line', target_section: '#department', display_order: 8 },
  { menu_key: 'courses_icet', title: 'ICET', icon_class: 'ri-file-list-3-line', target_section: '#department', display_order: 9 },
];

async function addCoursesDropdown() {
  if (!process.env.DATABASE_URL) {
    console.error('ERROR: DATABASE_URL is not set.');
    process.exit(1);
  }

  const client = await pool.connect();

  try {
    const parentResult = await client.query(
      `SELECT id FROM header_menu_items WHERE menu_key = 'courses' AND parent_id IS NULL LIMIT 1`
    );

    if (parentResult.rows.length === 0) {
      console.log('Courses parent menu item not found — skipping.');
      return;
    }

    const coursesId = parentResult.rows[0].id;

    await client.query(
      `UPDATE header_menu_items SET target_section = NULL, updated_at = CURRENT_TIMESTAMP WHERE id = $1`,
      [coursesId]
    );
    console.log('Updated Courses parent to dropdown mode (cleared direct link).');

    let inserted = 0;
    for (const link of DEFAULT_COURSE_LINKS) {
      const exists = await client.query(
        `SELECT id FROM header_menu_items WHERE menu_key = $1 LIMIT 1`,
        [link.menu_key]
      );
      if (exists.rows.length > 0) continue;

      await client.query(
        `INSERT INTO header_menu_items (menu_key, parent_id, title, icon_class, link_url, target_section, display_order, is_active)
         VALUES ($1, $2, $3, $4, NULL, $5, $6, true)`,
        [link.menu_key, coursesId, link.title, link.icon_class, link.target_section, link.display_order]
      );
      inserted++;
    }

    console.log(`✅ Courses dropdown ready — ${inserted} new link(s) added.`);
    console.log('Edit links in Super Admin > Settings > Menu Items.');
  } catch (error) {
    console.error('Error adding Courses dropdown:', error);
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
}

addCoursesDropdown().catch(() => process.exit(1));
