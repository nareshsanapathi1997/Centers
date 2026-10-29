// Script to add global settings and header menu tables
// Run this script to set up the new tables for header dropdown functionality

// Load environment variables from .env file
require('dotenv').config();

const { Pool } = require('pg');

// Use the same database connection as the main app
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

if (!process.env.DATABASE_URL) {
  console.error('ERROR: DATABASE_URL environment variable is not set.');
  console.error('Make sure you have a .env file with DATABASE_URL configured.');
  process.exit(1);
}

async function createGlobalSettingsTables() {
  const client = await pool.connect();
  
  try {
    console.log('Creating global_settings table...');
    
    // Create global_settings table
    await client.query(`
      CREATE TABLE IF NOT EXISTS global_settings (
        id SERIAL PRIMARY KEY,
        setting_key VARCHAR(100) UNIQUE NOT NULL,
        setting_value TEXT,
        setting_type VARCHAR(50) DEFAULT 'string',
        description TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);
    
    console.log('Creating header_menu_items table...');
    
    // Create header_menu_items table
    await client.query(`
      CREATE TABLE IF NOT EXISTS header_menu_items (
        id SERIAL PRIMARY KEY,
        menu_key VARCHAR(100) NOT NULL,
        parent_id INTEGER REFERENCES header_menu_items(id) ON DELETE CASCADE,
        title VARCHAR(255) NOT NULL,
        icon_class VARCHAR(100),
        link_url VARCHAR(255),
        target_section VARCHAR(100),
        display_order INTEGER DEFAULT 0,
        is_active BOOLEAN DEFAULT true,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);
    
    console.log('Inserting default global settings...');
    
    // Insert default global settings
    await client.query(`
      INSERT INTO global_settings (setting_key, setting_value, setting_type, description) VALUES
        ('header_dropdown_enabled', 'false', 'boolean', 'Enable dropdown menus in header navigation'),
        ('header_top_nav_enabled', 'false', 'boolean', 'Enable top navigation bar with About Us, Results, etc.')
      ON CONFLICT (setting_key) DO NOTHING;
    `);
    
    console.log('Checking if header menu items already exist...');
    
    // Check if menu items already exist
    const existingItems = await client.query('SELECT COUNT(*) FROM header_menu_items');
    
    if (parseInt(existingItems.rows[0].count) === 0) {
      console.log('Inserting default header menu items...');
      
      // Insert About Us parent
      const aboutUs = await client.query(`
        INSERT INTO header_menu_items (menu_key, parent_id, title, icon_class, link_url, target_section, display_order, is_active)
        VALUES ('about_us', NULL, 'About Us', 'ri-information-line', NULL, NULL, 1, true)
        RETURNING id;
      `);
      const aboutUsId = aboutUs.rows[0].id;
      
      // Insert About Us children
      await client.query(`
        INSERT INTO header_menu_items (menu_key, parent_id, title, icon_class, link_url, target_section, display_order, is_active) VALUES
          ('about_us_overview', $1, 'Overview', 'ri-file-list-line', NULL, '#about', 1, true),
          ('about_us_philosophy', $1, 'Our Philosophy', 'ri-lightbulb-line', NULL, '#about', 2, true),
          ('about_us_promoters', $1, 'Meet the Promoters', 'ri-team-line', NULL, '#leadership', 3, true);
      `, [aboutUsId]);
      
      // Insert Results parent
      const results = await client.query(`
        INSERT INTO header_menu_items (menu_key, parent_id, title, icon_class, link_url, target_section, display_order, is_active)
        VALUES ('results', NULL, 'Our Results', 'ri-trophy-line', NULL, NULL, 2, true)
        RETURNING id;
      `);
      const resultsId = results.rows[0].id;
      
      // Insert Results children
      await client.query(`
        INSERT INTO header_menu_items (menu_key, parent_id, title, icon_class, link_url, target_section, display_order, is_active) VALUES
          ('results_cat', $1, 'CAT/MBA', 'ri-graduation-cap-line', NULL, '#results', 1, true),
          ('results_bank', $1, 'Bank Exams', 'ri-bank-line', NULL, '#results', 2, true),
          ('results_gate', $1, 'GATE', 'ri-book-open-line', NULL, '#results', 3, true),
          ('results_gmat', $1, 'GMAT', 'ri-file-paper-line', NULL, '#results', 4, true),
          ('results_jee', $1, 'JEE/Engg', 'ri-calculator-line', NULL, '#results', 5, true),
          ('results_neet', $1, 'NEET', 'ri-heart-pulse-line', NULL, '#results', 6, true),
          ('results_clat', $1, 'CLAT', 'ri-scales-line', NULL, '#results', 7, true),
          ('results_ipm', $1, 'IPM/BBA', 'ri-building-line', NULL, '#results', 8, true),
          ('results_icet', $1, 'ICET', 'ri-file-list-3-line', NULL, '#results', 9, true);
      `, [resultsId]);
      
      // Insert standalone menu items
      await client.query(`
        INSERT INTO header_menu_items (menu_key, parent_id, title, icon_class, link_url, target_section, display_order, is_active) VALUES
          ('centers', NULL, 'Our Centres', 'ri-map-pin-line', NULL, '#centers', 3, true),
          ('jobs', NULL, 'Jobs@T.I.M.E.', 'ri-briefcase-line', NULL, '#contact', 5, true);
      `);

      // Insert Courses dropdown parent + children
      const courses = await client.query(`
        INSERT INTO header_menu_items (menu_key, parent_id, title, icon_class, link_url, target_section, display_order, is_active)
        VALUES ('courses', NULL, 'Courses', 'ri-book-open-line', NULL, NULL, 4, true)
        RETURNING id;
      `);
      const coursesId = courses.rows[0].id;

      await client.query(`
        INSERT INTO header_menu_items (menu_key, parent_id, title, icon_class, link_url, target_section, display_order, is_active)
        VALUES ('courses_school_level', $1, 'School Level Courses', NULL, NULL, NULL, 1, true)
        ON CONFLICT DO NOTHING;
      `, [coursesId]);

      await client.query(`
        INSERT INTO header_menu_items (menu_key, parent_id, title, icon_class, link_url, target_section, display_order, is_active)
        VALUES ('courses_college_level', $1, 'College Level Courses', NULL, NULL, NULL, 2, true)
        ON CONFLICT DO NOTHING;
      `, [coursesId]);

      const schoolGroup = await client.query(
        `SELECT id FROM header_menu_items WHERE menu_key = 'courses_school_level' LIMIT 1`
      );
      const collegeGroup = await client.query(
        `SELECT id FROM header_menu_items WHERE menu_key = 'courses_college_level' LIMIT 1`
      );
      const schoolId = schoolGroup.rows[0]?.id;
      const collegeId = collegeGroup.rows[0]?.id;

      if (schoolId) {
        await client.query(`
          INSERT INTO header_menu_items (menu_key, parent_id, title, icon_class, link_url, target_section, display_order, is_active) VALUES
            ('courses_jee', $1, 'JEE/Engg', 'ri-calculator-line', NULL, '#department', 1, true),
            ('courses_neet', $1, 'NEET', 'ri-heart-pulse-line', NULL, '#department', 2, true),
            ('courses_clat', $1, 'CLAT', 'ri-scales-line', NULL, '#department', 3, true),
            ('courses_ipm', $1, 'IPM/BBA', 'ri-building-line', NULL, '#department', 4, true);
        `, [schoolId]);
      }

      if (collegeId) {
        await client.query(`
          INSERT INTO header_menu_items (menu_key, parent_id, title, icon_class, link_url, target_section, display_order, is_active) VALUES
            ('courses_cat', $1, 'CAT/MBA', 'ri-graduation-cap-line', NULL, '#department', 1, true),
            ('courses_bank', $1, 'Bank Exams', 'ri-bank-line', NULL, '#department', 2, true),
            ('courses_gate', $1, 'GATE', 'ri-book-open-line', NULL, '#department', 3, true),
            ('courses_gmat', $1, 'GMAT', 'ri-file-paper-line', NULL, '#department', 4, true),
            ('courses_icet', $1, 'ICET', 'ri-file-list-3-line', NULL, '#department', 5, true);
        `, [collegeId]);
      }
      
      console.log('Default header menu items inserted successfully!');
    } else {
      console.log('Header menu items already exist, skipping insertion.');
    }
    
    console.log('\n✅ Global settings and header menu tables created successfully!');
    console.log('\nNext steps:');
    console.log('1. Go to Super Admin > Settings to enable header dropdown menus');
    console.log('2. Toggle individual menu items on/off as needed');
    
  } catch (error) {
    console.error('Error creating tables:', error);
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
}

createGlobalSettingsTables().catch(console.error);
