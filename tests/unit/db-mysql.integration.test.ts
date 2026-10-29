/**
 * Exercises lib/db.ts against a real MySQL/MariaDB with the schema loaded.
 * Skipped unless run via `npm run test:db` (or with DB_INTEGRATION=1).
 */
import 'dotenv/config'
import { afterAll, describe, expect, it } from 'vitest'

const enabled = process.env.DB_INTEGRATION === '1' || process.env.npm_lifecycle_event === 'test:db'
const SLUG = '__itest_center'

describe.skipIf(!enabled)('lib/db (MySQL adapter)', async () => {
  const { default: pool } = enabled ? await import('@/lib/db') : ({} as typeof import('@/lib/db'))

  afterAll(async () => {
    await pool.query('DELETE FROM centers WHERE slug LIKE $1', [`${SLUG}%`])
    await pool.query("DELETE FROM global_settings WHERE setting_key = '__itest_key'")
    await pool.end()
  })

  it('INSERT … RETURNING * returns the row with parsed JSON and booleans', async () => {
    const { rows, rowCount } = await pool.query(
      'INSERT INTO centers (slug, name, phone, google_rating, is_active) VALUES ($1, $2, $3, $4, $5) RETURNING *',
      [SLUG, 'Test Centre', ['+91 90000 00000'], 4.5, true]
    )
    expect(rowCount).toBe(1)
    expect(rows[0]).toMatchObject({ slug: SLUG, name: 'Test Centre', phone: ['+91 90000 00000'], google_rating: 4.5, is_active: true })
    expect(rows[0].id).toBeTypeOf('number')
    expect(rows[0].created_at).toBeInstanceOf(Date)
  })

  it('maps duplicate keys to SQLSTATE 23505', async () => {
    await expect(pool.query('INSERT INTO centers (slug, name) VALUES ($1, $2)', [SLUG, 'dup'])).rejects.toMatchObject({
      code: '23505',
      constraint: 'centers_slug_key',
    })
  })

  it('UPDATE … RETURNING returns post-update values, aliases included', async () => {
    const { rows } = await pool.query(
      'UPDATE centers c SET name = $1, is_active = $2 WHERE c.slug = $3 RETURNING c.id, c.name, c.is_active',
      ['Renamed', false, SLUG]
    )
    expect(rows).toEqual([{ id: expect.any(Number), name: 'Renamed', is_active: false }])
  })

  it('supports ILIKE, ::int casts, FILTER and = ANY()', async () => {
    const { rows } = await pool.query(
      `SELECT COUNT(*)::int AS total, COUNT(*) FILTER (WHERE is_active) AS active
         FROM centers WHERE name ILIKE $1 AND slug = ANY($2)`,
      ['%RENAMED%', [SLUG, 'nope']]
    )
    expect(rows[0]).toEqual({ total: 1, active: 0 })
  })

  it('ON CONFLICT DO UPDATE … RETURNING returns the upserted row both times', async () => {
    const upsert = `INSERT INTO global_settings (setting_key, setting_value) VALUES ($1, $2)
      ON CONFLICT (setting_key) DO UPDATE SET setting_value = EXCLUDED.setting_value RETURNING id, setting_value`
    const a = await pool.query(upsert, ['__itest_key', 'one'])
    const b = await pool.query(upsert, ['__itest_key', 'two'])
    expect(b.rows[0]).toEqual({ id: a.rows[0].id, setting_value: 'two' })
  })

  it('ON CONFLICT DO NOTHING … RETURNING returns no rows on conflict', async () => {
    const r = await pool.query(
      'INSERT INTO centers (slug, name) VALUES ($1, $2) ON CONFLICT (slug) DO NOTHING RETURNING id',
      [SLUG, 'x']
    )
    expect(r).toEqual({ rows: [], rowCount: 0 })
  })

  it('transactions via connect() roll back', async () => {
    const client = await pool.connect()
    try {
      await client.query('BEGIN')
      await client.query('INSERT INTO centers (slug, name) VALUES ($1, $2) RETURNING id', [`${SLUG}_tx`, 'tx'])
      await client.query('ROLLBACK')
    } finally {
      client.release()
    }
    const { rowCount } = await pool.query('SELECT 1 FROM centers WHERE slug = $1', [`${SLUG}_tx`])
    expect(rowCount).toBe(0)
  })

  it('DELETE … RETURNING returns the deleted rows', async () => {
    const { rows } = await pool.query('DELETE FROM centers WHERE slug = $1 RETURNING slug', [SLUG])
    expect(rows).toEqual([{ slug: SLUG }])
  })

  it('|| concatenates strings (PIPES_AS_CONCAT)', async () => {
    const { rows } = await pool.query("SELECT 'a' || $1 || 'c' AS s", ['b'])
    expect(rows[0].s).toBe('abc')
  })
})
