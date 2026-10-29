/**
 * Gives student_enrollments a real tenant key.
 *
 * The table scoped to a center by `center_name`, a free-text VARCHAR with no
 * foreign key. Three consequences, in order of severity:
 *
 *   1. No query could filter it reliably, and `getStudentCourses` in
 *      lib/student-portal-db.ts did not filter by center at all — it matched
 *      legacy enrolments on mobile/email alone, so a student could see courses
 *      belonging to a different center.
 *   2. Renaming a center silently orphaned its enrolment history.
 *   3. Nothing stopped a typo or a name for a center that never existed.
 *
 * `center_name` is kept rather than dropped: it is the only record of what was
 * originally entered, and rows that cannot be matched need it for manual
 * assignment. Treat it as historical from here on.
 *
 * ON DELETE CASCADE matches every other center_id in the schema. Note that
 * student_installments already cascades from enrollment_id, so deleting a center
 * removes its enrolments and their instalment schedules.
 */
exports.up = async function up(client) {
  await client.query(`
    ALTER TABLE student_enrollments
    ADD COLUMN IF NOT EXISTS center_id INTEGER REFERENCES centers(id) ON DELETE CASCADE
  `)

  // Case- and whitespace-insensitive, because these names were hand-entered.
  // Only applied where exactly one center matches, so an ambiguous name is left
  // for a human rather than guessed at.
  const backfill = await client.query(`
    WITH candidate AS (
      SELECT se.id AS enrollment_id,
             MIN(c.id) AS center_id,
             COUNT(DISTINCT c.id) AS match_count
      FROM student_enrollments se
      JOIN centers c
        ON LOWER(TRIM(c.name)) = LOWER(TRIM(se.center_name))
        OR LOWER(TRIM(c.slug)) = LOWER(TRIM(se.center_name))
      WHERE se.center_id IS NULL
        AND se.center_name IS NOT NULL
      GROUP BY se.id
    )
    UPDATE student_enrollments se
    SET center_id = candidate.center_id
    FROM candidate
    WHERE se.id = candidate.enrollment_id
      AND candidate.match_count = 1
    RETURNING se.id, se.center_name, se.center_id
  `)

  for (const row of backfill.rows) {
    console.log(`\n    matched "${row.center_name}" -> center ${row.center_id} (row ${row.id})`)
  }

  const unmatched = await client.query(`
    SELECT COALESCE(center_name, '(null)') AS center_name, COUNT(*)::int AS rows
    FROM student_enrollments
    WHERE center_id IS NULL
    GROUP BY center_name
    ORDER BY rows DESC
  `)

  if (unmatched.rowCount > 0) {
    const total = unmatched.rows.reduce((sum, row) => sum + row.rows, 0)
    console.warn(
      `\n    WARNING: ${total} enrolment(s) have no matching center and keep center_id NULL:`,
    )
    for (const row of unmatched.rows) {
      console.warn(`      "${row.center_name}" — ${row.rows} row(s)`)
    }
    console.warn(
      '      The student portal now excludes rows with a NULL center_id rather than',
    )
    console.warn(
      '      showing them to every center. Assign a center_id to restore them.',
    )
  }

  // The tenant filter this column exists to enable.
  await client.query(`
    CREATE INDEX IF NOT EXISTS idx_student_enrollments_center_id
      ON student_enrollments (center_id)
  `)

  // getStudentCourses matches legacy rows on mobile or email within a center.
  await client.query(`
    CREATE INDEX IF NOT EXISTS idx_student_enrollments_center_mobile
      ON student_enrollments (center_id, mobile)
  `)
  await client.query(`
    CREATE INDEX IF NOT EXISTS idx_student_enrollments_center_email
      ON student_enrollments (center_id, LOWER(email))
  `)
}
