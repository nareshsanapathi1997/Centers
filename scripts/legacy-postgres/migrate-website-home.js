const fs = require('fs')
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

const DEFAULT_SECTIONS = [
  { key: 'hero', order: 1 },
  { key: 'news', order: 2 },
  { key: 'courses', order: 3 },
  { key: 'results', order: 4 },
  { key: 'video_testimonials', order: 5 },
  { key: 'text_testimonials', order: 6 },
  { key: 'student_stories', order: 7 },
  { key: 'leadership', order: 8 },
  { key: 'senior_faculty', order: 9 },
  { key: 'gallery', order: 10 },
  { key: 'blog', order: 11 },
  { key: 'about', order: 12 },
  { key: 'centers', order: 13 },
  { key: 'faq', order: 14 },
]

async function migrateWebsiteHome() {
  const client = await pool.connect()
  try {
    console.log('Applying website home schema...')
    const sql = fs.readFileSync(path.join(__dirname, '../lib/website-home-schema.sql'), 'utf8')
    await client.query(sql)

    console.log('Seeding default website section configs...')
    for (const section of DEFAULT_SECTIONS) {
      await client.query(
        `INSERT INTO website_section_configs (section_key, is_enabled, display_order)
         VALUES ($1, true, $2)
         ON CONFLICT (section_key) DO NOTHING`,
        [section.key, section.order]
      )
    }

    await client.query(
      `UPDATE website_section_configs SET is_enabled = false
       WHERE section_key IN ('centers', 'leadership', 'senior_faculty')`
    )

    await client.query(
      `INSERT INTO global_settings (setting_key, setting_value, description)
       VALUES ('website_home_branding_center_slug', '', 'Center slug used for hero enquiry form on website home (empty = first active center)')
       ON CONFLICT (setting_key) DO NOTHING`
    )

    console.log('Applying website home chrome schema...')
    const chromeSql = fs.readFileSync(path.join(__dirname, '../lib/website-home-chrome-schema.sql'), 'utf8')
    await client.query(chromeSql)

    const chromeSettings = [
      ['website_site_name', 'T.I.M.E.', 'Website home site name'],
      ['website_site_tagline', 'India\'s leading test-prep institute for CAT, Bank, GATE, NEET & more.', 'Website footer tagline'],
      ['website_header_top_enabled', 'false', 'Show header-top social bar on website home'],
      ['website_header_phone', '', 'Website header phone'],
      ['website_header_whatsapp', '', 'Website header WhatsApp'],
      ['website_header_email', '', 'Website header email'],
      ['website_social_facebook', '', 'Website Facebook URL'],
      ['website_social_twitter', '', 'Website X URL'],
      ['website_social_instagram', '', 'Website Instagram URL'],
      ['website_social_linkedin', '', 'Website LinkedIn URL'],
      ['website_footer_copyright', 'Advanced Educational Activities Pvt. Ltd', 'Website footer copyright'],
      ['website_hero_badge_brand', 'T.I.M.E.', 'Website hero slider badge brand (left part)'],
      ['website_hero_badge_title', '', 'Website hero slider badge title (right part, e.g. India)'],
    ]
    for (const [key, value, desc] of chromeSettings) {
      await client.query(
        `INSERT INTO global_settings (setting_key, setting_value, description) VALUES ($1, $2, $3) ON CONFLICT (setting_key) DO NOTHING`,
        [key, value, desc]
      )
    }

    const mainNavSeed = [
      ['About Us', '/about', 1],
      ['Our Results', '/results', 2],
      ['Our Centres', '/centers', 3],
      ['Courses', '/courses', 4],
      ['Jobs@T.I.M.E.', '/vacancies', 5],
    ]
    console.log('Resetting website main navigation...')
    await client.query('DELETE FROM website_main_nav_items')
    for (const [label, href, order] of mainNavSeed) {
      await client.query(
        `INSERT INTO website_main_nav_items (label, href, display_order, is_active)
         VALUES ($1::varchar, $2::varchar, $3::int, true)`,
        [label, href, order]
      )
    }

    console.log('Seeding website header dropdown menu...')
    const { runWebsiteHeaderMenuSeed } = require('./seed-website-header-menu')
    await runWebsiteHeaderMenuSeed(client, { reset: true })

    const footerSeed = [
      ['quick_links_1', 'Quick Links', 'Home', '#hero', 1],
      ['quick_links_1', 'Quick Links', 'About', '/about', 2],
      ['quick_links_1', 'Quick Links', 'Contact', '/contact', 3],
      ['quick_links_1', 'Quick Links', 'Centers', '/centers', 4],
      ['quick_links_2', 'Explore', 'Results', '/results', 1],
      ['quick_links_2', 'Explore', 'Courses', '/courses', 2],
      ['quick_links_2', 'Explore', 'Blog', '/blog', 3],
      ['quick_links_2', 'Explore', 'Gallery', '/#gallery', 4],
      ['quick_links_2', 'Explore', 'FAQ', '/#faq', 5],
    ]
    for (const [group, groupTitle, title, section, order] of footerSeed) {
      await client.query(
        `INSERT INTO website_footer_menu_items (menu_group, group_title, title, icon_class, target_section, display_order, is_active)
         SELECT $1::varchar, $2::varchar, $3::varchar, 'ri-arrow-right-s-line', $4::varchar, $5::int, true
         WHERE NOT EXISTS (SELECT 1 FROM website_footer_menu_items WHERE menu_group = $1 AND title = $3)`,
        [group, groupTitle, title, section, order]
      )
    }

    const { runWebsiteHomeSeed } = require('./seed-website-home')
    await runWebsiteHomeSeed(client)

    console.log('✅ Website home tables ready.')
  } catch (error) {
    console.error('❌ Website home migration failed:', error)
    process.exitCode = 1
  } finally {
    client.release()
    await pool.end()
  }
}

migrateWebsiteHome()
