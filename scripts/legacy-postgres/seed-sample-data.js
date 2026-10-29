const { Pool } = require('pg')
const bcrypt = require('bcryptjs')
require('dotenv').config()

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
})

async function seed() {
  try {
    // Create a sample center
    const centerResult = await pool.query(
      `INSERT INTO centers (slug, name, description, email, phone, address, working_hours, logo_url, logo_dark_url, favicon_url, social_facebook, social_instagram, social_linkedin, social_whatsapp)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)
       RETURNING id`,
      [
        'chennai-adyar',
        'T.I.M.E. Chennai - Adyar',
        'T.I.M.E. Chennai is a trusted name in competitive exam preparation, offering expert faculty, structured programs, and proven methodologies.',
        'chennai@time4education.com',
        ['4424460166', '4435113138'],
        'T.I.M.E. Adyar Office, 3rd floor, "CEEBROS Arcade", No.1, Third Cross Street, Kasturiba nagar Ambika Appalam Building, Adyar Chennai- 600020.',
        'Sat - Thu: 10:00 am - 7:00 pm',
        '/assets/img/logo.png', // Logo light
        '/assets/img/logo-white.png', // Logo dark
        '/assets/img/favicon.png', // Favicon
        'https://facebook.com/time',
        'https://instagram.com/time',
        'https://linkedin.com/company/time',
        'https://wa.me/919876543210',
      ]
    )

    const centerId = centerResult.rows[0].id

    // Create admin user — temporary password printed once; force change on first login
    const crypto = require('crypto')
    const samplePassword = `Dev-${crypto.randomBytes(4).toString('hex')}!`
    const hashedPassword = await bcrypt.hash(samplePassword, 10)
    await pool.query(
      `INSERT INTO center_admins (center_id, username, email, password_hash, full_name, is_owner, must_change_password)
       VALUES ($1, $2, $3, $4, $5, true, true)`,
      [centerId, 'admin', 'admin@example.com', hashedPassword, 'Admin User']
    )
    console.log(`  Sample admin password (change on first login): ${samplePassword}`)

    // Create section configs
    const sections = [
      { key: 'hero', enabled: true, order: 1 },
      { key: 'news', enabled: true, order: 2 },
      { key: 'courses', enabled: true, order: 3 },
      { key: 'results', enabled: true, order: 4 },
      { key: 'video_testimonials', enabled: true, order: 5 },
      { key: 'text_testimonials', enabled: true, order: 6 },
      { key: 'student_stories', enabled: true, order: 7 },
      { key: 'leadership', enabled: true, order: 8 },
      { key: 'senior_faculty', enabled: true, order: 9 },
      { key: 'gallery', enabled: true, order: 10 },
      { key: 'blog', enabled: true, order: 11 },
      { key: 'about', enabled: true, order: 12 },
      { key: 'centers', enabled: true, order: 13 },
      { key: 'faq', enabled: true, order: 14 },
    ]

    for (const section of sections) {
      await pool.query(
        `INSERT INTO section_configs (center_id, section_key, is_enabled, display_order)
         VALUES ($1, $2, $3, $4)`,
        [centerId, section.key, section.enabled, section.order]
      )
    }

    // Create sample hero slides
    await pool.query(
      `INSERT INTO hero_slides (center_id, title, subtitle, description, button_text, button_link, background_image_url, display_order)
       VALUES
         ($1, 'Shaping Successful Careers with T.I.M.E. Chennai', 'Welcome to T.I.M.E. Chennai', 'T.I.M.E. Chennai is a trusted name in competitive exam preparation.', 'View Location', '#centers', '/assets/img/hero/hero-slider-1.jpg', 1),
         ($2, 'Expert Coaching, Proven Results', 'Your Success Starts at T.I.M.E. Chennai', 'With multiple centers across Chennai, T.I.M.E. provides personalized mentoring.', 'Explore Courses', '#department', '/assets/img/hero/hero-slider-1.jpg', 2)`,
      [centerId, centerId]
    )

    // Create sample courses
    const courses = [
      { name: 'Bank Exams', category: 'college_level' },
      { name: 'CAT', category: 'college_level' },
      { name: 'CMAT', category: 'college_level' },
      { name: 'GATE', category: 'college_level' },
      { name: 'CLAT', category: 'school_level' },
      { name: 'IPM', category: 'school_level' },
    ]

    for (const course of courses) {
      await pool.query(
        `INSERT INTO courses (center_id, name, category, display_order)
         VALUES ($1, $2, $3, (SELECT COALESCE(MAX(display_order), 0) + 1 FROM courses WHERE center_id = $1))`,
        [centerId, course.name, course.category]
      )
    }

    // Create sample news items
    await pool.query(
      `INSERT INTO news_items (center_id, title, is_new, is_notification, display_order)
       VALUES
         ($1, 'CAT 2025 Batch Registration Now Open - Limited Seats Available', true, false, 1),
         ($2, 'Congratulations to Our Students - 50+ Selections in Top B-Schools', false, false, 2),
         ($3, 'New Weekend Batch Starting Soon - Enroll Now for Early Bird Discount', true, true, 1)`,
      [centerId, centerId, centerId]
    )

    // Create sample text testimonial
    await pool.query(
      `INSERT INTO text_testimonials (center_id, quote, author_name, author_role, display_order)
       VALUES ($1, 'The faculty at T.I.M.E. Chennai helped me build strong fundamentals and improve my accuracy. The structured classes and regular tests played a major role in my CAT preparation.', 'Rohit Kumar', 'CAT Aspirant', 1)`,
      [centerId]
    )

    // Create sample leadership
    await pool.query(
      `INSERT INTO leadership (center_id, name, role, image_url, message_title, message_content, bio)
       VALUES ($1, 'M. Arvind Kumar', 'Center Director – T.I.M.E. Chennai', '/assets/img/director.jpg', 'Guiding Students Towards Academic and Career Excellence', 'At T.I.M.E. Chennai, our focus has always been on delivering quality education that empowers students to achieve their academic goals with confidence.', 'Heading operations at Chennai, Arvind is a Civil Engineer & a Post Graduate in Management from XLRI with about 20 years of experience in teaching.')`,
      [centerId]
    )

    // Create sample result images
    await pool.query(
      `INSERT INTO result_images (center_id, title, image_url, display_order)
       VALUES
         ($1, 'BANK 2025 Results', '/assets/img/results.jpg', 1),
         ($2, 'CAT 2024 Results', '/assets/img/results2.jpg', 2),
         ($3, 'GATE 2024 Results', '/assets/img/results3.jpg', 3),
         ($4, 'CLAT 2024 Results', '/assets/img/results4.jpg', 4)`,
      [centerId, centerId, centerId, centerId]
    )

    // Create sample gallery images
    await pool.query(
      `INSERT INTO gallery_images (center_id, title, image_url, gallery_type, display_order)
       VALUES
         ($1, 'Gallery Image One', '/assets/img/gallery-img.jpg', 'general', 1),
         ($2, 'Gallery Image Two', '/assets/img/gallery-img.jpg', 'general', 2),
         ($3, 'Gallery Image Three', '/assets/img/gallery-img.jpg', 'general', 3)`,
      [centerId, centerId, centerId]
    )

    // Create sample blog posts
    await pool.query(
      `INSERT INTO blog_posts (center_id, title, slug, excerpt, content, featured_image_url, author_name, published_date, is_published)
       VALUES
         ($1, 'How to Prepare for CAT 2025', 'how-to-prepare-for-cat-2025', 'Essential tips and strategies for CAT 2025 preparation', 'Complete guide to CAT preparation...', '/assets/img/blog1.jpg', 'T.I.M.E. Faculty', CURRENT_DATE, true),
         ($2, 'Bank Exam Preparation Tips', 'bank-exam-preparation-tips', 'Expert advice for banking exams', 'Comprehensive guide to banking exams...', '/assets/img/blog2.jpg', 'T.I.M.E. Faculty', CURRENT_DATE, true),
         ($3, 'GATE 2025 Strategy Guide', 'gate-2025-strategy-guide', 'Master GATE with these proven strategies', 'Detailed GATE preparation guide...', '/assets/img/blog3.jpg', 'T.I.M.E. Faculty', CURRENT_DATE, true)`,
      [centerId, centerId, centerId]
    )

    // Create sample FAQs (People Also Ask)
    await pool.query(
      `INSERT INTO faqs (center_id, question, answer, display_order) VALUES
         ($1, 'What courses are offered at T.I.M.E. Chennai?', 'T.I.M.E. Chennai offers competitive exam preparation programs including CAT, MBA entrance exams, banking and government exams, as well as foundation-level courses for school and college students.', 1),
         ($1, 'How many centers does T.I.M.E. have in Chennai?', 'T.I.M.E. Chennai operates multiple centers across the city, making it convenient for students to choose a location that best suits their accessibility and learning preferences.', 2),
         ($1, 'Do you provide demo classes or counseling sessions?', 'Yes, T.I.M.E. Chennai offers counseling sessions and, in select programs, demo classes to help students understand the course structure, teaching methodology, and learning outcomes before enrollment.', 3),
         ($1, 'What is the teaching methodology followed at T.I.M.E. Chennai?', 'The teaching methodology focuses on strong conceptual clarity, regular assessments, doubt-clearing sessions, and exam-oriented practice through mock tests and performance analysis.', 4),
         ($1, 'How can students enroll or contact T.I.M.E. Chennai?', 'Students can enroll by visiting any T.I.M.E. Chennai center, calling the provided contact numbers, or submitting an enquiry through the contact form on this page. Our team will guide them through the admission process.', 5)`,
      [centerId]
    )

    console.log('Sample data seeded successfully!')
    console.log(`Center ID: ${centerId}`)
    console.log('Admin credentials:')
    console.log('  Username: admin')
    console.log(`  Password: ${samplePassword} (must change on first login)`)
    console.log(`\nAccess the center at: http://localhost:3600/chennai-adyar`)
    console.log(`Admin login: http://localhost:3600/admin/login`)
  } catch (error) {
    console.error('Error seeding data:', error)
  } finally {
    await pool.end()
  }
}

seed()

