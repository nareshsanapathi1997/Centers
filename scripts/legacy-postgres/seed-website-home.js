/**
 * Seed sample content for the corporate website home page (website_* tables).
 * Idempotent: skips tables that already have rows.
 *
 * Usage: node scripts/seed-website-home.js
 * Or:    npm run db:seed:website-home
 */

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

async function tableIsEmpty(client, table) {
  const result = await client.query(`SELECT COUNT(*)::int AS count FROM ${table}`)
  return (result.rows[0]?.count ?? 0) === 0
}

async function seedHeroSlides(client) {
  if (!(await tableIsEmpty(client, 'website_hero_slides'))) {
    console.log('  skip website_hero_slides (already has data)')
    return
  }
  await client.query(
    `INSERT INTO website_hero_slides (title, slider_image_url, button_link, display_order, is_active)
     VALUES
       ('Home banner 1', '/assets/img/hero/hero-slider-1.jpg', '/courses', 1, true),
       ('Home banner 2', '/assets/img/hero/hero-slider-1.jpg', '/about', 2, true)`
  )
  console.log('  seeded website_hero_slides')
}

async function seedNews(client) {
  if (!(await tableIsEmpty(client, 'website_news_items'))) {
    console.log('  skip website_news_items (already has data)')
    return
  }
  await client.query(
    `INSERT INTO website_news_items (title, content, is_new, is_notification, display_order, is_active)
     VALUES
       ('CAT 2025 Batch Registration Now Open', 'Limited seats available across India. Enquire today.', true, false, 1, true),
       ('50+ Selections in Top B-Schools', 'Congratulations to our students on outstanding results.', false, false, 2, true),
       ('New Weekend Batch Starting Soon', 'Enroll now for early bird discount at your nearest centre.', true, true, 1, true)`
  )
  console.log('  seeded website_news_items')
}

async function seedResults(client) {
  if (!(await tableIsEmpty(client, 'website_result_images'))) {
    console.log('  skip website_result_images (already has data)')
    return
  }
  await client.query(
    `INSERT INTO website_result_images (title, image_url, display_order, is_active)
     VALUES
       ('BANK 2025 Results', '/assets/img/results.jpg', 1, true),
       ('CAT 2024 Results', '/assets/img/results2.jpg', 2, true),
       ('GATE 2024 Results', '/assets/img/results3.jpg', 3, true),
       ('CLAT 2024 Results', '/assets/img/results4.jpg', 4, true)`
  )
  console.log('  seeded website_result_images')
}

async function seedTextTestimonials(client) {
  if (!(await tableIsEmpty(client, 'website_text_testimonials'))) {
    console.log('  skip website_text_testimonials (already has data)')
    return
  }
  await client.query(
    `INSERT INTO website_text_testimonials (quote, author_name, author_role, display_order, is_active)
     VALUES
       ('The faculty at T.I.M.E. helped me build strong fundamentals and improve my accuracy. The structured classes and regular tests played a major role in my CAT preparation.', 'Rohit Kumar', 'CAT Aspirant', 1, true),
       ('T.I.M.E. provided the right guidance and mock tests for my bank exam preparation. The personalized feedback made all the difference.', 'Priya Sharma', 'Bank Exam Selected', 2, true)`
  )
  console.log('  seeded website_text_testimonials')
}

async function seedVideoTestimonials(client) {
  if (!(await tableIsEmpty(client, 'website_video_testimonials'))) {
    console.log('  skip website_video_testimonials (already has data)')
    return
  }
  await client.query(
    `INSERT INTO website_video_testimonials (title, video_url, display_order, is_active)
     VALUES ('Student Success Story', 'https://www.youtube.com/watch?v=dQw4w9WgXcQ', 1, true)`
  )
  console.log('  seeded website_video_testimonials')
}

