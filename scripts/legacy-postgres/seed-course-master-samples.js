/**
 * Seed full course master hierarchies with every field populated (including images).
 *
 * Hierarchy per track:
 *   Main Course → Sub Variant → Sub-Sub Variant → Course (full detail)
 * Plus one shortcut: Main → Sub Variant → Course (no sub-sub).
 *
 * Usage: npm run db:seed:course-samples
 */
require('dotenv').config()
const { Pool } = require('pg')

const pool = new Pool({ connectionString: process.env.DATABASE_URL })

const IMG = {
  catMain: 'https://images.unsplash.com/photo-1523240795612-9a054b0db644?w=1200&q=80',
  catSub: 'https://images.unsplash.com/photo-1524178232363-1fb2b075b655?w=1200&q=80',
  catSubSub: 'https://images.unsplash.com/photo-1434030216411-0b793f4b4173?w=1200&q=80',
  catCourse: 'https://images.unsplash.com/photo-1522202176988-66273c2fd55f?w=1200&q=80',
  neetMain: 'https://images.unsplash.com/photo-1576091160399-112ba8d25d1d?w=1200&q=80',
  neetSub: 'https://images.unsplash.com/photo-1579686314135-95848d3a62d0?w=1200&q=80',
  neetSubSub: 'https://images.unsplash.com/photo-1582719471384-894fbb16e074?w=1200&q=80',
  neetCourse: 'https://images.unsplash.com/photo-1559757148-5c350d0d3c56?w=1200&q=80',
  bankMain: 'https://images.unsplash.com/photo-1554224155-6726b3ff858f?w=1200&q=80',
  bankSub: 'https://images.unsplash.com/photo-1454165804606-c3d57bc86b40?w=1200&q=80',
  bankSubSub: 'https://images.unsplash.com/photo-1460925895917-afdab827c52f?w=1200&q=80',
  bankCourse: 'https://images.unsplash.com/photo-1507679799987-c73779587ccf?w=1200&q=80',
  gateMain: 'https://images.unsplash.com/photo-1516321318423-f06f85e504b3?w=1200&q=80',
  gateSub: 'https://images.unsplash.com/photo-1517245386807-bb43f82c33c4?w=1200&q=80',
  gateCourse: 'https://images.unsplash.com/photo-1531482615713-2afd69097998?w=1200&q=80',
  faculty1: 'https://images.unsplash.com/photo-1560250097-0b93528c311a?w=400&q=80',
  faculty2: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=400&q=80',
  faculty3: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=400&q=80',
  faculty4: 'https://images.unsplash.com/photo-1580489944761-15a19d654956?w=400&q=80',
  brochure: 'https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf',
  syllabusPdf: 'https://www.africau.edu/images/default/sample.pdf',
}

