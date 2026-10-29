import { NextRequest, NextResponse } from 'next/server'
import pool from '@/lib/db'
import { BRAND, centerEmail } from '@/lib/brand'
import { verifySuperAdminAuth } from '@/lib/super-admin-auth'
import bcrypt from 'bcryptjs'
import { sendAdminCredentialsEmail } from '@/lib/email'
import { withBasePath } from '@/lib/with-base-path'

export const dynamic = 'force-dynamic'

// Get all centers
export async function GET(request: NextRequest) {
  try {
    const authResult = await verifySuperAdminAuth(request)
    if (!authResult.authorized) {
      return NextResponse.json(
        { error: authResult.error || 'Unauthorized' },
        { status: 403 }
      )
    }

    const result = await pool.query(
      'SELECT * FROM centers ORDER BY created_at DESC'
    )
    return NextResponse.json(result.rows)
  } catch (error) {
    console.error('Error fetching centers:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// Create a new center
export async function POST(request: NextRequest) {
  try {
    const authResult = await verifySuperAdminAuth(request)
    if (!authResult.authorized) {
      return NextResponse.json(
        { error: authResult.error || 'Unauthorized' },
        { status: 403 }
      )
    }

    const body = await request.json()
    const {
      slug, name, description, phone, email, address, google_rating, google_rating_url,
      map_embed_url, logo_url, logo_dark_url, favicon_url, center_image_url, social_facebook,
      social_twitter, social_instagram, social_linkedin, social_whatsapp,
      social_telegram, working_hours, is_active,
      list_on_nearby_host,
      nearby_host_center_id,
    } = body

    if (!slug || !name) {
      return NextResponse.json({ error: 'Slug and name are required' }, { status: 400 })
    }

    const createdIsActive = is_active !== false
    if (!createdIsActive && list_on_nearby_host) {
      const rawHost = nearby_host_center_id
      if (rawHost == null || rawHost === '') {
        return NextResponse.json(
          {
            error:
              'Select an active host center to show this inactive center on its Our Centers list',
          },
          { status: 400 }
        )
      }
      const hostIdPre = parseInt(String(rawHost), 10)
      if (!Number.isFinite(hostIdPre)) {
        return NextResponse.json(
          { error: 'Invalid host center for Our Centers listing' },
          { status: 400 }
        )
      }
      const hostPre = await pool.query(
        'SELECT id FROM centers WHERE id = $1 AND is_active = true',
        [hostIdPre]
      )
      if (hostPre.rows.length === 0) {
        return NextResponse.json(
          { error: 'Host center must be an active center' },
          { status: 400 }
        )
      }
    }

    // Check if slug already exists
    const existingCenter = await pool.query(
      'SELECT id FROM centers WHERE slug = $1',
      [slug]
    )

    if (existingCenter.rows.length > 0) {
      return NextResponse.json({ error: 'Center with this slug already exists' }, { status: 400 })
    }

    // Convert phone to array format if it's a string
    let phoneArray = null
    if (phone) {
      if (Array.isArray(phone)) {
        phoneArray = phone
      } else if (typeof phone === 'string') {
        // Handle comma-separated string or single phone number
        phoneArray = phone.split(',').map(p => p.trim()).filter(p => p.length > 0)
        if (phoneArray.length === 0) {
          phoneArray = null
        }
      }
    }

    // Set default logos and favicon if not provided
    const defaultLogoLight = '/assets/img/logo.png'
    const defaultLogoDark = '/assets/img/logo-white.png'
    const defaultFavicon = '/assets/img/favicon.png'

    const finalLogoUrl = logo_url || defaultLogoLight
    const finalLogoDarkUrl = logo_dark_url || defaultLogoDark
    const finalFaviconUrl = favicon_url || defaultFavicon

    const result = await pool.query(
      `INSERT INTO centers (
        slug, name, description, phone, email, address, google_rating, google_rating_url,
        map_embed_url, logo_url, logo_dark_url, favicon_url, center_image_url, social_facebook,
        social_twitter, social_instagram, social_linkedin, social_whatsapp,
        social_telegram, working_hours, is_active
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21)
      RETURNING *`,
      [
        slug, name || null, description || null, phoneArray, email || null, address || null,
        google_rating || null, google_rating_url || null, map_embed_url || null,
        finalLogoUrl, finalLogoDarkUrl, finalFaviconUrl, center_image_url || null,
        social_facebook || null, social_twitter || null, social_instagram || null,
        social_linkedin || null, social_whatsapp || null, social_telegram || null,
        working_hours || null, is_active !== false
      ]
    )

    const newCenter = result.rows[0]

    // Create default section configs for the new center
    const defaultSections = [
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
      { key: 'centers', enabled: false, order: 13 },
      { key: 'faq', enabled: true, order: 14 },
    ]

    for (const section of defaultSections) {
      await pool.query(
        'INSERT INTO section_configs (center_id, section_key, is_enabled, display_order) VALUES ($1, $2, $3, $4)',
        [newCenter.id, section.key, section.enabled, section.order]
      )
    }

    // Create a default hero slide with default banner image
    // Background image is managed globally via hero_common_background_image setting
    const defaultHeroSlide = {
      title: `Welcome to ${name}`,
      slider_image_url: '/assets/img/hero/hero-slider-1.jpg', // Default banner image
      button_link: '#about',
      display_order: 1,
      is_active: true,
    }

    try {
      await pool.query(
        `INSERT INTO hero_slides (center_id, title, slider_image_url, button_link, show_content, display_order, is_active)
         VALUES ($1, $2, $3, $4, false, $5, $6)`,
        [
          newCenter.id,
          defaultHeroSlide.title,
          defaultHeroSlide.slider_image_url,
          defaultHeroSlide.button_link,
          false, // show_content is false (banner only, no text)
          defaultHeroSlide.display_order,
          defaultHeroSlide.is_active
        ]
      )
    } catch (error: any) {
      // If hero_slides table doesn't exist yet, log warning but don't fail center creation
      if (error.code === '42P01') {
        console.warn('hero_slides table does not exist yet. Skipping default hero slide creation.')
      } else {
        console.error('Error creating default hero slide:', error)
      }
    }

    // Create default FAQs for the new center
    const defaultFAQs = [
      {
        question: `What courses are offered at ${name}?`,
        answer: `${name} offers a wide range of competitive exam preparation programs including CAT, MBA entrance exams, banking and government exams, as well as foundation-level courses for school and college students.`,
        display_order: 1,
      },
      {
        question: `How can students enroll or contact ${name}?`,
        answer: `Students can enroll by visiting ${name}, calling the provided contact numbers, or submitting an enquiry through the contact form on this page. Our team will guide them through the admission process.`,
        display_order: 2,
      },
      {
        question: 'Do you provide demo classes or counseling sessions?',
        answer: 'Yes, we offer counseling sessions and, in select programs, demo classes to help students understand the course structure, teaching methodology, and learning outcomes before enrollment.',
        display_order: 3,
      },
      {
        question: 'What is the teaching methodology followed?',
        answer: 'The teaching methodology focuses on strong conceptual clarity, regular assessments, doubt-clearing sessions, and exam-oriented practice through mock tests and performance analysis.',
        display_order: 4,
      },
    ]

    try {
      for (const faq of defaultFAQs) {
        await pool.query(
          `INSERT INTO faqs (center_id, question, answer, display_order, is_active)
           VALUES ($1, $2, $3, $4, true)`,
          [newCenter.id, faq.question, faq.answer, faq.display_order]
        )
      }
    } catch (error: any) {
      // If faqs table doesn't exist yet, log warning but don't fail center creation
      if (error.code === '42P01') {
        console.warn('faqs table does not exist yet. Skipping default FAQs creation.')
      } else {
        console.error('Error creating default FAQs:', error)
      }
    }

    // Create default About section for the new center
    const defaultAboutFeatures = [
      'Experienced faculty with proven teaching methodologies',
      'Concept-focused learning with continuous assessment',
      'Multiple centers for easy accessibility',
    ]

    try {
      await pool.query(
        `INSERT INTO about_sections (center_id, title, heading, description, subtext, feature_list, is_active)
         VALUES ($1, $2, $3, $4, $5, $6, true)`,
        [
          newCenter.id,
          'Get To Know Us',
          `Empowering Students with Quality Education at ${name}`,
          `${name} is part of the nationally renowned ${BRAND.shortName} network, known for its strong academic foundation, expert faculty, and result-driven approach to competitive exam preparation. With a deep understanding of student needs, we focus on building concepts, confidence, and consistency.\n\nOur centers provide structured learning programs, personalized mentoring, and comprehensive study material designed to help students excel in CAT, MBA entrance exams, and other competitive and foundation-level courses.`,
          'Committed to academic excellence, student success, and long-term career growth',
          defaultAboutFeatures,
        ]
      )
    } catch (error: any) {
      // If about_sections table doesn't exist yet, log warning but don't fail center creation
      if (error.code === '42P01') {
        console.warn('about_sections table does not exist yet. Skipping default about section creation.')
      } else {
        console.error('Error creating default about section:', error)
      }
    }

    // Create default admin login credentials for the center
    try {
      // Generate default username from center slug (e.g., "chennai-central" -> "chennai-central-admin")
      const defaultUsername = `${slug}-admin`
      const defaultEmail = email || centerEmail(slug)
      const { generateTemporaryPassword } = await import('@/lib/generate-password')
      const defaultPassword = generateTemporaryPassword()
      const defaultFullName = `${name} Admin`

      // Hash the one-time password; must_change_password forces a reset on first login
      const hashedPassword = await bcrypt.hash(defaultPassword, 10)

      // Check if username already exists (shouldn't happen, but just in case)
      const existingAdmin = await pool.query(
        'SELECT id FROM center_admins WHERE username = $1',
        [defaultUsername]
      )

      if (existingAdmin.rows.length === 0) {
        await pool.query(
          `INSERT INTO center_admins (center_id, username, email, password_hash, full_name, is_active, is_owner, must_change_password)
           VALUES ($1, $2, $3, $4, $5, true, true, true)`,
          [newCenter.id, defaultUsername, defaultEmail, hashedPassword, defaultFullName]
        )
        console.log(`Default admin created for center ${name}: Username: ${defaultUsername} (temporary password emailed)`)
        
        // Send admin credentials email
        try {
          const origin = (process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3600').replace(/\/+$/, '')
          const loginUrl = `${origin}${withBasePath('/admin/login')}`
          await sendAdminCredentialsEmail(
            defaultEmail,
            defaultFullName,
            name,
            defaultUsername,
            defaultPassword,
            loginUrl
          )
          console.log(`Admin credentials email sent to ${defaultEmail}`)
        } catch (emailError) {
          console.error('Error sending admin credentials email:', emailError)
          // Don't fail center creation if email fails
        }
      } else {
        console.warn(`Admin with username ${defaultUsername} already exists. Skipping admin creation.`)
      }
    } catch (error: any) {
      // If center_admins table doesn't exist yet, log warning but don't fail center creation
      if (error.code === '42P01') {
        console.warn('center_admins table does not exist yet. Skipping default admin creation.')
      } else {
        console.error('Error creating default admin:', error)
        // Don't fail center creation if admin creation fails
      }
    }

    if (!createdIsActive && list_on_nearby_host && nearby_host_center_id != null && nearby_host_center_id !== '') {
      try {
        const hostId = parseInt(String(nearby_host_center_id), 10)
        if (Number.isFinite(hostId) && hostId !== newCenter.id) {
          const host = await pool.query(
            'SELECT id FROM centers WHERE id = $1 AND is_active = true',
            [hostId]
          )
          if (host.rows.length > 0) {
            const orderResult = await pool.query(
              'SELECT COALESCE(MAX(display_order), -1) + 1 AS next_order FROM nearby_centers WHERE center_id = $1',
              [hostId]
            )
            const nextOrder = orderResult.rows[0]?.next_order ?? 0
            await pool.query(
              `INSERT INTO nearby_centers (center_id, nearby_center_id, display_order)
               VALUES ($1, $2, $3)
               ON CONFLICT (center_id, nearby_center_id) DO NOTHING`,
              [hostId, newCenter.id, nextOrder]
            )
          }
        }
      } catch (e: any) {
        if (e.code === '42P01') {
          console.warn('nearby_centers table missing; skipping nearby listing link')
        } else {
          console.error('Error linking nearby center listing:', e)
        }
      }
    }

    return NextResponse.json(newCenter, { status: 201 })
  } catch (error: any) {
    console.error('Error creating center:', error)
    if (error.code === '23505') { // Unique violation
      return NextResponse.json({ error: 'Center with this slug already exists' }, { status: 400 })
    }
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