async function seedStudentStories(client) {
  if (!(await tableIsEmpty(client, 'website_student_stories'))) {
    console.log('  skip website_student_stories (already has data)')
    return
  }
  await client.query(
    `INSERT INTO website_student_stories
       (student_name, student_image_url, course_name, batch_year, achievement_title, story_content, testimonial_quote, is_featured, display_order, is_active)
     VALUES
       ('Ananya Reddy', '/assets/img/team/team-1.jpg', 'CAT', '2024', '99.8 percentile in CAT',
        'Ananya joined T.I.M.E. with a clear goal of cracking CAT. Through disciplined preparation and mentor support, she achieved a top percentile and secured admission to a premier B-School.',
        'T.I.M.E. gave me the structure and confidence I needed.', true, 1, true),
       ('Vikram Singh', '/assets/img/team/team-2.jpg', 'Bank Exams', '2024', 'Selected in SBI PO',
        'Vikram balanced work and preparation with T.I.M.E. weekend batches. Regular mocks and doubt sessions helped him clear the SBI PO exam on his first attempt.',
        'The mock tests were closest to the actual exam.', false, 2, true)`
  )
  console.log('  seeded website_student_stories')
}

async function seedLeadership(client) {
  console.log('  skip website_leadership (not used on main website home)')
}

async function seedSeniorFaculty(client) {
  console.log('  skip website_senior_faculty (not used on main website home)')
}

async function seedGallery(client) {
  if (!(await tableIsEmpty(client, 'website_gallery_images'))) {
    console.log('  skip website_gallery_images (already has data)')
    return
  }
  await client.query(
    `INSERT INTO website_gallery_images (title, image_url, gallery_type, display_order, is_active)
     VALUES
       ('Classroom Session', '/assets/img/gallery-img.jpg', 'general', 1, true),
       ('Student Interaction', '/assets/img/gallery-img.jpg', 'photos', 2, true),
       ('Award Ceremony', '/assets/img/gallery-img.jpg', 'general', 3, true)`
  )
  console.log('  seeded website_gallery_images')
}

async function seedBlog(client) {
  if (!(await tableIsEmpty(client, 'website_blog_posts'))) {
    console.log('  skip website_blog_posts (already has data)')
    return
  }
  await client.query(
    `INSERT INTO website_blog_posts (title, slug, excerpt, content, featured_image_url, author_name, published_date, is_published)
     VALUES
       ('How to Prepare for CAT 2025', 'how-to-prepare-for-cat-2025', 'Essential tips and strategies for CAT 2025 preparation.', 'Complete guide to CAT preparation including study plan, mock tests, and time management.', '/assets/img/blog1.jpg', 'T.I.M.E. Faculty', CURRENT_DATE, true),
       ('Bank Exam Preparation Tips', 'bank-exam-preparation-tips', 'Expert advice for banking exams.', 'Comprehensive guide to banking exams covering syllabus, books, and practice strategy.', '/assets/img/blog2.jpg', 'T.I.M.E. Faculty', CURRENT_DATE, true),
       ('GATE 2025 Strategy Guide', 'gate-2025-strategy-guide', 'Master GATE with these proven strategies.', 'Detailed GATE preparation guide for engineering aspirants.', '/assets/img/blog3.jpg', 'T.I.M.E. Faculty', CURRENT_DATE, true)`
  )
  console.log('  seeded website_blog_posts')
}

async function seedAbout(client) {
  if (!(await tableIsEmpty(client, 'website_about_sections'))) {
    console.log('  skip website_about_sections (already has data)')
    return
  }
  await client.query(
    `INSERT INTO website_about_sections (title, heading, description, subtext, feature_list, image_url, is_active)
     VALUES (
       'Get To Know Us',
       'Empowering Students with Quality Education',
       'T.I.M.E. is committed to academic excellence, building strong fundamentals, and helping students achieve their goals in competitive exams and beyond. Our experienced faculty, proven pedagogy, and result-oriented approach have made us a trusted name in test preparation across India.',
       'Committed to excellence, student success, and long-term career growth.',
       ARRAY[
         'Structured curriculum designed for competitive exams',
         'Experienced faculty with industry expertise',
         'Regular assessments and performance tracking',
         'Personalized attention and doubt-resolution support',
         'Proven track record of top ranks and selections'
       ],
       '/assets/img/about-img.jpg',
       true
     )`
  )
  console.log('  seeded website_about_sections')
}

