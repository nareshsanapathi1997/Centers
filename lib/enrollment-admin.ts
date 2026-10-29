/**
 * Shared handler for Enrollment & Offers admin resources.
 * Centre Admin: scope.centerId fixed. Super Admin: centerId optional (null = defaults / all centres).
 */
import { NextResponse } from 'next/server'
import pool from '@/lib/db'
import {
  DEFAULT_ENROLLMENT_SETTINGS,
  deleteSettingsLayer,
  getEnrollmentSettings,
  getSettingsLayer,
  mergeSettings,
  saveSettingsLayer,
} from '@/lib/enrollment-settings'
import { decideApproval, getBatchSeatInfo, normMobile, recordPartialRefund, transferBatch } from '@/lib/enrollment-engine'
import { channelConfigured, enqueueNotification, runReminderCycle } from '@/lib/notification-queue'

export type EnrollmentScope = { centerId: number | null; actor: string | null; isSuper: boolean }

export const ENROLLMENT_RESOURCES = [
  'settings', 'promos', 'seats', 'waitlist', 'approvals', 'scholarship-tiers', 'scholarship-results',
  'referrals', 'reminders', 'payments', 'refunds', 'transfers', 'overview',
] as const
export type EnrollmentResource = (typeof ENROLLMENT_RESOURCES)[number]

class BadRequest extends Error {}
const bad = (m: string) => { throw new BadRequest(m) }
const num = (v: unknown) => (v === '' || v == null ? null : Number.isFinite(Number(v)) ? Number(v) : null)
const s = (v: unknown, max = 255) => (v == null || v === '' ? null : String(v).trim().slice(0, max))
const flag = (v: unknown) => (v === true || v === 1 || v === '1' || v === 'true' ? 1 : 0)
const dt = (v: unknown) => {
  if (!v) return null
  const d = new Date(String(v))
  if (Number.isNaN(d.getTime())) bad('Invalid date')
  return d.toISOString().slice(0, 19).replace('T', ' ')
}
const needCentre = (sc: EnrollmentScope) => sc.centerId ?? bad('Select a centre first.')
const cf = (sc: EnrollmentScope, col = 'center_id', idx = 1) => (sc.centerId ? `${col} = $${idx}` : '1=1')
const cp = (sc: EnrollmentScope) => (sc.centerId ? [sc.centerId] : [])

async function ownRow(table: string, id: unknown, sc: EnrollmentScope, centreCol = 'center_id') {
  const r = await pool.query(`SELECT * FROM ${table} WHERE id = $1`, [Number(id)])
  const row = r.rows[0]
  if (!row) bad('Record not found')
  if (sc.centerId && Number(row[centreCol]) !== sc.centerId) bad('Record not found')
  return row
}

function validateRule(type: unknown, value: unknown) {
  const t = type === 'fixed' ? 'fixed' : 'percent'
  const v = Number(value)
  if (!(v > 0)) bad('Discount value must be greater than zero')
  if (t === 'percent' && v > 100) bad('Percent discount cannot exceed 100')
  return { t, v }
}

