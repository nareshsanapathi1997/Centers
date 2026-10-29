/**
 * Seed free demo Quizzes & Exams for active centers.
 * Idempotent: upserts by exact title (prefix [Demo]).
 *
 * Usage: npm run db:seed:demo-assessments
 */
require('dotenv').config()
const { Pool } = require('pg')

const pool = new Pool({ connectionString: process.env.DATABASE_URL })

const DEMO_PREFIX = '[Demo]'

const TITLES = {
  practice: `${DEMO_PREFIX} Free Practice Quiz — Quant Basics`,
  mock: `${DEMO_PREFIX} Free Timed Mock — CAT Lite`,
  live: `${DEMO_PREFIX} Free Live Exam — Bank Reasoning`,
}

function opts(items) {
  return JSON.stringify(
    items.map(([id, text]) => ({ id, text }))
  )
}

async function pickCourseMasterId(client, centerId) {
  const fee = await client.query(
    `SELECT course_master_id
     FROM course_center_fees
     WHERE center_id = $1
     ORDER BY course_master_id
     LIMIT 1`,
    [centerId]
  )
  if (fee.rows[0]) return fee.rows[0].course_master_id

  const leaf = await client.query(
    `SELECT id FROM course_masters
     WHERE is_active = true AND level_type IN ('course', 'leaf_course')
     ORDER BY
       CASE
         WHEN title ILIKE '%CAT%' THEN 0
         WHEN title ILIKE '%Bank%' OR title ILIKE '%IBPS%' THEN 1
         ELSE 2
       END,
       id
     LIMIT 1`
  )
  if (leaf.rows[0]) return leaf.rows[0].id

  const any = await client.query(
    `SELECT id FROM course_masters WHERE is_active = true ORDER BY id LIMIT 1`
  )
  return any.rows[0]?.id ?? null
}

async function upsertAssessment(client, { centerId, courseMasterId, def }) {
  const existing = await client.query(
    `SELECT id FROM assessments WHERE center_id = $1 AND title = $2 LIMIT 1`,
    [centerId, def.title]
  )

  let assessmentId
  if (existing.rows[0]) {
    assessmentId = existing.rows[0].id
    await client.query(
      `UPDATE assessments SET
         course_master_id = $1,
         mode = $2,
         description = $3,
         directions = $4,
         duration_minutes = $5,
         max_attempts = $6,
         starts_at = $7,
         ends_at = $8,
         shuffle_questions = $9,
         shuffle_options = $10,
         show_results = $11,
         is_published = true,
         is_free = true,
         marks_correct = $12,
         marks_incorrect = $13,
         updated_at = CURRENT_TIMESTAMP
       WHERE id = $14`,
      [
        courseMasterId,
        def.mode,
        def.description,
        def.directions,
        def.durationMinutes,
        def.maxAttempts,
        def.startsAt,
        def.endsAt,
        def.shuffleQuestions,
        def.shuffleOptions,
        def.showResults,
        def.marksCorrect,
        def.marksIncorrect,
        assessmentId,
      ]
    )
    // Replace nested content for a clean re-seed
    await client.query(`DELETE FROM assessment_questions WHERE assessment_id = $1`, [assessmentId])
    await client.query(`DELETE FROM assessment_passages WHERE assessment_id = $1`, [assessmentId])
    await client.query(`DELETE FROM assessment_sections WHERE assessment_id = $1`, [assessmentId])
  } else {
    const inserted = await client.query(
      `INSERT INTO assessments (
         center_id, course_master_id, mode, title, description, directions,
         duration_minutes, max_attempts, starts_at, ends_at,
         shuffle_questions, shuffle_options, show_results,
         is_published, is_free, marks_correct, marks_incorrect
       ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,true,true,$14,$15)
       RETURNING id`,
      [
        centerId,
        courseMasterId,
        def.mode,
        def.title,
        def.description,
        def.directions,
        def.durationMinutes,
        def.maxAttempts,
        def.startsAt,
        def.endsAt,
        def.shuffleQuestions,
        def.shuffleOptions,
        def.showResults,
        def.marksCorrect,
        def.marksIncorrect,
      ]
    )
    assessmentId = inserted.rows[0].id
  }

  const sectionIds = {}
  for (const section of def.sections || []) {
    const s = await client.query(
      `INSERT INTO assessment_sections (assessment_id, title, directions, sort_order, duration_minutes)
       VALUES ($1,$2,$3,$4,$5) RETURNING id`,
      [assessmentId, section.title, section.directions || null, section.sortOrder ?? 0, section.durationMinutes ?? null]
    )
    sectionIds[section.key] = s.rows[0].id
  }

  const passageIds = {}
  for (const passage of def.passages || []) {
    const p = await client.query(
      `INSERT INTO assessment_passages (
         assessment_id, section_id, title, content, media_urls, sort_order
       ) VALUES ($1,$2,$3,$4,'[]'::jsonb,$5) RETURNING id`,
      [
        assessmentId,
        passage.sectionKey ? sectionIds[passage.sectionKey] ?? null : null,
        passage.title || null,
        passage.content,
        passage.sortOrder ?? 0,
      ]
    )
    passageIds[passage.key] = p.rows[0].id
  }

  for (const q of def.questions || []) {
    await client.query(
      `INSERT INTO assessment_questions (
         assessment_id, section_id, passage_id, question_type, prompt, options,
         correct_option_id, correct_option_ids, correct_numeric, media_urls,
         marks, explanation, sort_order
       ) VALUES (
         $1,$2,$3,$4,$5,$6::jsonb,$7,$8::jsonb,$9,'[]'::jsonb,$10,$11,$12
       )`,
      [
        assessmentId,
        q.sectionKey ? sectionIds[q.sectionKey] ?? null : null,
        q.passageKey ? passageIds[q.passageKey] ?? null : null,
        q.questionType || 'single_choice',
        q.prompt,
        q.optionsJson || '[]',
        q.correctOptionId ?? null,
        q.correctOptionIds ? JSON.stringify(q.correctOptionIds) : null,
        q.correctNumeric ?? null,
        q.marks ?? null,
        q.explanation || null,
        q.sortOrder ?? 0,
      ]
    )
  }

  return { assessmentId, title: def.title, created: !existing.rows[0] }
}