const TRACKS = [
  {
    key: 'cat',
    main: {
      title: 'CAT / MBA Preparation',
      slug: 'sample-cat-mba',
      short_description: 'India\'s most trusted MBA entrance coaching with classroom, online, and hybrid options.',
      detailed_description:
        '<p>Comprehensive CAT and MBA entrance preparation designed for working professionals and final-year students.</p>',
      image_url: IMG.catMain,
      meta_title: 'CAT MBA Preparation | T.I.M.E.',
      meta_description: 'Expert CAT coaching with mock tests, study material, and personalized mentoring.',
    },
    sub: {
      title: 'Classroom Program',
      slug: 'sample-cat-classroom',
      short_description: 'Face-to-face classroom coaching with daily practice and doubt sessions.',
      detailed_description: '<p>Structured classroom batches with printed material and weekly tests.</p>',
      image_url: IMG.catSub,
    },
    subSub: {
      title: 'Weekend Batch',
      slug: 'sample-cat-weekend',
      short_description: 'Saturday–Sunday intensive batch for working aspirants.',
      detailed_description: '<p>Weekend-only schedule with live classes and recorded backup access.</p>',
      image_url: IMG.catSubSub,
    },
    course: {
      title: 'CAT 2026 Weekend Course',
      slug: 'sample-cat-2026-weekend',
      short_description: 'Full-length CAT weekend preparation with 100+ mocks and GD-PI support.',
      detailed_description: `<p>Our flagship <strong>CAT 2026 Weekend Course</strong> covers Quant, VARC, and DILR with expert faculty, printed booklets, and All-India mock CAT series.</p>
<ul><li>200+ hours of classroom teaching</li><li>Weekly sectional tests</li><li>Personal mentoring for B-school shortlisting</li></ul>`,
      image_url: IMG.catCourse,
      brochure_url: IMG.brochure,
      syllabus_pdf_url: IMG.syllabusPdf,
      syllabus_html:
        '<h3>Phase 1 — Foundations</h3><p>Number systems, reading comprehension basics, logical reasoning grids.</p><h3>Phase 2 — Advanced</h3><p>Mock-driven revision and speed strategies.</p>',
      demo_class_link: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
      highlights: ['100+ All-India mock CATs', 'Printed study material', 'GD-PI & WAT preparation', 'Doubt clearing every week'],
      features: ['Small batch sizes', 'Mobile app access', 'Performance analytics dashboard', 'Alumni mentor connect'],
      learning_outcomes: [
        'Score 95+ percentile in CAT',
        'Master time management in sectional tests',
        'Build strong fundamentals in all three sections',
        'Prepare a compelling B-school application profile',
      ],
      eligibility_criteria: [
        'Final-year graduate or working professional',
        'Minimum 50% in graduation (45% for reserved categories)',
        'Valid CAT registration for target year',
      ],
      duration: '12 months',
      mode: 'offline',
      price: 75000,
      discount_percent: 10,
      discount_amount: 7500,
      coupon_code: 'CAT2026EARLY',
      coupon_enabled: true,
      installment_config: [
        { label: 'Registration fee', amount: 5000, due_days: 0 },
        { label: '1st installment', amount: 25000, due_days: 15 },
        { label: '2nd installment', amount: 25000, due_days: 45 },
        { label: 'Final installment', amount: 20000, due_days: 90 },
      ],
      enrollment_validity_days: 365,
      meta_title: 'CAT 2026 Weekend Course | Classroom MBA Prep',
      meta_description: 'Join CAT 2026 weekend batch — mocks, material, GD-PI support. Enroll today with early-bird discount.',
      batches: [
        {
          batch_name: 'Weekend Morning Batch A',
          batch_timing: 'Sat–Sun 9:00 AM – 1:00 PM',
          schedule_days: 'Saturday, Sunday',
          start_date: '2026-07-05',
          end_date: '2027-06-30',
          enrollment_deadline: '2026-06-25',
          capacity: 40,
          notes: 'Ideal for working professionals in Chennai and Bangalore centers.',
          is_active: true,
          display_order: 0,
        },
        {
          batch_name: 'Weekend Evening Batch B',
          batch_timing: 'Sat–Sun 2:00 PM – 6:00 PM',
          schedule_days: 'Saturday, Sunday',
          start_date: '2026-08-02',
          end_date: '2027-07-31',
          enrollment_deadline: '2026-07-20',
          capacity: 35,
          notes: 'Includes extra VARC reading sessions on alternate Fridays.',
          is_active: true,
          display_order: 1,
        },
      ],
      faqs: [
        {
          question: 'Is study material included in the course fee?',
          answer: 'Yes. Printed booklets, mock test access, and online portal login are included.',
          is_active: true,
        },
        {
          question: 'Can I switch between weekend batches?',
          answer: 'Batch transfer is allowed once before the third class, subject to seat availability.',
          is_active: true,
        },
        {
          question: 'Do you provide GD-PI preparation?',
          answer: 'GD-PI and WAT workshops are included after CAT results for all enrolled students.',
          is_active: true,
        },
      ],
      faculty: [
        {
          name: 'Dr. Arun Mehta',
          role: 'Senior Quant Faculty',
          bio: 'IIM Ahmedabad alumnus with 15+ years of CAT Quant teaching experience.',
          image_url: IMG.faculty1,
        },
        {
          name: 'Priya Sharma',
          role: 'VARC Expert',
          bio: 'Specializes in reading comprehension strategy and verbal ability speed drills.',
          image_url: IMG.faculty2,
        },
      ],
    },
  },
  {
    key: 'neet',
    main: {
      title: 'NEET / Medical Entrance',
      slug: 'sample-neet',
      short_description: 'Structured NEET UG preparation with NCERT-focused pedagogy and test series.',
      detailed_description: '<p>Medical entrance coaching aligned to latest NEET pattern and syllabus.</p>',
      image_url: IMG.neetMain,
      meta_title: 'NEET Preparation Programs',
      meta_description: 'Live online and hybrid NEET coaching with biology-focused faculty.',
    },
    sub: {
      title: 'Online Live Program',
      slug: 'sample-neet-online',
      short_description: 'Live online classes with interactive polls and recorded replays.',
      detailed_description: '<p>Attend from anywhere with dedicated NEET doubt forums.</p>',
      image_url: IMG.neetSub,
    },
    subSub: {
      title: 'Evening Batch',
      slug: 'sample-neet-evening',
      short_description: 'Evening live sessions for school-going NEET aspirants.',
      detailed_description: '<p>Classes after school hours with weekly biology practical discussions.</p>',
      image_url: IMG.neetSubSub,
    },
    course: {
      title: 'NEET 2026 Evening Live Course',
      slug: 'sample-neet-2026-evening',
      short_description: 'Complete NEET syllabus coverage with 50+ full-length mock tests.',
      detailed_description: `<p><strong>NEET 2026 Evening Live Course</strong> delivers Physics, Chemistry, and Biology through live online classes, NCERT line-by-line coverage, and All-India NEET test series.</p>`,
      image_url: IMG.neetCourse,
      brochure_url: IMG.brochure,
      syllabus_pdf_url: IMG.syllabusPdf,
      syllabus_html:
        '<h3>Biology</h3><p>Botany & Zoology NCERT mastery.</p><h3>Physics & Chemistry</h3><p>Concept videos + numerical drills.</p>',
      demo_class_link: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
      highlights: ['NCERT-focused teaching', '50+ NEET mock tests', 'Daily practice sheets', 'Parent progress reports'],
      features: ['Live + recorded classes', 'Mobile app for revisions', 'Chapter-wise micro tests', 'Counselor support'],
      learning_outcomes: [
        'Complete NEET syllabus twice before exam',
        'Improve speed in Biology MCQs',
        'Build exam temperament with full mocks',
      ],
      eligibility_criteria: ['Class 11 or 12 science stream student', 'Targeting NEET UG 2026 or 2027'],
      duration: '18 months',
      mode: 'online',
      price: 95000,
      discount_percent: 8,
      discount_amount: 7600,
      coupon_code: 'NEET2026',
      coupon_enabled: true,
      installment_config: [
        { label: 'Enrollment', amount: 10000, due_days: 0 },
        { label: 'Mid-term', amount: 42500, due_days: 60 },
        { label: 'Final', amount: 42500, due_days: 120 },
      ],
      enrollment_validity_days: 540,
      meta_title: 'NEET 2026 Evening Live Course',
      meta_description: 'Live evening NEET classes, mocks, and NCERT coverage. Enroll with NEET2026 coupon.',
      batches: [
        {
          batch_name: 'Evening Live — Phase 1',
          batch_timing: 'Mon–Fri 6:00 PM – 8:30 PM',
          schedule_days: 'Monday to Friday',
          start_date: '2026-06-15',
          end_date: '2027-05-15',
          enrollment_deadline: '2026-06-01',
          capacity: 120,
          notes: 'Includes weekly Sunday doubt marathon.',
          is_active: true,
          display_order: 0,
        },
        {
          batch_name: 'Evening Live — Phase 2 (Crash)',
          batch_timing: 'Mon–Sat 5:30 PM – 8:00 PM',
          schedule_days: 'Monday to Saturday',
          start_date: '2027-01-10',
          end_date: '2027-05-01',
          enrollment_deadline: '2026-12-20',
          capacity: 80,
          notes: 'Revision-heavy batch for repeaters and late joiners.',
          is_active: true,
          display_order: 1,
        },
      ],
      faqs: [
        {
          question: 'Are recordings available if I miss a class?',
          answer: 'Yes. Recordings are uploaded within 24 hours on the student portal.',
          is_active: true,
        },
        {
          question: 'Is printed material shipped?',
          answer: 'Printed booklets are shipped within 7 working days of enrollment.',
          is_active: true,
        },
      ],
      faculty: [
        {
          name: 'Dr. Kavitha Reddy',
          role: 'Biology HOD',
          bio: 'MBBS, MD — 12 years teaching NEET Biology with focus on NCERT diagrams.',
          image_url: IMG.faculty3,
        },
        {
          name: 'Rahul Verma',
          role: 'Physics Faculty',
          bio: 'IIT graduate specializing in NEET Physics numerical problem solving.',
          image_url: IMG.faculty4,
        },
      ],
    },
  },
  {
    key: 'bank',
    main: {
      title: 'Bank & Government Exams',
      slug: 'sample-bank-exams',
      short_description: 'IBPS, SBI, and RBI exam preparation with bilingual support.',
      detailed_description: '<p>Bank exam coaching for PO, Clerk, and Specialist Officer tracks.</p>',
      image_url: IMG.bankMain,
      meta_title: 'Bank Exam Coaching',
      meta_description: 'Hybrid bank exam programs with test series and interview guidance.',
    },
    sub: {
      title: 'Hybrid Program',
      slug: 'sample-bank-hybrid',
      short_description: 'Mix of online live classes and monthly center visits for mocks.',
      detailed_description: '<p>Best of online flexibility with offline mock test experience.</p>',
      image_url: IMG.bankSub,
    },
    subSub: {
      title: 'Weekday Batch',
      slug: 'sample-bank-weekday',
      short_description: 'Weekday morning hybrid batch for full-time aspirants.',
      detailed_description: '<p>Intensive weekday schedule with banking awareness modules.</p>',
      image_url: IMG.bankSubSub,
    },
    course: {
      title: 'IBPS PO 2026 Weekday Course',
      slug: 'sample-ibps-2026-weekday',
      short_description: 'Complete IBPS PO prep — Prelims, Mains, and Interview.',
      detailed_description: `<p>Hybrid <strong>IBPS PO 2026</strong> course covering Quant, Reasoning, English, GA, and Descriptive writing with monthly center mock tests.</p>`,
      image_url: IMG.bankCourse,
      brochure_url: IMG.brochure,
      syllabus_pdf_url: IMG.syllabusPdf,
      syllabus_html: '<h3>Prelims</h3><p>Speed tests in QA, Reasoning, English.</p><h3>Mains</h3><p>Data interpretation and descriptive essays.</p>',
      demo_class_link: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
      highlights: ['40+ sectional tests', 'Monthly offline mocks', 'Banking awareness capsules', 'Interview mock panel'],
      features: ['Bilingual explanation', 'Current affairs PDFs', 'Descriptive writing reviews', 'Job alerts on portal'],
      learning_outcomes: [
        'Clear IBPS PO Prelims cut-off comfortably',
        'Write structured descriptive answers',
        'Handle banking awareness in interview',
      ],
      eligibility_criteria: ['Graduate in any discipline', 'Age as per IBPS notification', 'Basic computer literacy'],
      duration: '9 months',
      mode: 'hybrid',
      price: 45000,
      discount_percent: 5,
      discount_amount: 2250,
      coupon_code: 'BANKPO26',
      coupon_enabled: true,
      installment_config: [
        { label: 'Joining fee', amount: 5000, due_days: 0 },
        { label: 'Installment 1', amount: 20000, due_days: 30 },
        { label: 'Installment 2', amount: 20000, due_days: 60 },
      ],
      enrollment_validity_days: 270,
      meta_title: 'IBPS PO 2026 Weekday Hybrid Course',
      meta_description: 'IBPS PO weekday hybrid batch with mocks, GA, and interview prep.',
      batches: [
        {
          batch_name: 'Weekday Hybrid — Chennai',
          batch_timing: 'Mon–Fri 10:00 AM – 1:00 PM',
          schedule_days: 'Monday to Friday',
          start_date: '2026-08-01',
          end_date: '2027-04-30',
          enrollment_deadline: '2026-07-15',
          capacity: 50,
          notes: 'Includes 6 center visits for offline full-length mocks.',
          is_active: true,
          display_order: 0,
        },
      ],
      faqs: [
        {
          question: 'Is this suitable for SBI PO as well?',
          answer: 'Yes. Core topics overlap; additional SBI-specific mocks are provided.',
          is_active: true,
        },
        {
          question: 'How are descriptive answers evaluated?',
          answer: 'Faculty reviews submitted essays within 48 hours with line-by-line feedback.',
          is_active: true,
        },
      ],
      faculty: [
        {
          name: 'Suresh Iyer',
          role: 'Quant & DI Faculty',
          bio: 'Former bank PO with 10 years coaching IBPS and SBI aspirants.',
          image_url: IMG.faculty1,
        },
      ],
    },
  },
  {
    key: 'gate',
    shortcut: true,
    main: {
      title: 'GATE & PSU Exams',
      slug: 'sample-gate',
      short_description: 'GATE preparation for engineering graduates targeting PSUs and higher studies.',
      detailed_description: '<p>Discipline-wise GATE programs with test series and PSU interview support.</p>',
      image_url: IMG.gateMain,
      meta_title: 'GATE Coaching Programs',
      meta_description: 'GATE online live coaching for CS, ME, EC, and CE streams.',
    },
    sub: {
      title: 'Online Live — Computer Science',
      slug: 'sample-gate-cs-online',
      short_description: 'GATE CS live program with coding practice and previous-year analysis.',
      detailed_description: '<p>Direct course under sub variant — no sub-sub variant in this track.</p>',
      image_url: IMG.gateSub,
    },
    course: {
      title: 'GATE CS 2026 Online Live Course',
      slug: 'sample-gate-cs-2026',
      short_description: 'Complete GATE Computer Science syllabus with 30+ full-length tests.',
      detailed_description: `<p><strong>GATE CS 2026</strong> covers algorithms, OS, DBMS, CN, and aptitude with live coding sessions.</p>`,
      image_url: IMG.gateCourse,
      brochure_url: IMG.brochure,
      syllabus_pdf_url: IMG.syllabusPdf,
      syllabus_html: '<h3>Core CS</h3><p>Algorithms, DS, OS, DBMS, CN.</p><h3>Aptitude</h3><p>Engineering maths and GA.</p>',
      demo_class_link: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
      highlights: ['Live coding sessions', '30+ GATE mock tests', 'PSU application guidance', 'Peer study groups'],
      features: ['Code judge integration', 'Topic-wise micro quizzes', 'Faculty Telegram support', 'Recorded backups'],
      learning_outcomes: ['Target 60+ GATE score in CS', 'Master standard algorithms for GATE', 'Prepare PSU interview profile'],
      eligibility_criteria: ['B.Tech / BE in CS or related branch', 'Final year or graduate'],
      duration: '10 months',
      mode: 'online',
      price: 55000,
      discount_percent: 12,
      discount_amount: 6600,
      coupon_code: 'GATECS26',
      coupon_enabled: true,
      installment_config: [
        { label: 'Registration', amount: 8000, due_days: 0 },
        { label: 'Balance (2 parts)', amount: 23500, due_days: 45 },
        { label: 'Final', amount: 23500, due_days: 90 },
      ],
      enrollment_validity_days: 300,
      meta_title: 'GATE CS 2026 Online Live Course',
      meta_description: 'GATE Computer Science live coaching with mocks and PSU support.',
      batches: [
        {
          batch_name: 'CS Live — Standard',
          batch_timing: 'Mon–Sat 7:00 PM – 9:00 PM',
          schedule_days: 'Monday to Saturday',
          start_date: '2026-07-01',
          end_date: '2027-02-28',
          enrollment_deadline: '2026-06-20',
          capacity: 100,
          notes: 'Shortcut hierarchy — linked directly under sub variant.',
          is_active: true,
          display_order: 0,
        },
      ],
      faqs: [
        {
          question: 'Which GATE CS branch books are recommended?',
          answer: 'A curated book list is shared on day one; core T.I.M.E. material is included.',
          is_active: true,
        },
      ],
      faculty: [
        {
          name: 'Anita Desai',
          role: 'GATE CS Lead',
          bio: 'M.Tech from IIT Madras, GATE CS top 100 rank holder, 8 years teaching experience.',
          image_url: IMG.faculty2,
        },
      ],
    },
  },
]

