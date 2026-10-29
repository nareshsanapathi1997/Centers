const { Pool } = require('pg')
require('dotenv').config()

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
})

async function addMissingData() {
  try {
    console.log('Adding missing data to database...')

    // Get center ID (assuming center with slug 'chennai-adyar' or first center)
    const centerResult = await pool.query('SELECT id FROM centers LIMIT 1')
    if (centerResult.rows.length === 0) {
      console.error('No centers found. Please run seed script first.')
      process.exit(1)
    }
    const centerId = centerResult.rows[0].id
    console.log(`Using center ID: ${centerId}`)

    // Check if FAQs table exists, if not create it
    await pool.query(`
      CREATE TABLE IF NOT EXISTS faqs (
        id SERIAL PRIMARY KEY,
        center_id INTEGER REFERENCES centers(id) ON DELETE CASCADE,
        question TEXT NOT NULL,
        answer TEXT NOT NULL,
        display_order INTEGER DEFAULT 0,
        is_active BOOLEAN DEFAULT true,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `)

    // Add FAQs if not exists
    const faqCount = await pool.query('SELECT COUNT(*) as count FROM faqs WHERE center_id = $1', [centerId])
    if (parseInt(faqCount.rows[0].count) === 0) {
      console.log('Adding FAQs...')
      await pool.query(
        `INSERT INTO faqs (center_id, question, answer, display_order) VALUES
         ($1, 'What courses are offered at T.I.M.E. Chennai?', 'T.I.M.E. Chennai offers a wide range of competitive exam preparation programs including CAT, MBA entrance exams, banking and government exams, as well as foundation-level courses for school and college students.', 1),
         ($1, 'How many centers does T.I.M.E. have in Chennai?', 'T.I.M.E. Chennai operates multiple centers across the city, making it convenient for students to choose a location that best suits their accessibility and learning preferences.', 2),
         ($1, 'Do you provide demo classes or counseling sessions?', 'Yes, T.I.M.E. Chennai offers counseling sessions and, in select programs, demo classes to help students understand the course structure, teaching methodology, and learning outcomes before enrollment.', 3),
         ($1, 'What is the teaching methodology followed at T.I.M.E. Chennai?', 'The teaching methodology focuses on strong conceptual clarity, regular assessments, doubt-clearing sessions, and exam-oriented practice through mock tests and performance analysis.', 4),
         ($1, 'How can students enroll or contact T.I.M.E. Chennai?', 'Students can enroll by visiting any T.I.M.E. Chennai center, calling the provided contact numbers, or submitting an enquiry through the contact form on this page. Our team will guide them through the admission process.', 5)`,
        [centerId]
      )
      console.log('✓ FAQs added')
    } else {
      console.log('✓ FAQs already exist')
    }

    // Add Video Testimonials if not exists
    const videoCount = await pool.query('SELECT COUNT(*) as count FROM video_testimonials WHERE center_id = $1', [centerId])
    if (parseInt(videoCount.rows[0].count) === 0) {
      console.log('Adding Video Testimonials...')
      await pool.query(
        `INSERT INTO video_testimonials (center_id, title, video_url, display_order) VALUES
         ($1, 'CAT Preparation Journey', 'https://www.youtube.com/embed/LtjKmX5ViaE', 1),
         ($1, 'MBA Entrance Success', 'https://www.youtube.com/embed/be2w10FIQiA', 2),
         ($1, 'Concept Clarity & Practice', 'https://www.youtube.com/embed/Qk60xXffo3s', 3),
         ($1, 'Faculty & Mentorship', 'https://www.youtube.com/embed/59xr1SbC3ug', 4),
         ($1, 'Learning Environment', 'https://www.youtube.com/embed/LtjKmX5ViaE', 5)`,
        [centerId]
      )
      console.log('✓ Video Testimonials added')
    } else {
      console.log('✓ Video Testimonials already exist')
    }

    // Add Text Testimonials if not exists
    const textCount = await pool.query('SELECT COUNT(*) as count FROM text_testimonials WHERE center_id = $1', [centerId])
    if (parseInt(textCount.rows[0].count) === 0) {
      console.log('Adding Text Testimonials...')
      await pool.query(
        `INSERT INTO text_testimonials (center_id, quote, author_name, author_role, display_order) VALUES
         ($1, 'The faculty at T.I.M.E. Chennai helped me build strong fundamentals and improve my accuracy. The structured classes and regular tests played a major role in my CAT preparation.', 'Rohit Kumar', 'CAT Aspirant', 1),
         ($1, 'T.I.M.E. Chennai provides excellent study material and continuous mentoring. The doubt-clearing sessions and mock tests helped me gain confidence step by step.', 'Ananya Sharma', 'MBA Entrance Exam Student', 2),
         ($1, 'The Chennai centers offer a very supportive learning environment. Faculty guidance and regular feedback helped me improve my performance consistently.', 'Suresh R', 'Banking Exam Aspirant', 3),
         ($1, 'As a parent, I was impressed with the discipline and mentoring provided at T.I.M.E. Chennai. Regular updates and academic focus gave us great confidence.', 'Mr. Ramesh Iyer', 'Parent', 4),
         ($1, 'The teaching methodology at T.I.M.E. Chennai is very practical and exam-oriented. The mock exams closely match actual exam patterns.', 'Neha Verma', 'Management Entrance Aspirant', 5)`,
        [centerId]
      )
      console.log('✓ Text Testimonials added')
    } else {
      console.log('✓ Text Testimonials already exist')
    }

    // Add Other Centers if not exists
    const otherCentersCount = await pool.query('SELECT COUNT(*) as count FROM centers WHERE id != $1', [centerId])
    if (parseInt(otherCentersCount.rows[0].count) === 0) {
      console.log('Adding Other Centers...')
      await pool.query(
        `INSERT INTO centers (slug, name, description, phone, email, address, google_rating, logo_url, logo_dark_url, favicon_url) VALUES
         ('chennai-sholinganallur', 'T.I.M.E. Chennai - Sholinganallur', 'T.I.M.E. Sholinganallur center', ARRAY['4448597340', '4435113140', '8939972103'], 'chennai@time4education.com', '3rd floor, "CEEBROS Arcade", No.1, Third Cross Street, Kasturiba nagar Ambika Appalam Building, Adyar Chennai- 600020. (Study centre - Sacred Heart Mat High Sec School No 11, 2nd Cross Street, Devaraj Nagar, Sholinganallur)', 4.7, '/assets/img/logo.png', '/assets/img/logo-white.png', '/assets/img/favicon.png'),
         ('chennai-nungambakkam', 'T.I.M.E. Chennai - Nungambakkam', 'T.I.M.E. Nungambakkam center', ARRAY['8939972101', '4435113135', '4443009797', '4443015021'], 'chennai@time4education.com', 'No 110/1, Nungambakkam High Road, 4th Floor, Above SBI, Arcade Center, Nungambakkam Chennai -600034', 4.7, '/assets/img/logo.png', '/assets/img/logo-white.png', '/assets/img/favicon.png'),
         ('chennai-tambaram', 'T.I.M.E. Chennai - Tambaram', 'T.I.M.E. Tambaram center', ARRAY['8939972104', '48631882', '22262180'], 'chennai@time4education.com', 'No.2A, 2nd Floor, Duraisamy Reddy Street, Near Passport Office, Opp, Agarwal Eye Hospital West, Tambram, Chennai - 600045.', 4.7, '/assets/img/logo.png', '/assets/img/logo-white.png', '/assets/img/favicon.png')`
      )
      console.log('✓ Other Centers added')
    } else {
      console.log('✓ Other Centers already exist')
    }

    // Add Blog Posts if not exists
    const blogCount = await pool.query('SELECT COUNT(*) as count FROM blog_posts WHERE center_id = $1', [centerId])
    if (parseInt(blogCount.rows[0].count) === 0) {
      console.log('Adding Blog Posts...')
      const today = new Date()
      const date1 = new Date(today)
      date1.setDate(today.getDate() - 1)
      const date2 = new Date(today)
      date2.setDate(today.getDate() - 2)
      const date3 = new Date(today)
      date3.setDate(today.getDate() - 3)

      await pool.query(
        `INSERT INTO blog_posts (center_id, title, slug, excerpt, content, author_name, featured_image_url, published_date, is_published) VALUES
         ($1, 'CAT 2025 Preparation Tips: Expert Strategies for Success', 'cat-2025-preparation-tips', 'Discover proven strategies and expert tips to excel in CAT 2025. Learn from T.I.M.E. Chennai''s experienced faculty and boost your preparation.', 'Full content here...', 'Admin', '/assets/img/blog1.jpg', $2, true),
         ($1, 'MBA Entrance Exams: Complete Guide for 2025', 'mba-entrance-exams-guide-2025', 'Comprehensive guide covering all major MBA entrance exams, eligibility criteria, and preparation strategies to help you achieve your goals.', 'Full content here...', 'Admin', '/assets/img/blog2.jpg', $3, true),
         ($1, 'Student Success Stories: How T.I.M.E. Chennai Changed Lives', 'student-success-stories', 'Read inspiring stories from our successful students who achieved their dreams with T.I.M.E. Chennai''s expert guidance and support.', 'Full content here...', 'Admin', '/assets/img/blog3.jpg', $4, true)`,
        [centerId, date1.toISOString(), date2.toISOString(), date3.toISOString()]
      )
      console.log('✓ Blog Posts added')
    } else {
      console.log('✓ Blog Posts already exist')
    }

    // Add News Items if not exists (is_notification = false)
    const newsCount = await pool.query('SELECT COUNT(*) as count FROM news_items WHERE center_id = $1 AND is_notification = false', [centerId])
    if (parseInt(newsCount.rows[0].count) === 0) {
      console.log('Adding News Items...')
      await pool.query(
        `INSERT INTO news_items (center_id, title, link_url, is_notification, is_new, display_order) VALUES
         ($1, 'CAT 2025 Batch Registration Now Open - Limited Seats Available', '#service', false, true, 1),
         ($1, 'Congratulations to Our Students - 50+ Selections in Top B-Schools', '#results', false, false, 2),
         ($1, 'New Weekend Batch Starting Soon - Enroll Now for Early Bird Discount', '#department', false, true, 3),
         ($1, 'Free Mock Test Series - Test Your Preparation Level Today', '#gallery', false, false, 4),
         ($1, 'Expert Faculty Workshop - Learn from Industry Leaders', '#leadership', false, false, 5),
         ($1, 'Scholarship Program 2025 - Apply Now for Financial Assistance', '#contact', false, true, 6)`,
        [centerId]
      )
      console.log('✓ News Items added')
    } else {
      console.log('✓ News Items already exist')
    }

    // Add Notifications if not exists (is_notification = true)
    const notifCount = await pool.query('SELECT COUNT(*) as count FROM news_items WHERE center_id = $1 AND is_notification = true', [centerId])
    if (parseInt(notifCount.rows[0].count) === 0) {
      console.log('Adding Notifications...')
      await pool.query(
        `INSERT INTO news_items (center_id, title, link_url, is_notification, is_new, display_order) VALUES
         ($1, 'CAT 2025 Batch Registration Now Open - Limited Seats Available', '#service', true, false, 1),
         ($1, 'Congratulations to Our Students - 50+ Selections in Top B-Schools', '#results', true, false, 2),
         ($1, 'New Weekend Batch Starting Soon - Enroll Now for Early Bird Discount', '#department', true, false, 3),
         ($1, 'Free Mock Test Series - Test Your Preparation Level Today', '#gallery', true, false, 4),
         ($1, 'Expert Faculty Workshop - Learn from Industry Leaders', '#leadership', true, false, 5),
         ($1, 'Scholarship Program 2025 - Apply Now for Financial Assistance', '#contact', true, false, 6)`,
        [centerId]
      )
      console.log('✓ Notifications added')
    } else {
      console.log('✓ Notifications already exist')
    }

    console.log('\n✅ All missing data added successfully!')
  } catch (error) {
    console.error('Error adding missing data:', error)
    process.exit(1)
  } finally {
    await pool.end()
  }
}

addMissingData()

