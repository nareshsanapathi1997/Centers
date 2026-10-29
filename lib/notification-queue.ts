/**
 * Outbound notification queue (SMS / WhatsApp / email) + installment reminders.
 * Providers are configured only through environment variables; when a channel has
 * no provider configured the item is marked `skipped` (safe no-op, never throws).
 *   SMS:      SMS_API_URL (+ optional SMS_API_KEY)          POST JSON {to, message}
 *   WhatsApp: WHATSAPP_API_URL (+ optional WHATSAPP_API_TOKEN) POST JSON {to, message}
 *   Email:    existing SendGrid mailer (SENDGRID_API_KEY)
 */
import pool from '@/lib/db'
import { getEnrollmentSettings } from '@/lib/enrollment-settings'

export type Channel = 'sms' | 'whatsapp' | 'email' | 'in_app'

export function channelConfigured(channel: Channel): boolean {
  if (channel === 'sms') return Boolean(process.env.SMS_API_URL)
  if (channel === 'whatsapp') return Boolean(process.env.WHATSAPP_API_URL)
  if (channel === 'email') return Boolean(process.env.SENDGRID_API_KEY)
  return true
}

export async function enqueueNotification(input: {
  centerId: number | null
  channel: Channel
  recipient: string
  body: string
  subject?: string | null
  kind?: string
  dedupeKey?: string | null
}): Promise<boolean> {
  if (!input.recipient) return false
  try {
    await pool.query(
      `INSERT INTO notification_queue (center_id, channel, recipient, subject, body, kind, dedupe_key)
       VALUES ($1,$2,$3,$4,$5,$6,$7)`,
      [input.centerId, input.channel, input.recipient, input.subject || null, input.body, input.kind || 'general', input.dedupeKey || null]
    )
    return true
  } catch (e) {
    // Duplicate dedupe_key = already queued: not an error.
    if (/duplicate/i.test(String((e as Error)?.message))) return false
    console.error('enqueueNotification failed:', (e as Error)?.message)
    return false
  }
}

async function postJson(url: string, token: string | undefined, payload: Record<string, unknown>) {
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
    body: JSON.stringify(payload),
  })
  if (!res.ok) throw new Error(`HTTP ${res.status}`)
}

async function deliver(row: Record<string, unknown>): Promise<'sent' | 'skipped'> {
  const channel = String(row.channel) as Channel
  if (!channelConfigured(channel)) return 'skipped'
  const to = String(row.recipient)
  const body = String(row.body)
  if (channel === 'sms') {
    await postJson(process.env.SMS_API_URL!, process.env.SMS_API_KEY, { to: to.replace(/\D/g, '').slice(-10), mobile: to, message: body })
  } else if (channel === 'whatsapp') {
    await postJson(process.env.WHATSAPP_API_URL!, process.env.WHATSAPP_API_TOKEN, { to: to.replace(/\D/g, ''), message: body })
  } else if (channel === 'email') {
    const { sendEmail } = await import('@/lib/email')
    const ok = await sendEmail({ to, subject: String(row.subject || 'Notification'), html: `<p>${body.replace(/</g, '&lt;')}</p>`, text: body } as Parameters<typeof sendEmail>[0])
    if (!ok) throw new Error('mailer returned false')
  }
  return 'sent'
}

export async function dispatchQueued(opts: { centerId?: number | null; limit?: number } = {}) {
  const limit = Math.min(500, opts.limit || 100)
  const params: unknown[] = []
  let where = `status = 'queued' AND attempts < 3`
  if (opts.centerId) {
    params.push(opts.centerId)
    where += ` AND center_id = $1`
  }
  const rows = await pool.query(`SELECT * FROM notification_queue WHERE ${where} ORDER BY id LIMIT ${limit}`, params)
  const stats = { sent: 0, skipped: 0, failed: 0 }
  for (const row of rows.rows) {
    try {
      const status = await deliver(row)
      await pool.query(
        `UPDATE notification_queue SET status = $2, attempts = attempts + 1, sent_at = ${status === 'sent' ? 'NOW()' : 'NULL'},
           last_error = $3 WHERE id = $1`,
        [row.id, status, status === 'skipped' ? 'No provider configured for this channel' : null]
      )
      stats[status]++
    } catch (e) {
      const attempts = Number(row.attempts || 0) + 1
      await pool.query(`UPDATE notification_queue SET attempts = $2, status = $3, last_error = $4 WHERE id = $1`, [
        row.id, attempts, attempts >= 3 ? 'failed' : 'queued', String((e as Error)?.message || e).slice(0, 480),
      ])
      stats.failed++
    }
  }
  return stats
}

