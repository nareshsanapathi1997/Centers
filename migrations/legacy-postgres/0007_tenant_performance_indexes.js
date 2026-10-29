/**
 * Indexes for query shapes the app actually runs. Deliberately narrow: an index
 * on every boolean or created_at column would slow every write down for no read
 * benefit, so this covers tenant filters, foreign keys used in joins, and the
 * lookup columns on the payment/enrolment path.
 *
 * Declarative, and each entry is skipped when the table or a column is absent —
 * schemas differ between environments because the pre-runner migration scripts
 * were applied ad hoc.
 */
const INDEXES = [
  // Tenant scoping — these tables are read on every page render of a center
  // site and had no index beyond the primary key.
  { table: 'alerts', columns: ['center_id', 'is_active'] },
  { table: 'cta_sliders', columns: ['center_id', 'is_active'] },
  { table: 'custom_sections', columns: ['center_id', 'is_active'] },
  { table: 'vacancies', columns: ['center_id', 'is_active'] },
  { table: 'header_menu_items', columns: ['center_id'] },
  { table: 'header_menu_items', columns: ['parent_id'] },
  { table: 'footer_menu_items', columns: ['center_id'] },
  { table: 'content_versions', columns: ['center_id'] },
  { table: 'image_library', columns: ['center_id'] },

  // Admin inbox: filtered by center, ordered newest first.
  { table: 'contact_submissions', columns: ['center_id', 'created_at DESC'] },

  // Enrolments are looked up by center, by course, and by the student's own
  // mobile/email during checkout.
  { table: 'student_enrollments', columns: ['center_id'] },
  { table: 'student_enrollments', columns: ['course_id'] },
  { table: 'student_enrollments', columns: ['status'] },
  { table: 'student_enrollments', columns: ['mobile'] },
  { table: 'student_enrollments', columns: ['email'] },

  // Installment schedule joins back to its enrolment on every payment view.
  { table: 'student_installments', columns: ['enrollment_id'] },
  { table: 'student_installments', columns: ['status'] },
  { table: 'student_payment_installments', columns: ['payment_id'] },

  // Payment gateway callbacks look the row up by the gateway's own order id;
  // partial because most rows are offline payments with no order id.
  {
    table: 'student_fee_payments',
    columns: ['gateway_order_id'],
    where: 'gateway_order_id IS NOT NULL',
  },
  { table: 'student_custom_discounts', columns: ['course_id'] },

  // Audit trail is queried per entity from the activity log screens.
  { table: 'activity_logs', columns: ['entity_type', 'entity_id'] },

  // Study materials list for a student's course.
  { table: 'student_course_materials', columns: ['center_id', 'course_master_id', 'is_active'] },

  // Batch center fees are joined by course, not only by batch.
  { table: 'course_batch_center_fees', columns: ['course_master_id'] },
  { table: 'course_center_assignments', columns: ['center_id', 'status'] },

  // RBAC lookups walk from role to its members.
  { table: 'super_admin_user_roles', columns: ['role_id'] },
  { table: 'admin_roles', columns: ['role_id'] },
  { table: 'role_permissions', columns: ['permission_id'] },

  // Login lockout and OTP checks.
  { table: 'student_otp_codes', columns: ['center_id', 'mobile'] },
  { table: 'students', columns: ['center_id', 'is_active'] },
  { table: 'center_admins', columns: ['center_id', 'is_active'] },
]

function indexName(table, columns, where) {
  const cols = columns.map((c) => c.split(' ')[0]).join('_')
  return `idx_${table}_${cols}${where ? '_partial' : ''}`.slice(0, 63)
}

async function tableExists(client, table) {
  const result = await client.query(
    `SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = $1`,
    [table],
  )
  return result.rowCount > 0
}

async function missingColumns(client, table, columns) {
  const bare = columns.map((c) => c.split(' ')[0])
  const result = await client.query(
    `SELECT column_name FROM information_schema.columns
     WHERE table_schema = 'public' AND table_name = $1 AND column_name = ANY($2::text[])`,
    [table, bare],
  )
  const found = new Set(result.rows.map((r) => r.column_name))
  return bare.filter((c) => !found.has(c))
}

exports.up = async function up(client) {
  let created = 0
  const skipped = []

  for (const { table, columns, where } of INDEXES) {
    if (!(await tableExists(client, table))) {
      skipped.push(`${table} (no such table)`)
      continue
    }

    const missing = await missingColumns(client, table, columns)
    if (missing.length) {
      skipped.push(`${table}.${missing.join('/')} (no such column)`)
      continue
    }

    await client.query(
      `CREATE INDEX IF NOT EXISTS ${indexName(table, columns, where)} ON ${table} (${columns.join(
        ', ',
      )})${where ? ` WHERE ${where}` : ''}`,
    )
    created++
  }

  // Keep the planner's statistics current so it actually uses the new indexes.
  await client.query('ANALYZE')

  console.log(`\n    ${created} index(es) ensured, ${skipped.length} skipped`)
  for (const note of skipped) console.log(`      skip ${note}`)
}
