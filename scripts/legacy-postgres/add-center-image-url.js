require('dotenv').config();
const { Pool } = require('pg');

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

async function addCenterImageUrl() {
  try {
    await pool.query(`
      ALTER TABLE centers
      ADD COLUMN IF NOT EXISTS center_image_url TEXT
    `);
    console.log('Added center_image_url column to centers table');
    console.log('\nMigration completed successfully!');
  } catch (error) {
    console.error('Error:', error);
    process.exitCode = 1;
  } finally {
    await pool.end();
  }
}

addCenterImageUrl();
