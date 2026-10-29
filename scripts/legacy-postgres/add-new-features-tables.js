require('dotenv').config()
const { Pool } = require('pg')

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
})

async function createNewTables() {
  const client = await pool.connect()
  
  try {
    await client.query('BEGIN')

    // Activity Logs Table
    console.log('Creating activity_logs table...')
    await client.query(`
      CREATE TABLE IF NOT EXISTS activity_logs (
        id SERIAL PRIMARY KEY,
        user_type VARCHAR(50) NOT NULL, -- 'admin' or 'super_admin'
        user_id INTEGER NOT NULL,
        center_id INTEGER REFERENCES centers(id) ON DELETE SET NULL,
        action VARCHAR(100) NOT NULL, -- 'create', 'update', 'delete', 'login', 'logout', etc.
        entity_type VARCHAR(100) NOT NULL, -- 'center', 'course', 'news', 'admin', etc.
        entity_id INTEGER,
        entity_name VARCHAR(255),
        details JSONB,
        ip_address VARCHAR(45),
        user_agent TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `)
    await client.query('CREATE INDEX IF NOT EXISTS idx_activity_logs_user ON activity_logs(user_type, user_id)')
    await client.query('CREATE INDEX IF NOT EXISTS idx_activity_logs_center ON activity_logs(center_id)')
    await client.query('CREATE INDEX IF NOT EXISTS idx_activity_logs_created_at ON activity_logs(created_at DESC)')
    console.log('✓ Created activity_logs table')

    // Notifications Table
    console.log('Creating notifications table...')
    await client.query(`
      CREATE TABLE IF NOT EXISTS notifications (
        id SERIAL PRIMARY KEY,
        user_type VARCHAR(50) NOT NULL, -- 'admin' or 'super_admin'
        user_id INTEGER NOT NULL,
        center_id INTEGER REFERENCES centers(id) ON DELETE SET NULL,
        title VARCHAR(255) NOT NULL,
        message TEXT NOT NULL,
        type VARCHAR(50) DEFAULT 'info', -- 'info', 'success', 'warning', 'error'
        link_url VARCHAR(500),
        is_read BOOLEAN DEFAULT false,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `)
    await client.query('CREATE INDEX IF NOT EXISTS idx_notifications_user ON notifications(user_type, user_id, is_read)')
    await client.query('CREATE INDEX IF NOT EXISTS idx_notifications_created_at ON notifications(created_at DESC)')
    console.log('✓ Created notifications table')

    // Password Reset Tokens Table
    console.log('Creating password_reset_tokens table...')
    await client.query(`
      CREATE TABLE IF NOT EXISTS password_reset_tokens (
        id SERIAL PRIMARY KEY,
        user_type VARCHAR(50) NOT NULL, -- 'admin' or 'super_admin'
        user_id INTEGER NOT NULL,
        token VARCHAR(255) UNIQUE NOT NULL,
        expires_at TIMESTAMP NOT NULL,
        used BOOLEAN DEFAULT false,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `)
    await client.query('CREATE INDEX IF NOT EXISTS idx_password_reset_tokens_token ON password_reset_tokens(token)')
    await client.query('CREATE INDEX IF NOT EXISTS idx_password_reset_tokens_user ON password_reset_tokens(user_type, user_id)')
    console.log('✓ Created password_reset_tokens table')

    // Content Versions Table (for versioning)
    console.log('Creating content_versions table...')
    await client.query(`
      CREATE TABLE IF NOT EXISTS content_versions (
        id SERIAL PRIMARY KEY,
        entity_type VARCHAR(100) NOT NULL, -- 'blog_post', 'news_item', 'course', etc.
        entity_id INTEGER NOT NULL,
        center_id INTEGER REFERENCES centers(id) ON DELETE CASCADE,
        version_number INTEGER NOT NULL,
        content_data JSONB NOT NULL,
        changed_by_user_type VARCHAR(50),
        changed_by_user_id INTEGER,
        change_summary TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `)
    await client.query('CREATE INDEX IF NOT EXISTS idx_content_versions_entity ON content_versions(entity_type, entity_id)')
    console.log('✓ Created content_versions table')

    // Image Library Table
    console.log('Creating image_library table...')
    await client.query(`
      CREATE TABLE IF NOT EXISTS image_library (
        id SERIAL PRIMARY KEY,
        center_id INTEGER REFERENCES centers(id) ON DELETE CASCADE,
        filename VARCHAR(255) NOT NULL,
        original_filename VARCHAR(255),
        file_path TEXT NOT NULL,
        file_url TEXT NOT NULL,
        file_size INTEGER,
        mime_type VARCHAR(100),
        width INTEGER,
        height INTEGER,
        alt_text VARCHAR(255),
        tags TEXT[],
        uploaded_by_user_type VARCHAR(50),
        uploaded_by_user_id INTEGER,
        usage_count INTEGER DEFAULT 0,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `)
    await client.query('CREATE INDEX IF NOT EXISTS idx_image_library_center ON image_library(center_id)')
    await client.query('CREATE INDEX IF NOT EXISTS idx_image_library_tags ON image_library USING GIN(tags)')
    console.log('✓ Created image_library table')

    // User Roles & Permissions Tables
    console.log('Creating roles and permissions tables...')
    await client.query(`
      CREATE TABLE IF NOT EXISTS roles (
        id SERIAL PRIMARY KEY,
        name VARCHAR(100) UNIQUE NOT NULL,
        description TEXT,
        is_system_role BOOLEAN DEFAULT false,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `)
    
    await client.query(`
      CREATE TABLE IF NOT EXISTS permissions (
        id SERIAL PRIMARY KEY,
        name VARCHAR(100) UNIQUE NOT NULL,
        resource VARCHAR(100) NOT NULL, -- 'centers', 'courses', 'news', etc.
        action VARCHAR(50) NOT NULL, -- 'create', 'read', 'update', 'delete'
        description TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `)
    
    await client.query(`
      CREATE TABLE IF NOT EXISTS role_permissions (
        id SERIAL PRIMARY KEY,
        role_id INTEGER REFERENCES roles(id) ON DELETE CASCADE,
        permission_id INTEGER REFERENCES permissions(id) ON DELETE CASCADE,
        UNIQUE(role_id, permission_id)
      )
    `)
    
    await client.query(`
      CREATE TABLE IF NOT EXISTS admin_roles (
        id SERIAL PRIMARY KEY,
        admin_id INTEGER NOT NULL,
        center_id INTEGER REFERENCES centers(id) ON DELETE CASCADE,
        role_id INTEGER REFERENCES roles(id) ON DELETE CASCADE,
        assigned_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        assigned_by_user_type VARCHAR(50),
        assigned_by_user_id INTEGER,
        UNIQUE(admin_id, center_id, role_id)
      )
    `)
    
    console.log('✓ Created roles and permissions tables')

    await client.query('COMMIT')
    console.log('\n✅ All new tables created successfully!')
    
  } catch (error) {
    await client.query('ROLLBACK')
    console.error('Error creating tables:', error)
    throw error
  } finally {
    client.release()
  }
}

createNewTables()
  .then(() => {
    console.log('\nMigration completed!')
    process.exit(0)
  })
  .catch((error) => {
    console.error('\nMigration failed:', error)
    process.exit(1)
  })
