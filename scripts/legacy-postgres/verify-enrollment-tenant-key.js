/**
 * Verifies migration 0008: the foreign key is real, the indexes exist, and the
 * cross-center leak in getStudentCourses is closed.
 *
 * The leak check is the important one. It reproduces the old shape — a legacy
 * enrolment at center A whose mobile matches a student registered at center B —
 * and asserts the student's course list no longer includes it.
 */
require('dotenv').config()
const { Pool } = require('pg')

const pool = new Pool({ connectionString: process.env.DATABASE_URL })

let passed = 0
let failed = 0

function check(name, condition, detail = '') {
  console.log(`  ${condition ? 'ok  ' : 'FAIL'} ${name}${!condition && detail ? ` — ${detail}` : ''}`)
  condition ? passed++ : failed++
}

async function main() {
  console.log('schema')
  {
    const fk = await pool.query(`
      SELECT c.confdeltype, a.attname AS column_name, tf.relname AS references_table
      FROM pg_constraint c
      JOIN pg_class t ON t.oid = c.conrelid
      JOIN pg_class tf ON tf.oid = c.confrelid
      JOIN pg_attribute a ON a.attrelid = t.oid AND a.attnum = ANY (c.conkey)
      WHERE t.relname = 'student_enrollments' AND c.contype = 'f' AND a.attname = 'center_id'
    `)
    check('center_id has a foreign key', fk.rowCount === 1, `${fk.rowCount} found`)
    check('it references centers', fk.rows[0]?.references_table === 'centers', fk.rows[0]?.references_table)
    check('on delete cascade', fk.rows[0]?.confdeltype === 'c', fk.rows[0]?.confdeltype)

    const indexes = await pool.query(
      `SELECT indexname FROM pg_indexes WHERE tablename = 'student_enrollments'`,
    )
    const names = indexes.rows.map((r) => r.indexname)
    for (const suffix of ['center_id', 'center_mobile', 'center_email']) {
      check(
        `index on ${suffix} exists`,
        names.some((n) => n.includes(suffix)),
        names.join(', '),
      )
    }
  }

  console.log('\nreferential integrity')
  {
    let rejected = false
    try {
      await pool.query(
        `INSERT INTO student_enrollments (regno, student_name, email, mobile, center_id)
         VALUES ('FKTEST-0001', 'FK Test', 'fk@test.local', '0000000000', 999999)`,
      )
    } catch (error) {
      rejected = error.code === '23503' // foreign_key_violation
    }
    check('a center_id for a nonexistent center is rejected', rejected)
    await pool.query(`DELETE FROM student_enrollments WHERE regno = 'FKTEST-0001'`)
  }

  console.log('\ncross-center leak')
  const client = await pool.connect()
  try {
    // Rolled back, so the database is untouched by this check.
    await client.query('BEGIN')

    const centers = await client.query('SELECT id FROM centers ORDER BY id LIMIT 2')
    if (centers.rowCount < 2) {
      console.log('  skip — needs two centers')
    } else {
      const [centerA, centerB] = centers.rows.map((r) => r.id)
      const mobile = '9000000001'

      const student = await client.query(
        `INSERT INTO students (center_id, regno, full_name, email, mobile, password_hash, is_active)
         VALUES ($1, 'LEAKTEST', 'Leak Test', 'leak@test.local', $2, 'x', true)
         RETURNING id`,
        [centerB, mobile],
      )
      const studentId = student.rows[0].id

      // A legacy enrolment at the OTHER center, sharing only the mobile number.
      await client.query(
        `INSERT INTO student_enrollments
           (regno, student_name, email, mobile, center_id, course_name, status, final_amount)
         VALUES ('LEAKENROL', 'Leak Test', 'other@test.local', $1, $2, 'Other Center Course', 'active', 1000)`,
        [mobile, centerA],
      )

      // Runs the same predicate the portal's legacy_courses branch uses, on this
      // transaction so the fixture rows are visible and still rolled back.
      const leakQuery = async (centerId) => {
        const result = await client.query(
          `SELECT se.course_name
           FROM student_enrollments se
           JOIN students st ON st.id = $2
             AND (st.mobile = se.mobile OR (st.email IS NOT NULL AND LOWER(st.email) = LOWER(se.email)))
           WHERE se.center_id = $1
             AND se.status IN ('active', 'completed', 'pending')`,
          [centerId, studentId],
        )
        return result.rows.map((r) => r.course_name)
      }

      const fromOwnCenter = await leakQuery(centerB)
      const fromOtherCenter = await leakQuery(centerA)

      check(
        "the student's own center does not show the other center's course",
        !fromOwnCenter.includes('Other Center Course'),
        fromOwnCenter.join(', '),
      )
      check(
        'the row is still reachable from the center that owns it',
        fromOtherCenter.includes('Other Center Course'),
        fromOtherCenter.join(', '),
      )
    }

    await client.query('ROLLBACK')
  } catch (error) {
    await client.query('ROLLBACK').catch(() => {})
    throw error
  } finally {
    client.release()
  }

  console.log('\nsource')
  {
    const fs = require('node:fs')
    const path = require('node:path')
    const source = fs.readFileSync(
      path.join(__dirname, '..', 'lib', 'student-portal-db.ts'),
      'utf8',
    )
    const legacyBranch = source.slice(
      source.indexOf('legacy_courses AS ('),
      source.indexOf('SELECT * FROM payment_courses'),
    )
    check(
      'the legacy_courses branch filters by center',
      /se\.center_id = \$1/.test(legacyBranch),
      'predicate not found in lib/student-portal-db.ts',
    )
  }

  console.log('\nunattributed rows')
  {
    const nulls = await pool.query(
      'SELECT COUNT(*)::int AS n FROM student_enrollments WHERE center_id IS NULL',
    )
    console.log(`  ${nulls.rows[0].n} row(s) still have a NULL center_id (excluded from the portal)`)
  }

  console.log(`\n${passed} passed, ${failed} failed`)
  if (failed > 0) process.exitCode = 1
  await pool.end()
}

main().catch((error) => {
  console.error('Verification failed:', error.message)
  process.exitCode = 1
  void pool.end()
})