async function seedFaqs(client) {
  if (!(await tableIsEmpty(client, 'website_faqs'))) {
    console.log('  skip website_faqs (already has data)')
    return
  }
  await client.query(
    `INSERT INTO website_faqs (question, answer, display_order, is_active) VALUES
       ('What courses does T.I.M.E. offer?', 'T.I.M.E. offers competitive exam preparation programs including CAT, MBA entrance exams, banking and government exams, GATE, NEET, CLAT, and foundation-level courses for school and college students.', 1, true),
       ('How many centres does T.I.M.E. have in India?', 'T.I.M.E. operates centres across major cities in India. Visit our Our Centres page to find an active centre near you.', 2, true),
       ('Do you provide demo classes or counseling sessions?', 'Yes, T.I.M.E. offers counseling sessions and, in select programs, demo classes to help students understand the course structure before enrollment.', 3, true),
       ('What is the teaching methodology at T.I.M.E.?', 'Our methodology focuses on strong conceptual clarity, regular assessments, doubt-clearing sessions, and exam-oriented practice through mock tests and performance analysis.', 4, true),
       ('How can students enroll or contact T.I.M.E.?', 'Students can enroll by visiting any T.I.M.E. centre, calling the contact numbers on this site, or submitting an enquiry through the form on the home page.', 5, true)`
  )
  console.log('  seeded website_faqs')
}

async function seedChromeFromCenter(client) {
  const center = await client.query(
    `SELECT slug, phone, email, social_whatsapp, social_facebook, social_twitter, social_instagram, social_linkedin
     FROM centers WHERE is_active = true ORDER BY id ASC LIMIT 1`
  )
  const row = center.rows[0]
  if (!row) return

  const phone = Array.isArray(row.phone) ? row.phone[0] : row.phone
  const updates = [
    ['website_home_branding_center_slug', row.slug || ''],
    ['website_hero_badge_title', 'India'],
    ['website_header_phone', phone || ''],
    ['website_header_email', row.email || ''],
    ['website_header_whatsapp', row.social_whatsapp || ''],
    ['website_social_facebook', row.social_facebook || ''],
    ['website_social_twitter', row.social_twitter || ''],
    ['website_social_instagram', row.social_instagram || ''],
    ['website_social_linkedin', row.social_linkedin || ''],
  ]

  for (const [key, value] of updates) {
    if (!value) continue
    await client.query(
      `INSERT INTO global_settings (setting_key, setting_value, description)
       VALUES ($1, $2, 'Website home chrome')
       ON CONFLICT (setting_key) DO UPDATE SET setting_value = EXCLUDED.setting_value, updated_at = CURRENT_TIMESTAMP`,
      [key, String(value)]
    )
  }
  console.log(`  updated chrome settings from centre: ${row.slug}`)
}

async function runWebsiteHomeSeed(client, options = {}) {
  const { closePool = false } = options
  const ownsClient = !client
  const db = client || (await pool.connect())

  try {
    console.log('Seeding website home page content...')
    await seedHeroSlides(db)
    await seedNews(db)
    await seedResults(db)
    await seedTextTestimonials(db)
    await seedVideoTestimonials(db)
    await seedStudentStories(db)
    await seedLeadership(db)
    await seedSeniorFaculty(db)
    await seedGallery(db)
    await seedBlog(db)
    await seedAbout(db)
    await seedFaqs(db)
    await seedChromeFromCenter(db)
    console.log('✅ Website home seed complete.')
  } catch (error) {
    console.error('❌ Website home seed failed:', error)
    throw error
  } finally {
    if (ownsClient) db.release()
    if (closePool) await pool.end()
  }
}

async function seedWebsiteHomeContent() {
  try {
    await runWebsiteHomeSeed(null, { closePool: true })
  } catch {
    process.exitCode = 1
  }
}

if (require.main === module) {
  seedWebsiteHomeContent()
}

module.exports = { runWebsiteHomeSeed, seedWebsiteHomeContent }
