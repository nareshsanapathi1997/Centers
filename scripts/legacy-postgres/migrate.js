#!/usr/bin/env node
require('dotenv').config()

const crypto = require('node:crypto')
const fs = require('node:fs')
const path = require('node:path')
const { Pool } = require('pg')

/**
 * Ordered, tracked migration runner.
 *
 * Schema changes used to live in ~30 ad-hoc `scripts/add-*.js` files, each with
 * its own npm script. Nothing recorded what had run, so the only way to know a
 * database's state was to inspect it, and a fresh environment required running
 * the right scripts in the right undocumented order.
 *
 * A migration is a file in `migrations/` named `NNNN_description.(sql|js)`:
 *   - `.sql` is executed as one statement batch
 *   - `.js` exports `up(client)` for anything needing branching or backfills
 *
 * Every migration runs inside a transaction, so a failure leaves nothing
 * half-applied. Use `-- migrate:no-transaction` on the first line (or export
 * `noTransaction = true`) for statements Postgres forbids in one, such as
 * CREATE INDEX CONCURRENTLY.
 *
 * Commands:
 *   node scripts/migrate.js            apply everything pending
 *   node scripts/migrate.js status     show applied/pending without changing anything
 *   node scripts/migrate.js baseline   record pending as applied WITHOUT running
 *                                      (for a database already in that state)
 *   node scripts/migrate.js create <name>   scaffold the next migration file
 */

const MIGRATIONS_DIR = path.join(__dirname, '..', 'migrations')
const FILENAME = /^(\d{4})_([a-z0-9_]+)\.(sql|js)$/

function listMigrations() {
  if (!fs.existsSync(MIGRATIONS_DIR)) return []

  const entries = fs.readdirSync(MIGRATIONS_DIR).filter((f) => f.endsWith('.sql') || f.endsWith('.js'))
  const migrations = []
  const unversioned = []

  for (const name of entries) {
    const match = name.match(FILENAME)
    if (!match) {
      unversioned.push(name)
      continue
    }
    const contents = fs.readFileSync(path.join(MIGRATIONS_DIR, name), 'utf8')
    migrations.push({
      version: match[1],
      name,
      kind: match[3],
      contents,
      // Normalised so a line-ending change alone does not look like a rewrite.
      checksum: crypto
        .createHash('sha256')
        .update(contents.replace(/\r\n/g, '\n'))
        .digest('hex'),
    })
  }

  if (unversioned.length) {
    console.warn(
      `\nIgnoring ${unversioned.length} file(s) in migrations/ that are not named NNNN_description.sql|js:`,
    )
    for (const name of unversioned) console.warn(`  ${name}`)
    console.warn('Rename them to bring them under version control.\n')
  }

  migrations.sort((a, b) => a.version.localeCompare(b.version))

  const seen = new Set()
  for (const migration of migrations) {
    if (seen.has(migration.version)) {
      throw new Error(
        `Duplicate migration version ${migration.version}; versions must be unique so ordering is deterministic.`,
      )
    }
    seen.add(migration.version)
  }

  return migrations
}

