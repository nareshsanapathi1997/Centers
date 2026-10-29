#!/usr/bin/env node
/**
 * Centre-wise enrollment smoke test (read-only: quote/fee APIs + pages only;
 * never creates orders or Razorpay charges).
 * Usage: BASE_URL=http://localhost:2500 node scripts/qa/enrollment-centre-smoke.cjs
 */
require('dotenv').config({ quiet: true })
const mysql = require('mysql2/promise')
const BASE = process.env.BASE_URL || 'http://localhost:2500'

async function main() {
  const db = await mysql.createConnection({
    host: process.env.DB_HOST, port: +process.env.DB_PORT || 3306,
    database: process.env.DB_DATABASE, user: process.env.DB_USERNAME, password: process.env.DB_PASSWORD,
  })
  const [centers] = await db.query('SELECT id, slug FROM centers WHERE is_active = 1 ORDER BY id')
  const [courses] = await db.query("SELECT id, slug FROM course_masters WHERE is_active = 1 AND level_type IN ('course','leaf_course') ORDER BY id")
  const [batches] = await db.query('SELECT id, course_master_id FROM course_master_batches')
  await db.end()

  const get = async (u) => { const r = await fetch(BASE + u); let j = null; try { j = await r.json() } catch {} return { s: r.status, j } }
  const quote = async (body) => { const r = await fetch(BASE + '/api/public/course-fees/quote', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) }); let j = null; try { j = await r.json() } catch {} return { s: r.status, j } }

  // Which courses each centre exposes (fee API 200 = assigned to centre)
  const assigned = {}
  for (const c of centers) {
    assigned[c.slug] = new Set()
    await Promise.all(courses.map(async (co) => {
      const r = await get(`/api/public/course-fees?centerSlug=${c.slug}&courseKey=${co.slug}`)
      if (r.s === 200) assigned[c.slug].add(co.slug)
    }))
  }

  const rows = []
  for (const c of centers) {
    const mine = [...assigned[c.slug]]
    const res = { centre: c.slug, courses: mine.length, page: '-', crossCentre: '-', quoteServer: '-', badCoupon: '-', foreignBatch: '-' }
    if (mine[0]) {
      const pg = await fetch(`${BASE}/${c.slug}/payment/${mine[0]}`); res.page = pg.status === 200 ? 'PASS' : 'FAIL ' + pg.status
      const q = await quote({ center_slug: c.slug, course_key: mine[0], payment_type: 'lumpsum' })
      res.quoteServer = q.s === 200 && q.j.amount_due > 0 ? 'PASS' : (q.s === 400 ? 'N/A (needs batch)' : 'FAIL ' + q.s)
      const bc = await quote({ center_slug: c.slug, course_key: mine[0], payment_type: 'lumpsum', coupon_code: 'NOPE-INVALID-999' })
      res.badCoupon = bc.s !== 200 || !bc.j.coupon_discount ? 'PASS' : 'FAIL'
      const co = courses.find((x) => x.slug === mine[0])
      const fb = batches.find((b) => b.course_master_id !== co.id)
      if (fb) { const r = await quote({ center_slug: c.slug, course_key: mine[0], batch_id: fb.id, payment_type: 'lumpsum' }); res.foreignBatch = r.s >= 400 ? 'PASS' : 'FAIL ' + r.s }
    }
    const foreign = courses.find((co) => !assigned[c.slug].has(co.slug) && Object.values(assigned).some((s) => s.has(co.slug)))
    if (foreign) {
      const pg = await fetch(`${BASE}/${c.slug}/payment/${foreign.slug}`)
      const q = await quote({ center_slug: c.slug, course_key: foreign.slug, payment_type: 'lumpsum' })
      res.crossCentre = pg.status === 404 && q.s >= 400 ? 'PASS' : `FAIL page=${pg.status} quote=${q.s}`
    } else res.crossCentre = 'N/A (same catalog)'
    rows.push(res)
  }
  console.table(rows)
  const failed = rows.some((r) => Object.values(r).some((v) => String(v).startsWith('FAIL')))
  process.exit(failed ? 1 : 0)
}
main().catch((e) => { console.error('ERR', e.message); process.exit(2) })
