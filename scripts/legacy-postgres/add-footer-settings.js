require('dotenv').config()
const { Pool } = require('pg')

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
})

if (!process.env.DATABASE_URL) {
  console.error('ERROR: DATABASE_URL environment variable is not set.')
  console.error('Make sure you have a .env file with DATABASE_URL configured.')
  process.exit(1)
}

async function addFooterSettings() {
  const client = await pool.connect()
  
  try {
    console.log('Adding footer settings...')
    
    // Create footer_menu_items table
    await client.query(`
      CREATE TABLE IF NOT EXISTS footer_menu_items (
        id SERIAL PRIMARY KEY,
        menu_group VARCHAR(100) NOT NULL,
        title VARCHAR(255) NOT NULL,
        icon_class VARCHAR(100),
        link_url VARCHAR(255),
        target_section VARCHAR(100),
        display_order INTEGER DEFAULT 0,
        is_active BOOLEAN DEFAULT true,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `)
    
    console.log('✓ Created footer_menu_items table')
    
    // Insert default footer menu items
    await client.query(`
      INSERT INTO footer_menu_items (menu_group, title, icon_class, link_url, target_section, display_order, is_active) VALUES
        ('quick_links_1', 'Home', 'ri-arrow-right-s-line', NULL, '#hero', 1, true),
        ('quick_links_1', 'About', 'ri-arrow-right-s-line', NULL, '#about', 2, true),
        ('quick_links_1', 'Centers', 'ri-arrow-right-s-line', NULL, '#centers', 3, true),
        ('quick_links_1', 'Courses', 'ri-arrow-right-s-line', NULL, '#department', 4, true),
        ('quick_links_2', 'Leadership', 'ri-arrow-right-s-line', NULL, '#leadership', 1, true),
        ('quick_links_2', 'Results', 'ri-arrow-right-s-line', NULL, '#results', 2, true),
        ('quick_links_2', 'Gallery', 'ri-arrow-right-s-line', NULL, '#gallery', 3, true),
        ('quick_links_2', 'Contact', 'ri-arrow-right-s-line', NULL, '#centers', 4, true)
      ON CONFLICT DO NOTHING
    `)
    
    console.log('✓ Inserted default footer menu items')
    
    // Add footer copyright text setting
    await client.query(`
      INSERT INTO global_settings (setting_key, setting_value, setting_type, description) VALUES
        ('footer_copyright_text', 'Advanced Educational Activities Pvt. Ltd', 'string', 'Copyright text displayed in footer')
      ON CONFLICT (setting_key) DO NOTHING
    `)
    
    console.log('✓ Added footer copyright text setting')
    
    console.log('\n✅ Footer settings added successfully!')
    console.log('\nYou can now:')
    console.log('1. Go to Super Admin → Settings → Footer')
    console.log('2. Manage footer copyright text')
    console.log('3. Manage footer quick links')
    console.log('4. Contact information will automatically display if available in center settings')
    
  } catch (error) {
    console.error('❌ Error adding footer settings:', error.message)
    process.exit(1)
  } finally {
    client.release()
    await pool.end()
  }
}

addFooterSettings()