async function ensureTable(pool) {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS schema_migrations (
      version     VARCHAR(20) PRIMARY KEY,
      name        TEXT NOT NULL,
      checksum    CHAR(64) NOT NULL,
      applied_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
      duration_ms INTEGER NOT NULL DEFAULT 0
    )
  `)
}

async function getApplied(pool) {
  const result = await pool.query(
    'SELECT version, name, checksum, applied_at FROM schema_migrations ORDER BY version',
  )
  return new Map(result.rows.map((row) => [row.version, row]))
}

function wantsTransaction(migration) {
  if (migration.kind === 'sql') {
    return !migration.contents.startsWith('-- migrate:no-transaction')
  }
  const mod = require(path.join(MIGRATIONS_DIR, migration.name))
  return mod.noTransaction !== true
}

async function apply(pool, migration) {
  const useTransaction = wantsTransaction(migration)
  const client = await pool.connect()
  const startedAt = Date.now()

  try {
    if (useTransaction) await client.query('BEGIN')

    if (migration.kind === 'sql') {
      await client.query(migration.contents)
    } else {
      const mod = require(path.join(MIGRATIONS_DIR, migration.name))
      if (typeof mod.up !== 'function') {
        throw new Error(`${migration.name} must export an async up(client) function`)
      }
      await mod.up(client)
    }

    const duration = Date.now() - startedAt
    await client.query(
      `INSERT INTO schema_migrations (version, name, checksum, duration_ms)
       VALUES ($1, $2, $3, $4)`,
      [migration.version, migration.name, migration.checksum, duration],
    )

    if (useTransaction) await client.query('COMMIT')
    return duration
  } catch (error) {
    if (useTransaction) {
      await client.query('ROLLBACK').catch(() => {})
    }
    throw error
  } finally {
    client.release()
  }
}

function checkDrift(migrations, applied) {
  const drifted = migrations.filter(
    (m) => applied.has(m.version) && applied.get(m.version).checksum !== m.checksum,
  )
  if (!drifted.length) return

  console.warn('\nWARNING: these applied migrations have changed on disk:')
  for (const migration of drifted) {
    console.warn(`  ${migration.name}`)
  }
  console.warn(
    'Editing an applied migration means environments no longer match. Add a new migration instead.\n',
  )
}

/**
 * Apply every pending migration against an existing pool.
 * Used by `db:setup` so a fresh install ends at the same schema as production.
 * Returns the number of migrations applied.
 */
async function runPendingMigrations(pool, { quiet = false } = {}) {
  await ensureTable(pool)
  const migrations = listMigrations()
  const applied = await getApplied(pool)
  checkDrift(migrations, applied)

  const pending = migrations.filter((m) => !applied.has(m.version))
  if (!pending.length) {
    if (!quiet) console.log('Database is up to date.')
    return 0
  }

  for (const migration of pending) {
    if (!quiet) process.stdout.write(`  applying ${migration.name} ... `)
    const duration = await apply(pool, migration)
    if (!quiet) console.log(`${duration}ms`)
  }

  if (!quiet) console.log(`\nApplied ${pending.length} migration(s).`)
  return pending.length
}

async function main() {
  const [command = 'up', argument] = process.argv.slice(2)

  if (command === 'create') {
    if (!argument) {
      console.error('Usage: node scripts/migrate.js create <snake_case_name>')
      process.exitCode = 1
      return
    }
    const migrations = listMigrations()
    const next = String((Number(migrations.at(-1)?.version ?? 0) + 1)).padStart(4, '0')
    const slug = argument.toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_|_$/g, '')
    const file = path.join(MIGRATIONS_DIR, `${next}_${slug}.sql`)
    fs.writeFileSync(file, `-- ${slug.replace(/_/g, ' ')}\n\n`)
    console.log(`Created ${path.relative(path.join(__dirname, '..'), file)}`)
    return
  }

  if (!process.env.DATABASE_URL) {
    console.error('DATABASE_URL is not set. Copy .env.example to .env first.')
    process.exitCode = 1
    return
  }

  const pool = new Pool({ connectionString: process.env.DATABASE_URL })

  try {
    await ensureTable(pool)
    const migrations = listMigrations()
    const applied = await getApplied(pool)
    checkDrift(migrations, applied)

    const pending = migrations.filter((m) => !applied.has(m.version))

    if (command === 'status') {
      console.log('Applied:')
      for (const migration of migrations.filter((m) => applied.has(m.version))) {
        const row = applied.get(migration.version)
        console.log(`  ${migration.name}  (${new Date(row.applied_at).toISOString()})`)
      }
      // Rows with no file on disk usually mean a migration was deleted or a
      // branch is behind, both of which are worth surfacing.
      const orphaned = [...applied.values()].filter(
        (row) => !migrations.some((m) => m.version === row.version),
      )
      if (orphaned.length) {
        console.log('\nRecorded but missing from migrations/:')
        for (const row of orphaned) console.log(`  ${row.name}`)
      }
      console.log(`\nPending (${pending.length}):`)
      for (const migration of pending) console.log(`  ${migration.name}`)
      return
    }

    if (command === 'baseline') {
      if (!pending.length) {
        console.log('Database is up to date.')
        return
      }
      for (const migration of pending) {
        await pool.query(
          `INSERT INTO schema_migrations (version, name, checksum, duration_ms) VALUES ($1, $2, $3, 0)`,
          [migration.version, migration.name, migration.checksum],
        )
        console.log(`  baselined ${migration.name}`)
      }
      console.log(`\nRecorded ${pending.length} migration(s) as applied without running them.`)
      return
    }

    if (command !== 'up') {
      console.error(`Unknown command "${command}". Use up, status, baseline, or create.`)
      process.exitCode = 1
      return
    }

    await runPendingMigrations(pool)
  } catch (error) {
    console.error('\nMigration failed:', error.message)
    process.exitCode = 1
  } finally {
    await pool.end()
  }
}

module.exports = { runPendingMigrations, listMigrations, ensureTable }

if (require.main === module) {
  void main()
}
