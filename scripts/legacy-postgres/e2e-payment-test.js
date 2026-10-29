require('dotenv').config()
const { Pool } = require('pg')

const BASE = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:2500'
const pool = new Pool({ connectionString: process.env.DATABASE_URL })

async function fetchJson(url, opts) {
  const res = await fetch(url, opts)
  const data = await res.json().catch(() => ({}))
  return { ok: res.ok, status: res.status, data }
}

async function findPayableCourse() {
  const result = await pool.query(`
    SELECT c.slug AS center_slug, c.name AS center_name, cm.slug AS course_slug, cm.title AS course_title,
           cf.course_master_id, cf.center_id, cf.status
    FROM course_center_fees cf
    JOIN centers c ON c.id = cf.center_id
    JOIN course_masters cm ON cm.id = cf.course_master_id
    WHERE cf.status IN ('saved', 'approved')
    ORDER BY cf.updated_at DESC NULLS LAST
    LIMIT 5
  `)
  return result.rows
}

async function main() {
  console.log('=== E2E Payment Test ===')
  console.log('Base URL:', BASE)
  console.log('Razorpay configured:', Boolean(process.env.RAZORPAY_KEY_ID && process.env.RAZORPAY_KEY_SECRET))
  console.log('Online enabled:', process.env.PAYMENT_GATEWAY !== 'manual')

  const courses = await findPayableCourse()
  if (!courses.length) {
    console.error('FAIL: No center fees with status saved/approved. Save pricing in Center Admin first.')
    process.exit(1)
  }

  const pick = courses[0]
  console.log('\nUsing:', pick.center_name, '→', pick.course_title)
  console.log('Payment URL:', `${BASE}/${pick.center_slug}/payment/${pick.course_slug}`)

  const feeRes = await fetchJson(
    `${BASE}/api/public/course-fees?centerSlug=${encodeURIComponent(pick.center_slug)}&courseKey=${encodeURIComponent(pick.course_slug)}`
  )
  if (!feeRes.ok) {
    console.error('FAIL GET fee:', feeRes.status, feeRes.data)
    process.exit(1)
  }
  console.log('\n[1] GET fee: OK')
  console.log('    payment_available:', feeRes.data.payment_available)
  console.log('    online_payment_enabled:', feeRes.data.online_payment_enabled)
  console.log('    requires_batch:', feeRes.data.requires_batch_selection)

  if (feeRes.data.requires_batch_selection && feeRes.data.batches?.length) {
    pick.batch_id = feeRes.data.batches[0].id
    console.log('    using batch:', pick.batch_id)
    const batchFee = await fetchJson(
      `${BASE}/api/public/course-fees?centerSlug=${encodeURIComponent(pick.center_slug)}&courseKey=${encodeURIComponent(pick.course_slug)}&batchId=${pick.batch_id}`
    )
    if (!batchFee.ok || !batchFee.data.payment_available) {
      console.error('FAIL batch fee:', batchFee.data)
      process.exit(1)
    }
  }

  if (!feeRes.data.payment_available && !pick.batch_id) {
    console.error('FAIL: Fee not available for payment')
    process.exit(1)
  }

  const quoteBody = {
    center_slug: pick.center_slug,
    course_key: pick.course_slug,
    batch_id: pick.batch_id || null,
    payment_type: 'lumpsum',
    coupon_code: null,
  }
  const quoteRes = await fetchJson(`${BASE}/api/public/course-fees/quote`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(quoteBody),
  })
  if (!quoteRes.ok) {
    console.error('FAIL quote:', quoteRes.data)
    process.exit(1)
  }
  console.log('\n[2] POST quote: OK')
  console.log('    amount_due: ₹' + quoteRes.data.amount_due)
  console.log('    gst:', quoteRes.data.gst_amount, '@', quoteRes.data.gst_rate + '%')

  const orderBody = {
    center_slug: pick.center_slug,
    course_key: pick.course_slug,
    batch_id: pick.batch_id || null,
    student_name: 'E2E Test Student',
    student_email: 'e2e-test@example.com',
    student_mobile: '9876543210',
    payment_type: 'lumpsum',
    installment_no: null,
    coupon_code: null,
    idempotency_key: `e2e-${Date.now()}`,
  }
  const orderRes = await fetchJson(`${BASE}/api/public/course-fees/order`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(orderBody),
  })
  if (!orderRes.ok) {
    console.error('FAIL order:', orderRes.data)
    process.exit(1)
  }
  console.log('\n[3] POST order: OK')
  console.log('    payment_id:', orderRes.data.payment_id)
  console.log('    receipt_no:', orderRes.data.receipt_no)
  console.log('    razorpay order_id:', orderRes.data.razorpay?.order_id || '(none)')
  console.log('    razorpay key_id:', orderRes.data.razorpay?.key_id ? orderRes.data.razorpay.key_id.slice(0, 12) + '...' : '(none)')

  if (!orderRes.data.razorpay?.order_id) {
    console.error('FAIL: No Razorpay order returned — check RAZORPAY_KEY_ID/SECRET')
    process.exit(1)
  }

  console.log('\n✅ API chain passed through Razorpay order creation.')
  console.log('\n--- Manual browser step ---')
  console.log('Open:', `${BASE}/${pick.center_slug}/payment/${pick.course_slug}`)
  console.log('Use Razorpay test card: 4111 1111 1111 1111, any future expiry, any CVV')
  console.log('After pay, receipt should show and email sent if SendGrid configured.')

  await pool.end()
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