function buildDefs() {
  const now = new Date()
  const startsAt = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
  const endsAt = new Date(now.getTime() + 90 * 24 * 60 * 60 * 1000)

  return [
    {
      title: TITLES.practice,
      mode: 'practice',
      description: 'Easy warm-up MCQs for registered students — no payment required.',
      directions:
        '<p>Answer all questions. There is <strong>no negative marking</strong> in this practice quiz.</p>',
      durationMinutes: 15,
      maxAttempts: 5,
      startsAt: null,
      endsAt: null,
      shuffleQuestions: false,
      shuffleOptions: false,
      showResults: 'immediate',
      marksCorrect: 1,
      marksIncorrect: 0,
      sections: [
        {
          key: 'quant',
          title: 'Quantitative Aptitude',
          directions: '<p>Choose the best option for each question.</p>',
          sortOrder: 0,
        },
      ],
      questions: [
        {
          sectionKey: 'quant',
          sortOrder: 0,
          prompt: 'What is $25\\%$ of $80$?',
          optionsJson: opts([
            ['A', '15'],
            ['B', '20'],
            ['C', '25'],
            ['D', '30'],
          ]),
          correctOptionId: 'B',
          explanation: '<p>$25\\%$ of $80 = \\frac{25}{100}\\times 80 = 20$.</p>',
        },
        {
          sectionKey: 'quant',
          sortOrder: 1,
          prompt: 'If the ratio of boys to girls in a class is $3:2$ and there are $30$ boys, how many girls are there?',
          optionsJson: opts([
            ['A', '15'],
            ['B', '18'],
            ['C', '20'],
            ['D', '25'],
          ]),
          correctOptionId: 'C',
          explanation: '<p>Boys : girls $= 3:2$. Girls $= 30 \\times \\frac{2}{3} = 20$.</p>',
        },
        {
          sectionKey: 'quant',
          sortOrder: 2,
          prompt: 'A train covers $120$ km in $2$ hours. What is its average speed?',
          optionsJson: opts([
            ['A', '40 km/h'],
            ['B', '50 km/h'],
            ['C', '60 km/h'],
            ['D', '80 km/h'],
          ]),
          correctOptionId: 'C',
        },
        {
          sectionKey: 'quant',
          sortOrder: 3,
          questionType: 'true_false',
          prompt: 'The HCF of two co-prime numbers is always $1$.',
          optionsJson: opts([
            ['A', 'True'],
            ['B', 'False'],
          ]),
          correctOptionId: 'A',
        },
      ],
    },
    {
      title: TITLES.mock,
      mode: 'mock',
      description: 'Timed sectional mock with a KaTeX math question — free for all registered students.',
      directions:
        '<p>This is a <strong>timed mock</strong>. Manage your time across sections. Negative marking applies ($-0.25$).</p>',
      durationMinutes: 30,
      maxAttempts: 2,
      startsAt: null,
      endsAt: null,
      shuffleQuestions: true,
      shuffleOptions: true,
      showResults: 'immediate',
      marksCorrect: 1,
      marksIncorrect: -0.25,
      sections: [
        {
          key: 'qa',
          title: 'Quant',
          directions: '<p>Use rough work. Enter exact answers where asked.</p>',
          sortOrder: 0,
          durationMinutes: 15,
        },
        {
          key: 'vr',
          title: 'Verbal',
          directions: '<p>Pick the option that best completes the sentence or answers the question.</p>',
          sortOrder: 1,
          durationMinutes: 15,
        },
      ],
      questions: [
        {
          sectionKey: 'qa',
          sortOrder: 0,
          prompt:
            'Solve: If $x^2 - 5x + 6 = 0$, what is the sum of the roots?',
          optionsJson: opts([
            ['A', '2'],
            ['B', '5'],
            ['C', '6'],
            ['D', '-5'],
          ]),
          correctOptionId: 'B',
          explanation: '<p>For $ax^2+bx+c=0$, sum of roots $= -b/a = 5$.</p>',
        },
        {
          sectionKey: 'qa',
          sortOrder: 1,
          questionType: 'numeric',
          prompt: 'Evaluate $\\dfrac{3}{4} + \\dfrac{5}{8}$. Enter the answer as a decimal (e.g. 1.375).',
          optionsJson: '[]',
          correctNumeric: 1.375,
          explanation: '<p>$\\frac{3}{4}+\\frac{5}{8}=\\frac{6}{8}+\\frac{5}{8}=\\frac{11}{8}=1.375$.</p>',
        },
        {
          sectionKey: 'vr',
          sortOrder: 2,
          prompt: 'Choose the word closest in meaning to <em>meticulous</em>.',
          optionsJson: opts([
            ['A', 'Careless'],
            ['B', 'Careful'],
            ['C', 'Casual'],
            ['D', 'Hasty'],
          ]),
          correctOptionId: 'B',
        },
        {
          sectionKey: 'vr',
          sortOrder: 3,
          prompt: 'Fill in the blank: The committee will _____ the proposal next week.',
          optionsJson: opts([
            ['A', 'consider'],
            ['B', 'considers'],
            ['C', 'considering'],
            ['D', 'considered'],
          ]),
          correctOptionId: 'A',
        },
      ],
    },
    {
      title: TITLES.live,
      mode: 'live',
      description: 'Open live-style exam window with a reading passage — free access for registered students.',
      directions:
        '<p>Live exam rules: do not switch tabs unnecessarily. Results are shown after you submit.</p>',
      durationMinutes: 45,
      maxAttempts: 1,
      startsAt: startsAt.toISOString(),
      endsAt: endsAt.toISOString(),
      shuffleQuestions: false,
      shuffleOptions: true,
      showResults: 'immediate',
      marksCorrect: 1,
      marksIncorrect: -0.25,
      sections: [
        {
          key: 'rc',
          title: 'Reading Comprehension',
          directions:
            '<p>Read the passage carefully. Answer the questions that follow based only on the passage.</p>',
          sortOrder: 0,
        },
        {
          key: 'lr',
          title: 'Logical Reasoning',
          directions: '<p>Each question has one correct option unless stated otherwise.</p>',
          sortOrder: 1,
        },
      ],
      passages: [
        {
          key: 'pass1',
          sectionKey: 'rc',
          title: 'Financial literacy among first-time investors',
          sortOrder: 0,
          content: `<p>In recent years, more young adults have begun investing in mutual funds and equity markets. While mobile apps have lowered the barrier to entry, many newcomers still struggle with basic concepts such as risk diversification, expense ratios, and the difference between short-term speculation and long-term investing.</p>
<p>Experts argue that financial literacy should start early, preferably in school curricula, so that citizens can evaluate products without relying solely on social-media tips. Centers that prepare students for bank and MBA exams often include modules on data interpretation drawn from economic reports — skills that transfer well to personal finance decisions.</p>
<p>Ultimately, disciplined saving and a clear understanding of goals matter more than chasing the latest market trend.</p>`,
        },
      ],
      questions: [
        {
          sectionKey: 'rc',
          passageKey: 'pass1',
          sortOrder: 0,
          prompt: 'According to the passage, what has lowered the barrier to entry for young investors?',
          optionsJson: opts([
            ['A', 'School curricula'],
            ['B', 'Mobile apps'],
            ['C', 'Social-media tips'],
            ['D', 'Expense ratios'],
          ]),
          correctOptionId: 'B',
        },
        {
          sectionKey: 'rc',
          passageKey: 'pass1',
          sortOrder: 1,
          prompt: 'What do experts recommend should start early?',
          optionsJson: opts([
            ['A', 'Short-term speculation'],
            ['B', 'Chasing market trends'],
            ['C', 'Financial literacy'],
            ['D', 'Only MBA exam prep'],
          ]),
          correctOptionId: 'C',
        },
        {
          sectionKey: 'lr',
          sortOrder: 2,
          prompt: 'All roses are flowers. Some flowers fade quickly. Which conclusion follows?',
          optionsJson: opts([
            ['A', 'All roses fade quickly'],
            ['B', 'Some roses may fade quickly'],
            ['C', 'No rose fades quickly'],
            ['D', 'All flowers are roses'],
          ]),
          correctOptionId: 'B',
        },
        {
          sectionKey: 'lr',
          sortOrder: 3,
          questionType: 'multiple_choice',
          prompt: 'Which of the following are even prime numbers? (Select all that apply — there may be only one.)',
          optionsJson: opts([
            ['A', '2'],
            ['B', '3'],
            ['C', '4'],
            ['D', '5'],
          ]),
          correctOptionIds: ['A'],
          correctOptionId: null,
        },
      ],
    },
  ]
}