export async function handleEnrollmentResource(
  method: string,
  resource: string,
  sc: EnrollmentScope,
  body: Record<string, unknown>,
  query: URLSearchParams
): Promise<NextResponse> {
  try {
    if (!(ENROLLMENT_RESOURCES as readonly string[]).includes(resource)) {
      return NextResponse.json({ error: 'Unknown resource' }, { status: 404 })
    }
    const data = await dispatch(method, resource as EnrollmentResource, sc, body, query)
    return NextResponse.json(data)
  } catch (e) {
    if (e instanceof BadRequest) return NextResponse.json({ error: e.message }, { status: 400 })
    const msg = e instanceof Error ? e.message : 'Internal server error'
    if (/not found|must|cannot|exceeds|already|only|not active|not awaiting|full/i.test(msg)) {
      return NextResponse.json({ error: msg }, { status: 400 })
    }
    console.error('enrollment admin error:', e)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

async function dispatch(method: string, resource: EnrollmentResource, sc: EnrollmentScope, b: Record<string, unknown>, q: URLSearchParams): Promise<unknown> {
  const centreKey = sc.centerId ?? 0
  switch (resource) {
    /* ------------------------------------------------------------ overview */
    case 'overview': {
      const p = cp(sc)
      const one = async (sql: string) => Number((await pool.query(sql, p)).rows[0]?.n || 0)
      return {
        pending_approvals: await one(`SELECT COUNT(*) AS n FROM student_fee_payments WHERE approval_status = 'pending' AND ${cf(sc)}`),
        waitlist: await one(`SELECT COUNT(*) AS n FROM enrollment_waitlist WHERE status = 'waiting' AND ${cf(sc)}`),
        active_promos: await one(`SELECT COUNT(*) AS n FROM course_fee_discounts WHERE is_active = 1 AND ${sc.centerId ? 'center_id = $1' : 'center_id IS NOT NULL'}`),
        queued_notifications: await one(`SELECT COUNT(*) AS n FROM notification_queue WHERE status = 'queued' AND ${cf(sc)}`),
        refunds_total: await one(`SELECT COALESCE(SUM(amount),0) AS n FROM payment_refunds WHERE ${cf(sc)}`),
        referral_codes: await one(`SELECT COUNT(*) AS n FROM referral_codes WHERE is_active = 1 AND ${cf(sc)}`),
        channels: { sms: channelConfigured('sms'), whatsapp: channelConfigured('whatsapp'), email: channelConfigured('email') },
      }
    }
    /* ------------------------------------------------------------ settings */
    case 'settings': {
      if (method === 'GET') {
        const defaults = (await getSettingsLayer(0)) || {}
        const override = sc.centerId ? (await getSettingsLayer(sc.centerId)) || {} : null
        return {
          scope: sc.centerId ? 'centre' : 'default',
          builtin: DEFAULT_ENROLLMENT_SETTINGS,
          defaults,
          override,
          inherited: mergeSettings(defaults),
          effective: sc.centerId ? await getEnrollmentSettings(sc.centerId) : mergeSettings(defaults),
        }
      }
      if (method === 'PUT') return { effective: await saveSettingsLayer(centreKey, b.settings ?? b, sc.actor) }
      if (method === 'DELETE') {
        await deleteSettingsLayer(centreKey)
        return { ok: true }
      }
      break
    }
    /* -------------------------------------------------------------- promos */
    case 'promos': {
      if (method === 'GET') {
        const r = await pool.query(
          `SELECT d.*, cm.title AS course_title, c.name AS center_name,
             (SELECT COUNT(*) FROM student_fee_payments p WHERE p.center_id = d.center_id AND p.course_master_id = d.course_master_id
                AND UPPER(p.coupon_code) = UPPER(d.coupon_code) AND p.status = 'completed') AS used_count
           FROM course_fee_discounts d
           LEFT JOIN course_masters cm ON cm.id = d.course_master_id
           LEFT JOIN centers c ON c.id = d.center_id
           WHERE ${sc.centerId ? 'd.center_id = $1' : '1=1'}
           ORDER BY d.is_active DESC, d.id DESC LIMIT 500`,
          cp(sc)
        )
        const courses = await pool.query(
          sc.centerId
            ? `SELECT DISTINCT cm.id, cm.title FROM course_masters cm JOIN course_center_fees f ON f.course_master_id = cm.id WHERE f.center_id = $1 ORDER BY cm.title`
            : `SELECT id, title FROM course_masters ORDER BY title`,
          cp(sc)
        )
        return { rows: r.rows, courses: courses.rows }
      }
      if (method === 'DELETE') {
        const row = await ownRow('course_fee_discounts', q.get('id') || b.id, sc)
        await pool.query(`UPDATE course_fee_discounts SET is_active = 0 WHERE id = $1`, [row.id])
        return { ok: true }
      }
      const centerId = sc.centerId ?? num(b.center_id) ?? bad('Choose a centre for this promo (promos are centre-scoped).')
      const courseId = num(b.course_master_id) ?? bad('Choose a programme')
      const { t, v } = validateRule(b.discount_type, b.discount_value)
      const code = s(b.coupon_code, 60)?.toUpperCase().replace(/\s+/g, '') || null
      const starts = dt(b.starts_at)
      const ends = dt(b.ends_at)
      if (starts && ends && ends <= starts) bad('End date must be after the start date')
      const vals = [courseId, centerId, s(b.name, 160) || code || 'Offer', t, v, code, flag(b.is_active ?? true), starts, ends,
        num(b.usage_limit), num(b.per_mobile_limit), num(b.min_amount)]
      if (code) {
        const dup = await pool.query(
          `SELECT id FROM course_fee_discounts WHERE center_id = $1 AND course_master_id = $2 AND UPPER(coupon_code) = $3 AND is_active = 1 AND id <> $4`,
          [centerId, courseId, code, Number(b.id) || 0]
        )
        if (dup.rows.length) bad('An active promo with this code already exists for this programme at this centre')
      }
      if (method === 'POST') {
        await pool.query(
          `INSERT INTO course_fee_discounts (course_master_id, center_id, name, discount_type, discount_value, coupon_code, is_active, starts_at, ends_at, usage_limit, per_mobile_limit, min_amount, created_by)
           VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13)`,
          [...vals, sc.actor]
        )
        return { ok: true }
      }
      if (method === 'PUT') {
        const row = await ownRow('course_fee_discounts', b.id, sc)
        await pool.query(
          `UPDATE course_fee_discounts SET course_master_id=$1, center_id=$2, name=$3, discount_type=$4, discount_value=$5, coupon_code=$6,
             is_active=$7, starts_at=$8, ends_at=$9, usage_limit=$10, per_mobile_limit=$11, min_amount=$12 WHERE id=$13`,
          [...vals, row.id]
        )
        return { ok: true }
      }
      break
    }
    /* --------------------------------------------------------------- seats */
    case 'seats': {
      const centerId = needCentre(sc)
      if (method === 'GET') {
        const r = await pool.query(
          `SELECT b.id, b.batch_name, b.batch_timing, b.start_date, b.capacity AS base_capacity, b.is_active, cm.title AS course_title, cm.id AS course_master_id
           FROM course_master_batches b
           JOIN course_masters cm ON cm.id = b.course_master_id
           WHERE b.course_master_id IN (SELECT course_master_id FROM course_center_fees WHERE center_id = $1)
           ORDER BY cm.title, b.start_date`,
          [centerId]
        )
        const info = await getBatchSeatInfo(centerId, r.rows.map((x: { id: number }) => Number(x.id)))
        return { rows: r.rows.map((x: { id: number }) => ({ ...x, ...info[Number(x.id)] })) }
      }
      if (method === 'PUT') {
        const batchId = num(b.batch_id) ?? bad('batch_id required')
        const cap = num(b.capacity)
        if (cap != null && (cap < 0 || cap > 100000)) bad('Capacity must be between 0 and 100000')
        await pool.query(
          `INSERT INTO batch_seat_limits (center_id, batch_id, capacity) VALUES ($1,$2,$3)
           ON CONFLICT (center_id, batch_id) DO UPDATE SET capacity = EXCLUDED.capacity`,
          [centerId, batchId, cap]
        )
        return { ok: true }
      }
      break
    }
    /* ------------------------------------------------------------ waitlist */
    case 'waitlist': {
      if (method === 'GET') {
        const r = await pool.query(
          `SELECT w.*, cm.title AS course_title, b.batch_name, c.name AS center_name
           FROM enrollment_waitlist w
           LEFT JOIN course_masters cm ON cm.id = w.course_master_id
           LEFT JOIN course_master_batches b ON b.id = w.batch_id
           LEFT JOIN centers c ON c.id = w.center_id
           WHERE ${sc.centerId ? 'w.center_id = $1' : '1=1'} ORDER BY FIELD(w.status,'waiting','notified','enrolled','removed'), w.id LIMIT 500`,
          cp(sc)
        )
        return { rows: r.rows }
      }
      if (method === 'PUT') {
        const row = await ownRow('enrollment_waitlist', b.id, sc)
        const status = ['waiting', 'notified', 'enrolled', 'removed'].includes(String(b.status)) ? String(b.status) : bad('Invalid status')
        await pool.query(`UPDATE enrollment_waitlist SET status = $2, note = COALESCE($3, note) WHERE id = $1`, [row.id, status, s(b.note, 500)])
        if (status === 'notified') {
          const slug = (await pool.query(`SELECT slug FROM centers WHERE id = $1`, [row.center_id])).rows[0]?.slug
          const body = `Good news ${row.student_name}! A seat has opened up. Enroll soon: /${slug || ''} - seats are limited.`
          for (const ch of ['sms', 'whatsapp'] as const) {
            await enqueueNotification({ centerId: Number(row.center_id), channel: ch, recipient: row.student_mobile, body, kind: 'waitlist_seat', dedupeKey: `waitlist:${row.id}:${ch}:${Date.now()}` })
          }
          if (row.student_email) await enqueueNotification({ centerId: Number(row.center_id), channel: 'email', recipient: row.student_email, subject: 'A seat is available', body, kind: 'waitlist_seat', dedupeKey: `waitlist:${row.id}:email:${Date.now()}` })
        }
        return { ok: true }
      }
      if (method === 'DELETE') {
        const row = await ownRow('enrollment_waitlist', q.get('id') || b.id, sc)
        await pool.query(`DELETE FROM enrollment_waitlist WHERE id = $1`, [row.id])
        return { ok: true }
      }
      break
    }
    /* ----------------------------------------------------------- approvals */
    case 'approvals': {
      if (method === 'GET') {
        const status = ['pending', 'approved', 'rejected'].includes(String(q.get('status'))) ? String(q.get('status')) : 'pending'
        const r = await pool.query(
          `SELECT p.id, p.receipt_no, p.student_name, p.student_mobile, p.student_email, p.amount_paid, p.payment_type, p.installment_no,
                  p.approval_status, p.approval_note, p.approved_by, p.approved_at, p.form_data, p.created_at, p.center_id,
                  cm.title AS course_title, b.batch_name, c.name AS center_name
           FROM student_fee_payments p
           LEFT JOIN course_masters cm ON cm.id = p.course_master_id
           LEFT JOIN course_master_batches b ON b.id = p.batch_id
           LEFT JOIN centers c ON c.id = p.center_id
           WHERE p.approval_status = $${sc.centerId ? 2 : 1} AND ${sc.centerId ? 'p.center_id = $1' : '1=1'}
           ORDER BY p.id DESC LIMIT 300`,
          [...cp(sc), status]
        )
        return { rows: r.rows }
      }
      if (method === 'POST') {
        const action = b.action === 'reject' ? 'reject' : b.action === 'approve' ? 'approve' : bad('action must be approve or reject')
        return decideApproval({ paymentId: Number(b.payment_id), centerId: sc.centerId, action, note: s(b.note, 500), actor: sc.actor })
      }
      break
    }
    /* --------------------------------------------------- scholarship tiers */
    case 'scholarship-tiers': {
      if (method === 'GET') {
        const r = await pool.query(
          `SELECT t.*, cm.title AS course_title FROM scholarship_tiers t LEFT JOIN course_masters cm ON cm.id = t.course_master_id
           WHERE t.center_key IN (0, $1) ORDER BY t.center_key DESC, t.min_score DESC`,
          [centreKey]
        )
        return { rows: r.rows.map((x: { center_key: number }) => ({ ...x, inherited: sc.centerId != null && Number(x.center_key) === 0 })) }
      }
      if (method === 'DELETE') {
        const row = await ownRow('scholarship_tiers', q.get('id') || b.id, { ...sc, centerId: null })
        if (Number(row.center_key) !== centreKey) bad('Default tiers can only be changed by Super Admin')
        await pool.query(`DELETE FROM scholarship_tiers WHERE id = $1`, [row.id])
        return { ok: true }
      }
      const { t, v } = validateRule(b.discount_type, b.discount_value)
      const min = num(b.min_score) ?? 0
      const max = num(b.max_score) ?? 100
      if (min < 0 || max > 100 || min > max) bad('Score band must be within 0-100 and min <= max')
      const vals = [s(b.name, 160) || bad('Name is required'), min, max, t, v, num(b.course_master_id), flag(b.is_active ?? true)]
      if (method === 'POST') {
        await pool.query(
          `INSERT INTO scholarship_tiers (name, min_score, max_score, discount_type, discount_value, course_master_id, is_active, center_key) VALUES ($1,$2,$3,$4,$5,$6,$7,$8)`,
          [...vals, centreKey]
        )
        return { ok: true }
      }
      if (method === 'PUT') {
        const row = await ownRow('scholarship_tiers', b.id, { ...sc, centerId: null })
        if (Number(row.center_key) !== centreKey) bad('Default tiers can only be changed by Super Admin')
        await pool.query(
          `UPDATE scholarship_tiers SET name=$1, min_score=$2, max_score=$3, discount_type=$4, discount_value=$5, course_master_id=$6, is_active=$7 WHERE id=$8`,
          [...vals, row.id]
        )
        return { ok: true }
      }
      break
    }
    /* ------------------------------------------------- scholarship results */
    case 'scholarship-results': {
      if (method === 'GET') {
        const r = await pool.query(
          `SELECT r.*, c.name AS center_name FROM scholarship_results r LEFT JOIN centers c ON c.id = r.center_id
           WHERE ${sc.centerId ? 'r.center_id = $1' : '1=1'} ORDER BY r.id DESC LIMIT 500`,
          cp(sc)
        )
        return { rows: r.rows }
      }
      if (method === 'DELETE') {
        const row = await ownRow('scholarship_results', q.get('id') || b.id, sc)
        await pool.query(`DELETE FROM scholarship_results WHERE id = $1`, [row.id])
        return { ok: true }
      }
      if (method === 'POST') {
        const centerId = needCentre(sc)
        const rows = Array.isArray(b.rows) ? (b.rows as Record<string, unknown>[]) : [b]
        let added = 0
        for (const x of rows.slice(0, 1000)) {
          const mobile = normMobile(String(x.student_mobile || ''))
          if (mobile.length !== 10) bad(`Invalid mobile: ${x.student_mobile ?? ''}`)
          const score = num(x.score) ?? bad('Score is required')
          const max = num(x.max_score) ?? 100
          if (score < 0 || max <= 0 || score > max) bad('Score must be between 0 and max score')
          await pool.query(
            `INSERT INTO scholarship_results (center_id, student_mobile, student_name, test_name, score, max_score, valid_until) VALUES ($1,$2,$3,$4,$5,$6,$7)`,
            [centerId, mobile, s(x.student_name), s(x.test_name, 160), score, max, s(x.valid_until, 10)]
          )
          added++
        }
        return { ok: true, added }
      }
      break
    }
    /* ----------------------------------------------------------- referrals */
    case 'referrals': {
      if (method === 'GET') {
        const r = await pool.query(
          `SELECT rc.*, c.name AS center_name,
             (SELECT COUNT(*) FROM student_fee_payments p WHERE UPPER(p.referral_code) = UPPER(rc.code) AND p.status = 'completed') AS used_count
           FROM referral_codes rc LEFT JOIN centers c ON c.id = rc.center_id
           WHERE ${sc.centerId ? 'rc.center_id = $1' : '1=1'} ORDER BY rc.id DESC LIMIT 500`,
          cp(sc)
        )
        return { rows: r.rows }
      }
      if (method === 'DELETE') {
        const row = await ownRow('referral_codes', q.get('id') || b.id, sc)
        await pool.query(`UPDATE referral_codes SET is_active = 0 WHERE id = $1`, [row.id])
        return { ok: true }
      }
      const { t, v } = validateRule(b.discount_type, b.discount_value)
      const code = (s(b.code, 40) || '').toUpperCase().replace(/[^A-Z0-9-]/g, '')
      if (code.length < 4) bad('Code must be at least 4 letters/numbers')
      const ownerMobile = b.owner_mobile ? normMobile(String(b.owner_mobile)) : null
      const vals = [code, s(b.owner_name), ownerMobile, t, v, num(b.usage_limit), s(b.expires_at, 10), flag(b.is_active ?? true)]
      const dup = await pool.query(`SELECT id FROM referral_codes WHERE UPPER(code) = $1 AND id <> $2`, [code, Number(b.id) || 0])
      if (dup.rows.length) bad('This referral code is already taken')
      if (method === 'POST') {
        const centerId = needCentre(sc)
        await pool.query(
          `INSERT INTO referral_codes (code, owner_name, owner_mobile, discount_type, discount_value, usage_limit, expires_at, is_active, center_id) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)`,
          [...vals, centerId]
        )
        return { ok: true }
      }
      if (method === 'PUT') {
        const row = await ownRow('referral_codes', b.id, sc)
        await pool.query(
          `UPDATE referral_codes SET code=$1, owner_name=$2, owner_mobile=$3, discount_type=$4, discount_value=$5, usage_limit=$6, expires_at=$7, is_active=$8 WHERE id=$9`,
          [...vals, row.id]
        )
        return { ok: true }
      }
      break
    }
    /* ----------------------------------------------------------- reminders */
    case 'reminders': {
      if (method === 'GET') {
        const r = await pool.query(
          `SELECT id, center_id, channel, recipient, subject, kind, status, attempts, last_error, created_at, sent_at
           FROM notification_queue WHERE ${cf(sc)} ORDER BY id DESC LIMIT 200`,
          cp(sc)
        )
        const stats = await pool.query(`SELECT status, COUNT(*) AS n FROM notification_queue WHERE ${cf(sc)} GROUP BY status`, cp(sc))
        return {
          rows: r.rows,
          stats: Object.fromEntries(stats.rows.map((x: { status: string; n: number }) => [x.status, Number(x.n)])),
          channels: { sms: channelConfigured('sms'), whatsapp: channelConfigured('whatsapp'), email: channelConfigured('email') },
        }
      }
      if (method === 'POST') return { ok: true, ...(await runReminderCycle({ centerId: sc.centerId })) }
      break
    }
    /* ------------------------------------------------- payments (lookup) */
    case 'payments': {
      const term = String(q.get('q') || '').trim()
      const params: unknown[] = [...cp(sc)]
      let where = `p.status = 'completed' AND ${sc.centerId ? 'p.center_id = $1' : '1=1'}`
      if (term) {
        params.push(`%${term}%`)
        const i = params.length
        where += ` AND (p.receipt_no LIKE $${i} OR p.student_name LIKE $${i} OR p.student_mobile LIKE $${i})`
      }
      const r = await pool.query(
        `SELECT p.id, p.receipt_no, p.student_name, p.student_mobile, p.amount_paid, p.refunded_amount, p.course_master_id, p.batch_id, p.center_id,
                cm.title AS course_title, b.batch_name
         FROM student_fee_payments p LEFT JOIN course_masters cm ON cm.id = p.course_master_id LEFT JOIN course_master_batches b ON b.id = p.batch_id
         WHERE ${where} ORDER BY p.id DESC LIMIT 50`,
        params
      )
      const batches = await pool.query(
        `SELECT id, course_master_id, batch_name, batch_timing, start_date FROM course_master_batches WHERE is_active = 1 ORDER BY start_date`
      )
      return { rows: r.rows, batches: batches.rows }
    }
    /* ------------------------------------------------------------- refunds */
    case 'refunds': {
      if (method === 'GET') {
        const r = await pool.query(
          `SELECT rf.*, p.receipt_no, p.student_name, p.student_mobile, p.amount_paid, c.name AS center_name
           FROM payment_refunds rf JOIN student_fee_payments p ON p.id = rf.payment_id LEFT JOIN centers c ON c.id = rf.center_id
           WHERE ${sc.centerId ? 'rf.center_id = $1' : '1=1'} ORDER BY rf.id DESC LIMIT 300`,
          cp(sc)
        )
        return { rows: r.rows }
      }
      if (method === 'POST') {
        return recordPartialRefund({
          paymentId: Number(b.payment_id), centerId: sc.centerId, amount: Number(b.amount),
          reason: s(b.reason, 500), method: s(b.method, 50), reference: s(b.reference), actor: sc.actor,
        })
      }
      break
    }
    /* ----------------------------------------------------------- transfers */
    case 'transfers': {
      if (method === 'GET') {
        const r = await pool.query(
          `SELECT t.*, cm.title AS course_title, fb.batch_name AS from_batch, tb.batch_name AS to_batch, c.name AS center_name
           FROM batch_transfers t LEFT JOIN course_masters cm ON cm.id = t.course_master_id
           LEFT JOIN course_master_batches fb ON fb.id = t.from_batch_id LEFT JOIN course_master_batches tb ON tb.id = t.to_batch_id
           LEFT JOIN centers c ON c.id = t.center_id
           WHERE ${sc.centerId ? 't.center_id = $1' : '1=1'} ORDER BY t.id DESC LIMIT 300`,
          cp(sc)
        )
        return { rows: r.rows }
      }
      if (method === 'POST') {
        const pay = await ownRow('student_fee_payments', b.payment_id, sc)
        return transferBatch({
          centerId: Number(pay.center_id), courseMasterId: Number(pay.course_master_id), mobile: pay.student_mobile,
          toBatchId: Number(b.to_batch_id), reason: s(b.reason, 500), actor: sc.actor,
        })
      }
      break
    }
  }
  return bad(`${method} not supported for ${resource}`)
}
