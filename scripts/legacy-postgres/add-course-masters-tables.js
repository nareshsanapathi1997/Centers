const { Pool } = require('pg')
require('dotenv').config()

const pool = new Pool({ connectionString: process.env.DATABASE_URL })

const FALLBACK_CATEGORIES = [
  { course_name: 'AP ICET', slug: 'ap-icet' },
  { course_name: 'BANK Exams', slug: 'BankExams' },
  { course_name: 'CAT/MBA', slug: 'cat-Mba' },
  { course_name: 'CMAT', slug: 'cmat' },
  { course_name: 'CRT', slug: 'crt' },
  { course_name: 'GATE', slug: 'gate' },
  { course_name: 'GMAT', slug: 'gmat' },
  { course_name: 'GRE', slug: 'gre' },
  { course_name: 'MAH-MBA', slug: 'mah-mba' },
  { course_name: 'MAT', slug: 'mat' },
  { course_name: 'Other MBA Exams', slug: 'other-mba-exams' },
  { course_name: 'SSC-CGLE', slug: 'ssc-cgle' },
  { course_name: 'TG ICET', slug: 'tg-icet' },
  { course_name: 'BBA', slug: 'bba' },
  { course_name: 'BITSAT', slug: 'bitsat' },
  { course_name: 'CLAT', slug: 'clat' },
  { course_name: 'CUET', slug: 'Cuet' },
  { course_name: 'EAPCET', slug: 'eapcet' },
  { course_name: 'Hotel Management', slug: 'hotel-management' },
  { course_name: 'IIMB BBA DBE', slug: 'iimb-bba-dbe' },
  { course_name: 'IIT Foundation', slug: 'iit-foundation' },
  { course_name: 'IPM', slug: 'ipm' },
  { course_name: 'JEE/Engg', slug: 'jee-engg' },
  { course_name: 'MAH BBA CET', slug: 'mah-bba-cet' },
  { course_name: 'MAH LAW CET', slug: 'mah-law-cet' },
  { course_name: 'NEET', slug: 'neet' },
  { course_name: 'School Tuitions', slug: 'school-tutions' },
]

async function fetchPreloginCategories() {
  if (!process.env.PRELOGIN_DATABASE_URL) return null

  const prelogin = new Pool({ connectionString: process.env.PRELOGIN_DATABASE_URL })
  try {
    const result = await prelogin.query(
      `SELECT course_name, slug FROM course_categories ORDER BY course_name`
    )
    return result.rows.map((row, index) => ({ ...row, display_order: index }))
  } catch (error) {
    console.warn('Could not read from prelogin DB:', error.message)
    return null
  } finally {
    await prelogin.end()
  }
}

async function seedMainCourses(rows) {
  let inserted = 0
  for (let i = 0; i < rows.length; i++) {
    const row = rows[i]
    const slug =
      row.slug ||
      row.course_name
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-|-$/g, '')
    const result = await pool.query(
      `INSERT INTO course_masters (parent_id, level_type, title, slug, display_order, is_active)
       VALUES (NULL, 'main_course', $1, $2, $3, true)
       ON CONFLICT (slug) DO NOTHING
       RETURNING id`,
      [row.course_name, slug, row.display_order ?? i]
    )
    if (result.rowCount > 0) inserted++
  }
  return inserted
}

