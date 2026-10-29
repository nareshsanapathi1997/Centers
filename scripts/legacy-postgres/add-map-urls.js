require('dotenv').config();
const { Pool } = require('pg');

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

const mapUrls = [
  { 
    id: 1, 
    name: 'Adyar',
    url: 'https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d3887.2345!2d80.2537!3d12.9941!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x3a526781f5bc0!2sAdyar%2C%20Chennai%2C%20Tamil%20Nadu!5e0!3m2!1sen!2sin!4v1700000000000!5m2!1sen!2sin' 
  },
  { 
    id: 2, 
    name: 'Sholinganallur',
    url: 'https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d3888.0123!2d80.2275!3d12.9012!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x3a525c5d1234!2sSholinganallur%2C%20Chennai%2C%20Tamil%20Nadu!5e0!3m2!1sen!2sin!4v1700000000001!5m2!1sen!2sin' 
  },
  { 
    id: 3, 
    name: 'Nungambakkam',
    url: 'https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d3886.6543!2d80.2425!3d13.0612!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x3a526f5678!2sNungambakkam%2C%20Chennai%2C%20Tamil%20Nadu!5e0!3m2!1sen!2sin!4v1700000000002!5m2!1sen!2sin' 
  },
  { 
    id: 4, 
    name: 'Tambaram',
    url: 'https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d3889.8765!2d80.1275!3d12.9256!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x3a525b9012!2sTambaram%2C%20Chennai%2C%20Tamil%20Nadu!5e0!3m2!1sen!2sin!4v1700000000003!5m2!1sen!2sin' 
  }
];

async function updateMaps() {
  try {
    for (const map of mapUrls) {
      await pool.query('UPDATE centers SET map_embed_url = $1 WHERE id = $2', [map.url, map.id]);
      console.log(`Updated center ${map.id} (${map.name}) with map URL`);
    }
    console.log('\nAll centers updated with map URLs!');
    
    // Verify the update
    const result = await pool.query('SELECT id, name, map_embed_url FROM centers');
    console.log('\nCurrent centers with map URLs:');
    result.rows.forEach(row => {
      console.log(`  ${row.id}. ${row.name}: ${row.map_embed_url ? 'Has URL' : 'No URL'}`);
    });
    
  } catch (error) {
    console.error('Error updating map URLs:', error);
  } finally {
    pool.end();
  }
}

updateMaps();