async function main() {
  if (!process.env.DATABASE_URL) {
    console.error('DATABASE_URL is not set')
    process.exit(1)
  }

  const client = await pool.connect()
  try {
    // Ensure column exists (safe if migration already ran)
    await client.query(`
      ALTER TABLE assessments
        ADD COLUMN IF NOT EXISTS is_free BOOLEAN NOT NULL DEFAULT false
    `)

    const centers = await client.query(
      `SELECT id, slug, name FROM centers
       WHERE COALESCE(is_active, true) = true
       ORDER BY id`
    )
    if (centers.rows.length === 0) {
      console.log('No active centers found — nothing to seed.')
      return
    }

    const defs = buildDefs()
    const summary = []

    for (const center of centers.rows) {
      const courseMasterId = await pickCourseMasterId(client, center.id)
      if (!courseMasterId) {
        console.warn(`Skipping center ${center.slug}: no course_masters available`)
        continue
      }

      await client.query('BEGIN')
      try {
        const results = []
        for (const def of defs) {
          const r = await upsertAssessment(client, {
            centerId: center.id,
            courseMasterId,
            def,
          })
          results.push(r)
        }
        await client.query('COMMIT')
        summary.push({
          centerId: center.id,
          slug: center.slug,
          name: center.name,
          courseMasterId,
          assessments: results,
        })
        console.log(
          `✅ ${center.name} (${center.slug}): ${results.length} demo assessments (course_master_id=${courseMasterId})`
        )
        for (const r of results) {
          console.log(`   ${r.created ? 'created' : 'updated'} #${r.assessmentId} — ${r.title}`)
        }
      } catch (err) {
        await client.query('ROLLBACK')
        throw err
      }
    }

    const total = summary.reduce((n, s) => n + s.assessments.length, 0)
    console.log(`\nDone. ${total} assessments across ${summary.length} center(s).`)
    console.log('Titles:', Object.values(TITLES).join(' | '))
  } finally {
    client.release()
    await pool.end()
  }
}

main().catch((err) => {
  console.error('Seed failed:', err)
  process.exit(1)
})