async function clearSampleData() {
  const r = await pool.query(`DELETE FROM course_masters WHERE slug LIKE 'sample-%' RETURNING id`)
  console.log(`Cleared ${r.rowCount} existing sample course master row(s).\n`)
}

async function slugExists(slug) {
  const r = await pool.query('SELECT 1 FROM course_masters WHERE slug = $1 LIMIT 1', [slug])
  return r.rows.length > 0
}

async function insertHierarchyNode({ parent_id, level_type, data, display_order = 0 }) {
  const {
    title,
    slug,
    short_description = null,
    detailed_description = null,
    image_url = null,
    meta_title = null,
    meta_description = null,
  } = data

  if (await slugExists(slug)) {
    const existing = await pool.query('SELECT id FROM course_masters WHERE slug = $1', [slug])
    return existing.rows[0].id
  }

  const r = await pool.query(
    `INSERT INTO course_masters (
      parent_id, level_type, title, slug,
      short_description, detailed_description, image_url,
      meta_title, meta_description,
      highlights, features, learning_outcomes, eligibility_criteria,
      display_order, is_active
    ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,'[]','[]','[]','[]',$10,true)
    RETURNING id, title, level_type`,
    [
      parent_id,
      level_type,
      title,
      slug,
      short_description,
      detailed_description,
      image_url,
      meta_title,
      meta_description,
      display_order,
    ]
  )
  const row = r.rows[0]
  console.log(`  + ${row.level_type}: ${row.title} (id ${row.id})`)
  return row.id
}