async function addCourseMastersTables() {
  try {
    console.log('Creating course master tables...')

    await pool.query(`
      CREATE TABLE IF NOT EXISTS course_masters (
        id SERIAL PRIMARY KEY,
        parent_id INTEGER REFERENCES course_masters(id) ON DELETE CASCADE,
        level_type VARCHAR(30) NOT NULL CHECK (
          level_type IN ('main_course', 'sub_variant', 'course', 'sub_sub_variant', 'leaf_course')
        ),
        title VARCHAR(500) NOT NULL,
        slug VARCHAR(255) NOT NULL UNIQUE,
        short_description TEXT,
        detailed_description TEXT,
        image_url TEXT,
        brochure_url TEXT,
        syllabus_html TEXT,
        syllabus_pdf_url TEXT,
        demo_class_link TEXT,
        highlights JSONB DEFAULT '[]'::jsonb,
        features JSONB DEFAULT '[]'::jsonb,
        learning_outcomes JSONB DEFAULT '[]'::jsonb,
        eligibility_criteria JSONB DEFAULT '[]'::jsonb,
        duration VARCHAR(100),
        mode VARCHAR(20) CHECK (mode IS NULL OR mode IN ('online', 'offline', 'hybrid')),
        price DECIMAL(12, 2),
        discount_percent DECIMAL(5, 2),
        discount_amount DECIMAL(12, 2),
        coupon_code VARCHAR(100),
        coupon_enabled BOOLEAN DEFAULT false,
        installment_config JSONB DEFAULT '[]'::jsonb,
        enrollment_validity_days INTEGER,
        meta_title VARCHAR(255),
        meta_description TEXT,
        display_order INTEGER DEFAULT 0,
        is_active BOOLEAN DEFAULT true,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `)

    await pool.query(`
      CREATE TABLE IF NOT EXISTS course_master_batches (
        id SERIAL PRIMARY KEY,
        course_master_id INTEGER NOT NULL REFERENCES course_masters(id) ON DELETE CASCADE,
        batch_name VARCHAR(255),
        start_date DATE NOT NULL,
        end_date DATE,
        is_active BOOLEAN DEFAULT true,
        display_order INTEGER DEFAULT 0,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `)

    await pool.query(`
      CREATE TABLE IF NOT EXISTS course_master_faqs (
        id SERIAL PRIMARY KEY,
        course_master_id INTEGER NOT NULL REFERENCES course_masters(id) ON DELETE CASCADE,
        question TEXT NOT NULL,
        answer TEXT NOT NULL,
        display_order INTEGER DEFAULT 0,
        is_active BOOLEAN DEFAULT true,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `)

    await pool.query(`
      CREATE TABLE IF NOT EXISTS course_master_faculty (
        id SERIAL PRIMARY KEY,
        course_master_id INTEGER NOT NULL REFERENCES course_masters(id) ON DELETE CASCADE,
        name VARCHAR(255) NOT NULL,
        role VARCHAR(255),
        bio TEXT,
        image_url TEXT,
        display_order INTEGER DEFAULT 0,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `)

    await pool.query(`CREATE INDEX IF NOT EXISTS idx_course_masters_parent ON course_masters(parent_id)`)
    await pool.query(`CREATE INDEX IF NOT EXISTS idx_course_masters_level ON course_masters(level_type)`)
    await pool.query(`CREATE INDEX IF NOT EXISTS idx_course_masters_active ON course_masters(is_active)`)
    await pool.query(`CREATE INDEX IF NOT EXISTS idx_course_master_batches_course ON course_master_batches(course_master_id)`)
    await pool.query(`CREATE INDEX IF NOT EXISTS idx_course_master_faqs_course ON course_master_faqs(course_master_id)`)
    await pool.query(`CREATE INDEX IF NOT EXISTS idx_course_master_faculty_course ON course_master_faculty(course_master_id)`)

    const existing = await pool.query('SELECT COUNT(*)::int AS count FROM course_masters')
    if (existing.rows[0].count === 0) {
      const preloginRows = await fetchPreloginCategories()
      if (preloginRows?.length) {
        console.log(`Seeding ${preloginRows.length} main courses from prelogin course_categories...`)
        const inserted = await seedMainCourses(preloginRows)
        console.log(`Inserted ${inserted} main_course rows`)
      } else {
        console.log(`Seeding ${FALLBACK_CATEGORIES.length} main courses from fallback list...`)
        const inserted = await seedMainCourses(FALLBACK_CATEGORIES)
        console.log(`Inserted ${inserted} main_course rows`)
      }
    } else {
      console.log(`course_masters already has ${existing.rows[0].count} rows — skipping seed`)
    }

    console.log('✅ Course master tables ready')
    process.exit(0)
  } catch (error) {
    console.error('❌ Error:', error)
    process.exit(1)
  } finally {
    await pool.end()
  }
}

addCourseMastersTables()
