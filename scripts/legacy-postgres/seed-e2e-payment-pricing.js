require('dotenv').config()
const { Pool } = require('pg')
const pool = new Pool({ connectionString: process.env.DATABASE_URL })

const CENTER_ID = 1
const COURSE_MASTER_ID = 69 // GATE CS 2026 - no batches
const FEE = {
  total_amount: 45000,
  discount_amount: 5000,
  registration_fee: 1000,
  num_installments: 1,
  installment_1_amount: 35000,
  installment_2_amount: null,
}

async function main() {
  const center = await pool.query('SELECT id, slug, name FROM centers WHERE id = $1', [CENTER_ID])
  const course = await pool.query('SELECT id, slug, title FROM course_masters WHERE id = $1', [COURSE_MASTER_ID])
  if (!center.rows[0] || !course.rows[0]) throw new Error('Center or course not found')

  await pool.query(
    `INSERT INTO course_base_fees (
       course_master_id, total_amount, discount_amount, registration_fee,
       num_installments, installment_1_amount, installment_2_amount,
       installment_due_rules, offer_enabled, payment_rules, is_active
     ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,true,$9,true)
     ON CONFLICT (course_master_id) DO UPDATE SET
       total_amount = EXCLUDED.total_amount,
       discount_amount = EXCLUDED.discount_amount,
       registration_fee = EXCLUDED.registration_fee,
       num_installments = EXCLUDED.num_installments,
       installment_1_amount = EXCLUDED.installment_1_amount,
       installment_2_amount = EXCLUDED.installment_2_amount,
       payment_rules = EXCLUDED.payment_rules,
       updated_at = NOW()`,
    [
      COURSE_MASTER_ID,
      FEE.total_amount,
      FEE.discount_amount,
      FEE.registration_fee,
      FEE.num_installments,
      FEE.installment_1_amount,
      FEE.installment_2_amount,
      JSON.stringify([{ installment_no: 1, due_days: 0 }]),
      JSON.stringify({ gst_rate: 18 }),
    ]
  )

  await pool.query(
    `INSERT INTO course_center_fees (
       course_master_id, center_id, total_amount, discount_amount, registration_fee,
       num_installments, installment_1_amount, installment_2_amount,
       installment_due_rules, configured_by, status, saved_at, approved_at
     ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,'center','approved',NOW(),NOW())
     ON CONFLICT (course_master_id, center_id) DO UPDATE SET
       total_amount = EXCLUDED.total_amount,
       status = 'approved',
       approved_at = NOW(),
       updated_at = NOW()`,
    [
      COURSE_MASTER_ID,
      CENTER_ID,
      FEE.total_amount,
      FEE.discount_amount,
      FEE.registration_fee,
      FEE.num_installments,
      FEE.installment_1_amount,
      FEE.installment_2_amount,
      JSON.stringify([{ installment_no: 1, due_days: 0 }]),
    ]
  )

  console.log('✅ Seeded test pricing for E2E:')
  console.log(`   Center: ${center.rows[0].name} (${center.rows[0].slug})`)
  console.log(`   Course: ${course.rows[0].title} (${course.rows[0].slug})`)
  console.log(`   Pay URL: ${process.env.NEXT_PUBLIC_APP_URL}/${center.rows[0].slug}/payment/${course.rows[0].slug}`)

  await pool.end()
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