async function insertFullCourse({ parent_id, data, display_order = 1 }) {
  const c = data
  const r = await pool.query(
    `INSERT INTO course_masters (
      parent_id, level_type, title, slug,
      short_description, detailed_description, image_url,
      brochure_url, syllabus_html, syllabus_pdf_url, demo_class_link,
      highlights, features, learning_outcomes, eligibility_criteria,
      duration, mode, price, discount_percent, discount_amount,
      coupon_code, coupon_enabled, installment_config, enrollment_validity_days,
      meta_title, meta_description, display_order, is_active
    ) VALUES (
      $1,'course',$2,$3,$4,$5,$6,$7,$8,$9,$10,
      $11,$12,$13,$14,$15,$16,$17,$18,$19,$20,$21,$22,$23,$24,$25,$26,true
    )
    ON CONFLICT (slug) DO UPDATE SET
      parent_id = EXCLUDED.parent_id,
      title = EXCLUDED.title,
      short_description = EXCLUDED.short_description,
      detailed_description = EXCLUDED.detailed_description,
      image_url = EXCLUDED.image_url,
      brochure_url = EXCLUDED.brochure_url,
      syllabus_html = EXCLUDED.syllabus_html,
      syllabus_pdf_url = EXCLUDED.syllabus_pdf_url,
      demo_class_link = EXCLUDED.demo_class_link,
      highlights = EXCLUDED.highlights,
      features = EXCLUDED.features,
      learning_outcomes = EXCLUDED.learning_outcomes,
      eligibility_criteria = EXCLUDED.eligibility_criteria,
      duration = EXCLUDED.duration,
      mode = EXCLUDED.mode,
      price = EXCLUDED.price,
      discount_percent = EXCLUDED.discount_percent,
      discount_amount = EXCLUDED.discount_amount,
      coupon_code = EXCLUDED.coupon_code,
      coupon_enabled = EXCLUDED.coupon_enabled,
      installment_config = EXCLUDED.installment_config,
      enrollment_validity_days = EXCLUDED.enrollment_validity_days,
      meta_title = EXCLUDED.meta_title,
      meta_description = EXCLUDED.meta_description,
      display_order = EXCLUDED.display_order,
      updated_at = CURRENT_TIMESTAMP
    RETURNING id, title`,
    [
      parent_id,
      c.title,
      c.slug,
      c.short_description,
      c.detailed_description,
      c.image_url,
      c.brochure_url,
      c.syllabus_html,
      c.syllabus_pdf_url,
      c.demo_class_link,
      JSON.stringify(c.highlights),
      JSON.stringify(c.features),
      JSON.stringify(c.learning_outcomes),
      JSON.stringify(c.eligibility_criteria),
      c.duration,
      c.mode,
      c.price,
      c.discount_percent,
      c.discount_amount,
      c.coupon_code,
      c.coupon_enabled,
      JSON.stringify(c.installment_config),
      c.enrollment_validity_days,
      c.meta_title,
      c.meta_description,
      display_order,
    ]
  )

  const courseId = r.rows[0].id
  console.log(`  + course: ${r.rows[0].title} (id ${courseId}) — full detail`)

  await pool.query('DELETE FROM course_master_batches WHERE course_master_id = $1', [courseId])
  for (let i = 0; i < c.batches.length; i++) {
    const b = c.batches[i]
    await pool.query(
      `INSERT INTO course_master_batches (
        course_master_id, batch_name, batch_timing, schedule_days,
        start_date, end_date, enrollment_deadline, capacity, notes,
        is_active, display_order
      ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)`,
      [
        courseId,
        b.batch_name,
        b.batch_timing,
        b.schedule_days,
        b.start_date,
        b.end_date,
        b.enrollment_deadline,
        b.capacity,
        b.notes,
        b.is_active !== false,
        b.display_order ?? i,
      ]
    )
  }
  console.log(`    · ${c.batches.length} batch(es)`)

  await pool.query('DELETE FROM course_master_faqs WHERE course_master_id = $1', [courseId])
  for (let i = 0; i < c.faqs.length; i++) {
    const f = c.faqs[i]
    await pool.query(
      `INSERT INTO course_master_faqs (course_master_id, question, answer, display_order, is_active)
       VALUES ($1,$2,$3,$4,$5)`,
      [courseId, f.question, f.answer, i, f.is_active !== false]
    )
  }
  console.log(`    · ${c.faqs.length} FAQ(s)`)

  await pool.query('DELETE FROM course_master_faculty WHERE course_master_id = $1', [courseId])
  for (let i = 0; i < c.faculty.length; i++) {
    const f = c.faculty[i]
    await pool.query(
      `INSERT INTO course_master_faculty (course_master_id, name, role, bio, image_url, display_order)
       VALUES ($1,$2,$3,$4,$5,$6)`,
      [courseId, f.name, f.role, f.bio, f.image_url, i]
    )
  }
  console.log(`    · ${c.faculty.length} faculty member(s) with photos`)

  return courseId
}