/** Queue due-soon and overdue installment reminders according to each centre's settings. */
export async function enqueueInstallmentReminders(opts: { centerId?: number | null } = {}) {
  const params: unknown[] = []
  let centreFilter = ''
  if (opts.centerId) {
    params.push(opts.centerId)
    centreFilter = ' AND spi.center_id = $1'
  }
  const rows = await pool.query(
    `SELECT spi.*, cm.title AS course_title, c.slug AS center_slug, c.name AS center_name,
            DATEDIFF(spi.due_date, CURRENT_DATE) AS days_left,
            (SELECT sfp.student_email FROM student_fee_payments sfp
              WHERE sfp.center_id = spi.center_id AND sfp.course_master_id = spi.course_master_id
                AND sfp.student_mobile = spi.student_mobile AND sfp.student_email IS NOT NULL
              ORDER BY sfp.id DESC LIMIT 1) AS student_email,
            (SELECT s.id FROM students s WHERE s.center_id = spi.center_id AND s.mobile = spi.student_mobile LIMIT 1) AS student_id
     FROM student_payment_installments spi
     JOIN centers c ON c.id = spi.center_id
     LEFT JOIN course_masters cm ON cm.id = spi.course_master_id
     WHERE spi.status IN ('unpaid', 'pending') AND spi.due_date IS NOT NULL${centreFilter}`,
    params
  )
  const settingsCache = new Map<number, Awaited<ReturnType<typeof getEnrollmentSettings>>>()
  const today = new Date().toISOString().slice(0, 10)
  let queued = 0
  for (const row of rows.rows) {
    const centerId = Number(row.center_id)
    if (!settingsCache.has(centerId)) settingsCache.set(centerId, await getEnrollmentSettings(centerId))
    const rem = settingsCache.get(centerId)!.reminders
    if (!rem.enabled) continue
    const daysLeft = Number(row.days_left)
    let kind: string | null = null
    if (daysLeft >= 0 && rem.days_before.includes(daysLeft)) kind = `due_in_${daysLeft}`
    else if (daysLeft < 0 && rem.overdue_every_days > 0 && Math.abs(daysLeft) % rem.overdue_every_days === 0) kind = 'overdue'
    else if (daysLeft === -1 && rem.overdue_every_days > 0) kind = 'overdue'
    if (!kind) continue
    const due = new Date(row.due_date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })
    const amount = `Rs.${Number(row.amount).toLocaleString('en-IN')}`
    const base = process.env.NEXT_PUBLIC_BASE_URL || ''
    const link = `${base}/${row.center_slug}/student/installments`
    const msg =
      kind === 'overdue'
        ? `${row.center_name}: Installment #${row.installment_no} of ${amount} for ${row.course_title || 'your course'} was due on ${due} and is overdue. Pay at ${link}`
        : `${row.center_name}: Installment #${row.installment_no} of ${amount} for ${row.course_title || 'your course'} is due on ${due}. Pay at ${link}`
    const key = `inst:${row.id}:${kind}:${today}`
    if (rem.channels.sms) queued += Number(await enqueueNotification({ centerId, channel: 'sms', recipient: row.student_mobile, body: msg, kind: 'installment_reminder', dedupeKey: `${key}:sms` }))
    if (rem.channels.whatsapp) queued += Number(await enqueueNotification({ centerId, channel: 'whatsapp', recipient: row.student_mobile, body: msg, kind: 'installment_reminder', dedupeKey: `${key}:wa` }))
    if (rem.channels.email && row.student_email) queued += Number(await enqueueNotification({ centerId, channel: 'email', recipient: row.student_email, subject: 'Installment reminder', body: msg, kind: 'installment_reminder', dedupeKey: `${key}:email` }))
    if (rem.channels.in_app && row.student_id) {
      const added = await enqueueNotification({ centerId, channel: 'in_app', recipient: String(row.student_id), body: msg, kind: 'installment_reminder', dedupeKey: `${key}:app` })
      if (added) {
        await pool.query(
          `INSERT INTO notifications (user_type, user_id, center_id, title, message, type, link_url) VALUES ($1,$2,$3,$4,$5,$6,$7)`,
          ['student', row.student_id, centerId, kind === 'overdue' ? 'Installment overdue' : 'Installment due soon', msg, 'warning', `/${row.center_slug}/student/installments`]
        ).catch(() => undefined)
        await pool.query(`UPDATE notification_queue SET status = 'sent', sent_at = NOW() WHERE dedupe_key = $1`, [`${key}:app`])
        queued++
      }
    }
  }
  return { candidates: rows.rows.length, queued }
}

export async function runReminderCycle(opts: { centerId?: number | null } = {}) {
  const enq = await enqueueInstallmentReminders(opts)
  const sent = await dispatchQueued({ centerId: opts.centerId, limit: 500 })
  return { ...enq, ...sent, providers: { sms: channelConfigured('sms'), whatsapp: channelConfigured('whatsapp'), email: channelConfigured('email') } }
}
