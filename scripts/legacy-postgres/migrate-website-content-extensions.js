const path = require('path')
const { Pool } = require('pg')

require('dotenv').config({ path: path.join(__dirname, '../.env') })
require('dotenv').config({ path: path.join(__dirname, '../.env.local') })

const pool = new Pool(
  process.env.DATABASE_URL
    ? { connectionString: process.env.DATABASE_URL }
    : {
        host: process.env.DB_HOST || 'localhost',
        port: parseInt(process.env.DB_PORT || '5432', 10),
        database: process.env.DB_NAME,
        user: process.env.DB_USER,
        password: process.env.DB_PASSWORD,
      }
)

async function migrate() {
  const client = await pool.connect()
  try {
    console.log('Adding philosophy fields to website_about_sections...')
    await client.query(`
      ALTER TABLE website_about_sections
        ADD COLUMN IF NOT EXISTS philosophy_heading VARCHAR(500),
        ADD COLUMN IF NOT EXISTS philosophy_description TEXT,
        ADD COLUMN IF NOT EXISTS philosophy_image_url TEXT,
        ADD COLUMN IF NOT EXISTS philosophy_feature_list TEXT[]
    `)

    await client.query(`
      UPDATE website_about_sections
      SET philosophy_heading = COALESCE(philosophy_heading, 'Our Philosophy'),
          philosophy_description = COALESCE(philosophy_description,
            'We believe in building strong fundamentals, disciplined preparation, and personalised mentoring. Our approach combines expert faculty, structured study plans, and continuous assessment to help every student reach their potential in competitive exams and beyond.'),
          philosophy_image_url = COALESCE(philosophy_image_url, image_url)
      WHERE philosophy_heading IS NULL OR philosophy_description IS NULL
    `)

    console.log('Adding exam_category to website_result_images...')
    await client.query(`
      ALTER TABLE website_result_images
        ADD COLUMN IF NOT EXISTS exam_category VARCHAR(30)
    `)

    console.log('Adding result_year to website_result_images...')
    await client.query(`
      ALTER TABLE website_result_images
        ADD COLUMN IF NOT EXISTS result_year INTEGER
    `)

    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_website_result_images_year
        ON website_result_images (result_year DESC)
    `)

    console.log('Adding rich text entry fields to website_result_images...')
    await client.query(`
      ALTER TABLE website_result_images
        ADD COLUMN IF NOT EXISTS content_html TEXT,
        ADD COLUMN IF NOT EXISTS entry_type VARCHAR(20) DEFAULT 'image'
    `)

    await client.query(`
      ALTER TABLE website_result_images
        ALTER COLUMN image_url DROP NOT NULL
    `)

    await client.query(`
      UPDATE website_result_images
      SET entry_type = COALESCE(NULLIF(TRIM(entry_type), ''), 'image')
      WHERE entry_type IS NULL OR TRIM(entry_type) = ''
    `)

    console.log('Adding About Us page meta fields to website_about_sections...')
    await client.query(`
      ALTER TABLE website_about_sections
        ADD COLUMN IF NOT EXISTS overview_hero_title VARCHAR(120),
        ADD COLUMN IF NOT EXISTS overview_hero_highlight VARCHAR(120),
        ADD COLUMN IF NOT EXISTS overview_hero_subtitle TEXT,
        ADD COLUMN IF NOT EXISTS overview_badge_years VARCHAR(40),
        ADD COLUMN IF NOT EXISTS overview_badge_label VARCHAR(120),
        ADD COLUMN IF NOT EXISTS philosophy_hero_title VARCHAR(120),
        ADD COLUMN IF NOT EXISTS philosophy_hero_highlight VARCHAR(120),
        ADD COLUMN IF NOT EXISTS philosophy_hero_subtitle TEXT,
        ADD COLUMN IF NOT EXISTS philosophy_eyebrow VARCHAR(200),
        ADD COLUMN IF NOT EXISTS promoters_hero_title VARCHAR(120),
        ADD COLUMN IF NOT EXISTS promoters_hero_highlight VARCHAR(120),
        ADD COLUMN IF NOT EXISTS promoters_hero_subtitle TEXT,
        ADD COLUMN IF NOT EXISTS promoters_eyebrow VARCHAR(200),
        ADD COLUMN IF NOT EXISTS promoters_section_heading VARCHAR(500),
        ADD COLUMN IF NOT EXISTS promoters_section_intro TEXT,
        ADD COLUMN IF NOT EXISTS promoters_directors_heading VARCHAR(500),
        ADD COLUMN IF NOT EXISTS promoters_directors_subtitle TEXT,
        ADD COLUMN IF NOT EXISTS promoters_message_label VARCHAR(200)
    `)

    await client.query(`
      UPDATE website_about_sections
      SET overview_hero_title = COALESCE(overview_hero_title, 'About'),
          overview_hero_highlight = COALESCE(overview_hero_highlight, 'Us'),
          overview_hero_subtitle = COALESCE(overview_hero_subtitle, 'Our mission, values, and commitment to your success'),
          overview_badge_years = COALESCE(overview_badge_years, '30+'),
          overview_badge_label = COALESCE(overview_badge_label, 'Years Of Excellence'),
          philosophy_hero_title = COALESCE(philosophy_hero_title, 'Our'),
          philosophy_hero_highlight = COALESCE(philosophy_hero_highlight, 'Philosophy'),
          promoters_hero_title = COALESCE(promoters_hero_title, 'Meet the'),
          promoters_hero_highlight = COALESCE(promoters_hero_highlight, 'Promoters'),
          promoters_eyebrow = COALESCE(promoters_eyebrow, 'Meet the Promoters'),
          promoters_directors_heading = COALESCE(promoters_directors_heading, 'Our Promoters'),
          promoters_directors_subtitle = COALESCE(promoters_directors_subtitle, 'Experienced leaders guiding T.I.M.E.''s national test-prep mission.'),
          promoters_message_label = COALESCE(promoters_message_label, 'Message from Our Promoters')
      WHERE overview_hero_title IS NULL
         OR philosophy_hero_title IS NULL
         OR promoters_hero_title IS NULL
    `)

    console.log('✅ Website content extensions applied.')
  } catch (error) {
    console.error('❌ Migration failed:', error)
    process.exitCode = 1
  } finally {
    client.release()
    await pool.end()
  }
}

migrate()
