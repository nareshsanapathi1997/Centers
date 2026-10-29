#!/usr/bin/env node
/**
 * Applies migrations/mysql/2026-10-29-enrollment-features.sql (idempotent) and
 * the one-time data migration that scopes legacy global promos per centre:
 *  - course_fee_discounts rows with center_id NULL -> one row per assigned centre,
 *    global row deactivated.
 *  - course_masters.coupon_code (legacy CATEARLY style) -> per-centre discount rows,
 *    legacy flag switched off.
 * Usage: node scripts/mysql/apply-enrollment-migration.js
 */
const fs = require('fs')
const path = require('path')
const ROOT = path.join(__dirname, '..', '..')
require('dotenv').config({ path: path.join(ROOT, '.env') })
require('./register-ts')
const pool = require('../../lib/db.ts').default

// Thin adapter so the body below can use mysql2-style [rows] destructuring.
function conn() {
  return {
    query: async (sql, params = []) => {
      let i = 0
      const r = await pool.query(sql.replace(/\?/g, () => `$${++i}`), params)
      return [r.rows || []]
    },
    end: async () => { if (pool.end) await pool.end() },
  }
}

async function main() {
  const db = conn()
  const sql = fs.readFileSync(
    path.join(__dirname, '..', '..', 'migrations', 'mysql', '2026-10-29-enrollment-features.sql'),
    'utf8'
  )
  const statements = sql
    .split(/;\s*\n/)
    .map((s) => s.replace(/^\s*--.*$/gm, '').trim())
    .filter(Boolean)
  for (const st of statements) await db.query(st)
  console.log(`schema: ${statements.length} statements applied`)

  const MARK = '2026-10-29-scope-legacy-promos'
  const [done] = await db.query('SELECT name FROM app_migrations WHERE name = ?', [MARK])
  if (done.length) {
    console.log('data: legacy promo scoping already applied')
    await db.end()
    return
  }

  let scoped = 0
  const [globals] = await db.query(
    'SELECT * FROM course_fee_discounts WHERE center_id IS NULL AND is_active = 1'
  )
  for (const g of globals) {
    const [centres] = await db.query(
      'SELECT DISTINCT center_id FROM course_center_fees WHERE course_master_id = ? AND center_id IS NOT NULL',
      [g.course_master_id]
    )
    for (const c of centres) {
      const [exists] = await db.query(
        `SELECT id FROM course_fee_discounts WHERE course_master_id = ? AND center_id = ? AND COALESCE(UPPER(coupon_code), '') = COALESCE(UPPER(?), '')`,
        [g.course_master_id, c.center_id, g.coupon_code]
      )
      if (exists.length) continue
      await db.query(
        `INSERT INTO course_fee_discounts (course_master_id, center_id, name, discount_type, discount_value, coupon_code, is_active, starts_at, ends_at, usage_limit, per_mobile_limit)
         VALUES (?,?,?,?,?,?,1,?,?,?,?)`,
        [g.course_master_id, c.center_id, g.name, g.discount_type, g.discount_value, g.coupon_code, g.starts_at || null, g.ends_at || null, g.usage_limit || null, g.per_mobile_limit || null]
      )
      scoped++
    }
    await db.query('UPDATE course_fee_discounts SET is_active = 0 WHERE id = ?', [g.id])
  }

  let legacy = 0
  const [cols] = await db.query("SHOW COLUMNS FROM course_masters LIKE 'coupon_code'")
  if (cols.length) {
    const [rows] = await db.query(
      "SELECT * FROM course_masters WHERE coupon_code IS NOT NULL AND coupon_code <> '' AND (coupon_enabled = 1 OR coupon_enabled IS NULL)"
    )
    for (const cm of rows) {
      const pct = Number(cm.discount_percent || 0)
      const amt = Number(cm.discount_amount || 0)
      const type = amt > 0 ? 'fixed' : 'percent'
      const value = amt > 0 ? amt : pct
      if (!(value > 0)) continue
      const [centres] = await db.query(
        'SELECT DISTINCT center_id FROM course_center_fees WHERE course_master_id = ? AND center_id IS NOT NULL',
        [cm.id]
      )
      for (const c of centres) {
        const [exists] = await db.query(
          'SELECT id FROM course_fee_discounts WHERE course_master_id = ? AND center_id = ? AND UPPER(coupon_code) = UPPER(?)',
          [cm.id, c.center_id, cm.coupon_code]
        )
        if (exists.length) continue
        await db.query(
          `INSERT INTO course_fee_discounts (course_master_id, center_id, name, discount_type, discount_value, coupon_code, is_active)
           VALUES (?,?,?,?,?,?,1)`,
          [cm.id, c.center_id, `${cm.coupon_code} (migrated)`, type, value, String(cm.coupon_code).toUpperCase()]
        )
        legacy++
      }
      await db.query('UPDATE course_masters SET coupon_enabled = 0 WHERE id = ?', [cm.id])
    }
  }
  await db.query('INSERT INTO app_migrations (name) VALUES (?)', [MARK])
  console.log(`data: ${scoped} global promo rows scoped per centre, ${legacy} legacy course coupons migrated`)
  await db.end()
}

main().catch((e) => {
  console.error('migration failed:', e.message)
  process.exit(1)
})