async function seed() {
  if (!process.env.DATABASE_URL) {
    console.error('DATABASE_URL is not set')
    process.exit(1)
  }

  console.log('Seeding full course master sample data (all fields + images)...\n')
  await clearSampleData()

  for (let i = 0; i < TRACKS.length; i++) {
    const track = TRACKS[i]
    console.log(`Track ${i + 1}: ${track.main.title}`)

    const mainId = await insertHierarchyNode({
      parent_id: null,
      level_type: 'main_course',
      data: track.main,
      display_order: i + 1,
    })

    const subId = await insertHierarchyNode({
      parent_id: mainId,
      level_type: 'sub_variant',
      data: track.sub,
      display_order: 1,
    })

    let courseParentId = subId

    if (!track.shortcut && track.subSub) {
      const subSubId = await insertHierarchyNode({
        parent_id: subId,
        level_type: 'sub_sub_variant',
        data: track.subSub,
        display_order: 1,
      })
      courseParentId = subSubId
    }

    await insertFullCourse({
      parent_id: courseParentId,
      data: track.course,
      display_order: 1,
    })

    console.log('')
  }

  const counts = await pool.query(`
    SELECT level_type, COUNT(*)::int AS c
    FROM course_masters
    WHERE slug LIKE 'sample-%'
    GROUP BY level_type
    ORDER BY level_type
  `)
  const related = await pool.query(`
    SELECT
      (SELECT COUNT(*)::int FROM course_master_batches b
         JOIN course_masters c ON c.id = b.course_master_id WHERE c.slug LIKE 'sample-%') AS batches,
      (SELECT COUNT(*)::int FROM course_master_faqs f
         JOIN course_masters c ON c.id = f.course_master_id WHERE c.slug LIKE 'sample-%') AS faqs,
      (SELECT COUNT(*)::int FROM course_master_faculty fac
         JOIN course_masters c ON c.id = fac.course_master_id WHERE c.slug LIKE 'sample-%') AS faculty
  `)

  console.log('Sample records by level:')
  for (const row of counts.rows) {
    console.log(`  ${row.level_type}: ${row.c}`)
  }
  console.log('\nRelated records on course level:')
  console.log(`  batches: ${related.rows[0].batches}`)
  console.log(`  faqs: ${related.rows[0].faqs}`)
  console.log(`  faculty: ${related.rows[0].faculty}`)
  console.log('\n✅ Done — 4 tracks seeded with images, batches, FAQs, and faculty.')
}

seed()
  .catch((e) => {
    console.error('Seed failed:', e)
    process.exit(1)
  })
  .finally(() => pool.end())
