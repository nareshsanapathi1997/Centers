import { describe, expect, it } from 'vitest'
import { translate } from '@/lib/sql-translate'

const sql = (s: string, p: unknown[] = []) => translate(s, p).sql.replace(/\s+/g, ' ').trim()

describe('translate', () => {
  it('rewrites $n placeholders in order, repeating reused params', () => {
    const t = translate('SELECT * FROM a WHERE x = $2 AND y = $1 OR z = $2', [1, 'b'])
    expect(t.sql).toBe('SELECT * FROM a WHERE x = ? AND y = ? OR z = ?')
    expect(t.params).toEqual(['b', 1, 'b'])
  })

  it('leaves string literals untouched', () => {
    expect(sql("SELECT 'a::int $1 ILIKE' AS s, x::int FROM t")).toBe(
      "SELECT 'a::int $1 ILIKE' AS s, CAST(x AS SIGNED) FROM t"
    )
    expect(sql("SELECT 'it''s' FROM t WHERE y = $1", [1])).toBe("SELECT 'it''s' FROM t WHERE y = ?")
  })

  it('strips text-like casts and converts numeric/date casts', () => {
    expect(sql('SELECT COUNT(*)::int AS n, $1::text, created_at::date, AVG(p)::numeric(10,2) FROM t', ['a'])).toBe(
      'SELECT CAST(COUNT(*) AS SIGNED) AS n, ?, CAST(created_at AS DATE), CAST(AVG(p) AS DECIMAL(10,2)) FROM t'
    )
    expect(sql('SELECT data::jsonb, t.flag::boolean FROM t')).toBe('SELECT data, t.flag FROM t')
  })

  it('expands = ANY($n) arrays and handles empty arrays', () => {
    const t = translate('SELECT * FROM t WHERE id = ANY($1::int[])', [[1, 2, 3]])
    expect(t.sql).toBe('SELECT * FROM t WHERE id IN (?)')
    expect(t.params).toEqual([[1, 2, 3]])
    expect(sql('SELECT * FROM t WHERE id = ANY($1)', [[]])).toBe(
      'SELECT * FROM t WHERE id IN (SELECT NULL FROM DUAL WHERE 1=0)'
    )
    expect(sql('SELECT * FROM t WHERE id <> ALL($1)', [[4]])).toBe('SELECT * FROM t WHERE id NOT IN (?)')
  })

  it('serialises objects and arrays bound to ordinary params as JSON', () => {
    const t = translate('INSERT INTO t (meta, tags) VALUES ($1, $2)', [{ a: 1 }, ['x']])
    expect(t.params).toEqual(['{"a":1}', '["x"]'])
  })

  it('turns zoned ISO timestamps into Dates so they are stored in local time', () => {
    const iso = '2026-10-28T05:15:00.000Z'
    const [p] = translate('INSERT INTO t (ends_at) VALUES ($1)', [iso]).params
    expect(p).toBeInstanceOf(Date)
    expect((p as Date).getTime()).toBe(Date.parse(iso))
    expect(translate('SELECT $1', ['2026-10-28']).params).toEqual(['2026-10-28'])
  })

  it('coerces LIMIT/OFFSET params to numbers', () => {
    expect(translate('SELECT * FROM t LIMIT $1 OFFSET $2', ['10', '20']).params).toEqual([10, 20])
  })

  it('maps ILIKE, INTERVAL and RANDOM()', () => {
    expect(sql("SELECT * FROM t WHERE n ILIKE $1 AND c > NOW() - INTERVAL '30 days' ORDER BY RANDOM()", ['%a%'])).toBe(
      'SELECT * FROM t WHERE n LIKE ? AND c > NOW() - INTERVAL 30 DAY ORDER BY RAND()'
    )
  })

  it('rewrites aggregate FILTER clauses', () => {
    expect(
      sql("SELECT COUNT(*) FILTER (WHERE status = 'paid') AS paid, SUM(amount) FILTER (WHERE x > 1) AS s, COUNT(DISTINCT sid) FILTER (WHERE ok) AS d FROM p")
    ).toBe(
      "SELECT COUNT(CASE WHEN status = 'paid' THEN 1 END) AS paid, SUM(CASE WHEN x > 1 THEN amount END) AS s, COUNT(DISTINCT CASE WHEN ok THEN sid END) AS d FROM p"
    )
  })

  it('casts a FILTERed aggregate as a whole', () => {
    expect(sql("SELECT COUNT(*) FILTER (WHERE status = 'present')::int AS p FROM a")).toBe(
      "SELECT CAST(COUNT(CASE WHEN status = 'present' THEN 1 END) AS SIGNED) AS p FROM a"
    )
  })

  it('emulates NULLS FIRST/LAST', () => {
    expect(sql('SELECT * FROM t ORDER BY a.sort ASC NULLS LAST, b DESC NULLS LAST, c NULLS FIRST, d DESC NULLS FIRST')).toBe(
      'SELECT * FROM t ORDER BY a.sort IS NULL, a.sort ASC, b DESC, c ASC, d IS NULL DESC, d DESC'
    )
  })

  it('converts ON CONFLICT DO NOTHING to INSERT IGNORE', () => {
    expect(sql('INSERT INTO t (a) VALUES ($1) ON CONFLICT (a) DO NOTHING', [1])).toBe('INSERT IGNORE INTO t (a) VALUES (?)')
  })

  it('converts ON CONFLICT DO UPDATE to ON DUPLICATE KEY UPDATE', () => {
    const t = translate(
      'INSERT INTO s (k, v) VALUES ($1, $2) ON CONFLICT (k) DO UPDATE SET v = EXCLUDED.v, updated_at = NOW() RETURNING *',
      ['a', 'b']
    )
    expect(t.sql.replace(/\s+/g, ' ')).toBe(
      'INSERT INTO s (k, v) VALUES (?, ?) ON DUPLICATE KEY UPDATE v = VALUES(v), updated_at = NOW()'
    )
    expect(t).toMatchObject({ isUpsert: true, returning: '*', kind: 'insert', table: 's' })
  })

  it('rejects ON CONFLICT DO UPDATE with WHERE', () => {
    expect(() => translate('INSERT INTO s (k) VALUES (1) ON CONFLICT (k) DO UPDATE SET v = 1 WHERE s.v < 1')).toThrow(/not supported/)
  })

  it('extracts RETURNING and the UPDATE target/where for emulation', () => {
    const t = translate('UPDATE users u SET name = $1 WHERE u.id = $2 AND u.center_id = $3 RETURNING u.id, u.name', ['n', 5, 7])
    expect(t).toMatchObject({ kind: 'update', table: 'users', alias: 'u', returning: 'u.id, u.name' })
    expect(t.sql).toBe('UPDATE users u SET name = ? WHERE u.id = ? AND u.center_id = ?')
    expect(t.where).toEqual({ sql: 'u.id = ? AND u.center_id = ?', params: [5, 7] })
  })

  it('handles DELETE … RETURNING without alias', () => {
    const t = translate('DELETE FROM sessions WHERE token = $1 RETURNING id', ['x'])
    expect(t).toMatchObject({ kind: 'delete', table: 'sessions', alias: null, returning: 'id' })
    expect(t.where).toEqual({ sql: 'token = ?', params: ['x'] })
  })

  it('ignores RETURNING-like words inside subqueries and strings', () => {
    const t = translate("SELECT 'RETURNING' FROM t WHERE id IN (SELECT id FROM u)")
    expect(t.returning).toBeNull()
  })
})
