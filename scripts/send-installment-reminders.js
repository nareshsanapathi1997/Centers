#!/usr/bin/env node
/**
 * Installment reminder cron: enqueues due/overdue reminders per centre settings
 * (Super Admin defaults + Centre overrides) and dispatches the notification queue.
 * Channels without provider keys are skipped (no-op), never fail the run.
 * Usage: npm run cron:installment-reminders  [--center=ID]
 * Schedule e.g. Windows Task Scheduler daily 09:00, or cron: 0 9 * * * npm run cron:installment-reminders
 */
const path = require('path')
const ROOT = path.join(__dirname, '..')
require('dotenv').config({ path: path.join(ROOT, '.env') })
require('./mysql/register-ts')
const { runReminderCycle } = require('../lib/notification-queue.ts')
const pool = require('../lib/db.ts').default

async function main() {
  const arg = process.argv.find((a) => a.startsWith('--center='))
  const centerId = arg ? Number(arg.split('=')[1]) : null
  const result = await runReminderCycle({ centerId: Number.isFinite(centerId) ? centerId : null })
  console.log(`[reminders] ${new Date().toISOString()}`, JSON.stringify(result))
}

main()
  .catch((err) => {
    console.error('[reminders] failed:', err && err.message ? err.message : err)
    process.exitCode = 1
  })
  .finally(async () => {
    try { if (pool && pool.end) await pool.end() } catch {}
  })
