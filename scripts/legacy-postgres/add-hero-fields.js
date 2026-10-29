require('dotenv').config();
const { Pool } = require('pg');

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

async function addHeroFields() {
  try {
    // Add slider_image_url column if it doesn't exist
    await pool.query(`
      ALTER TABLE hero_slides 
      ADD COLUMN IF NOT EXISTS slider_image_url TEXT
    `);
    console.log('Added slider_image_url column');

    // Add show_content column if it doesn't exist (default true for backward compatibility)
    await pool.query(`
      ALTER TABLE hero_slides 
      ADD COLUMN IF NOT EXISTS show_content BOOLEAN DEFAULT true
    `);
    console.log('Added show_content column');

    // Verify the columns
    const result = await pool.query(`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'hero_slides'
      ORDER BY ordinal_position
    `);
    
    console.log('\nHero slides table columns:');
    result.rows.forEach(row => {
      console.log(`  - ${row.column_name}: ${row.data_type}`);
    });

    console.log('\nMigration completed successfully!');

  } catch (error) {
    console.error('Error:', error);
  } finally {
    pool.end();
  }
}

addHeroFields();
