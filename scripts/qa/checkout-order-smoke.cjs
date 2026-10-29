#!/usr/bin/env node
/** Checkout order smoke: creates pending test orders (mobile 9000099991) up to Razorpay order creation, then deletes them. */
require('dotenv').config({ quiet: true })
const mysql = require('mysql2/promise')
const BASE = process.env.BASE_URL || 'http://localhost:2500'
const MOB = '9000099991'
;(async () => {
  const db = await mysql.createConnection({ host: process.env.DB_HOST, port: +process.env.DB_PORT || 3306, user: process.env.DB_USERNAME, password: process.env.DB_PASSWORD, database: process.env.DB_DATABASE })
  const [centers] = await db.query('SELECT id, slug FROM centers WHERE is_active = 1 ORDER BY id LIMIT 3')
  const [disc] = await db.query('SELECT * FROM course_fee_discounts WHERE coupon_code IS NOT NULL AND coupon_code <> "" AND is_active = 1')
  const [refs] = await db.query('SELECT * FROM referral_codes LIMIT 5').catch(() => [[]])
  const post = async (u, b) => { const r = await fetch(BASE + u, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(b) }); let j = null; try { j = await r.json() } catch {} return { s: r.status, j } }
  const out = []
  for (const c of centers) {
    const r = await fetch(`${BASE}/api/public/course-fees?centerSlug=${c.slug}&courseKey=cat-2027-weekend-classroom`); const fee = await r.json().catch(() => ({}))
    const [b] = await db.query('SELECT b.id FROM course_master_batches b JOIN course_masters m ON m.id=b.course_master_id WHERE m.slug=? AND (b.center_id=? OR b.center_id IS NULL) AND b.is_active=1 LIMIT 1', ['cat-2027-weekend-classroom', c.id]).catch(() => [[]])
    const base = { center_slug: c.slug, course_key: 'cat-2027-weekend-classroom', batch_id: b[0]?.id ?? null, student_name: 'QA Test', student_email: '', student_mobile: MOB, payment_type: 'lumpsum', terms_accepted: true, form_data: { note: '', city: null } }
    const coupon = disc.find((d) => !d.center_id || d.center_id === c.id)?.coupon_code
    const ref = refs[0]?.code || refs[0]?.referral_code
    const cases = {
      noCouponNull: { ...base, coupon_code: null, referral_code: null },
      noCouponEmpty: { ...base, coupon_code: '', referral_code: '' },
      noCouponMissing: { ...base },
      validCoupon: coupon ? { ...base, coupon_code: ' ' + String(coupon).toLowerCase() + ' ' } : null,
      invalidCoupon: { ...base, coupon_code: 'NOPE-INVALID-999' },
      tooLongCoupon: { ...base, coupon_code: 'X'.repeat(80) },
      referral: ref ? { ...base, referral_code: ref } : null,
      installment: { ...base, payment_type: 'installment', installment_no: 1 },
    }
    for (const [k, body] of Object.entries(cases)) {
      if (!body) { out.push(`${c.slug} ${k}: SKIP (no code in DB)`); continue }
      body.idempotency_key = `qa-${c.slug}-${k}-${Date.now()}`
      const res = await post('/api/public/course-fees/order', body)
      const j = res.j || {}
      out.push(`${c.slug} ${k}: ${res.s} due=${j.amount_due ?? '-'} coupon=${j.coupon_discount ?? '-'} disc=${j.total_discount ?? '-'} rzp=${j.razorpay ? 'order' : (j.gateway_order_id ? 'order' : 'none')} online=${j.online_enabled} appr=${j.approval_status ?? '-'} ${j.error ? 'err=' + j.error : ''}`)
    }
  }
  const [del] = await db.query('DELETE FROM student_fee_payments WHERE student_mobile = ?', [MOB]).catch((e) => [{ affectedRows: 'ERR ' + e.code }])
  out.push(`cleanup deleted ${del.affectedRows} test payments`)
  await db.end()
  console.log(out.join('\n'))
})().catch((e) => { console.error('FATAL', e.message); process.exit(1) })

