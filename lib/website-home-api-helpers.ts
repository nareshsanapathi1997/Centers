import pool from '@/lib/db'
import type { WebsiteHomeFieldDef, WebsiteHomeResourceDef } from '@/lib/website-home-resource-registry'
import { buildWebsiteResultEntryPayload } from '@/lib/website-result-entry'

const UPDATABLE_SKIP = new Set(['id', 'created_at', 'updated_at'])

function coerceValue(field: WebsiteHomeFieldDef, raw: unknown): unknown {
  if (raw === undefined || raw === null || raw === '') {
    if (field.type === 'boolean') return false
    if (field.type === 'number') return 0
    return null
  }

  switch (field.type) {
    case 'boolean':
      return raw === true || raw === 'true' || raw === 1 || raw === '1'
    case 'number': {
      const n = Number(raw)
      if (!Number.isFinite(n)) return null
      return n
    }
    case 'string-list':
      if (Array.isArray(raw)) return raw.map(String).filter(Boolean)
      return String(raw)
        .split('\n')
        .map((s) => s.trim())
        .filter(Boolean)
    case 'select':
      if (field.key === 'is_notification') return raw === true || raw === 'true'
      return String(raw)
    default:
      return typeof raw === 'string' ? raw.trim() : raw
  }
}

export function buildInsertPayload(def: WebsiteHomeResourceDef, body: Record<string, unknown>) {
  const data: Record<string, unknown> = {}
  for (const field of def.fields) {
    if (body[field.key] !== undefined) {
      data[field.key] = coerceValue(field, body[field.key])
    }
  }
  return data
}

export function buildUpdatePayload(def: WebsiteHomeResourceDef, body: Record<string, unknown>) {
  const data: Record<string, unknown> = {}
  for (const field of def.fields) {
    if (body[field.key] !== undefined) {
      data[field.key] = coerceValue(field, body[field.key])
    }
  }
  return data
}

export async function listWebsiteResourceRows(def: WebsiteHomeResourceDef) {
  const orderBy = def.orderBy || 'display_order, id'
  const result = await pool.query(`SELECT * FROM ${def.table} ORDER BY ${orderBy}`)
  return result.rows
}

export async function getWebsiteResourceRow(def: WebsiteHomeResourceDef, id: number) {
  const result = await pool.query(`SELECT * FROM ${def.table} WHERE id = $1`, [id])
  return result.rows[0] ?? null
}

export async function createWebsiteResourceRow(def: WebsiteHomeResourceDef, body: Record<string, unknown>) {
  const data =
    def.slug === 'results' ? buildWebsiteResultEntryPayload(body) : buildInsertPayload(def, body)

  if (def.slug !== 'results') {
    for (const field of def.fields) {
      if (field.required && (data[field.key] == null || data[field.key] === '')) {
        throw new Error(`${field.label} is required`)
      }
    }
  }

  const keys = Object.keys(data)
  const values = Object.values(data)
  const placeholders = keys.map((_, i) => `$${i + 1}`)

  const result = await pool.query(
    `INSERT INTO ${def.table} (${keys.join(', ')}) VALUES (${placeholders.join(', ')}) RETURNING *`,
    values
  )
  return result.rows[0]
}

export async function updateWebsiteResourceRow(
  def: WebsiteHomeResourceDef,
  id: number,
  body: Record<string, unknown>
) {
  const data =
    def.slug === 'results'
      ? buildWebsiteResultEntryPayload({ ...body, id })
      : buildUpdatePayload(def, body)
  const keys = Object.keys(data).filter((k) => !UPDATABLE_SKIP.has(k))
  if (keys.length === 0) {
    return getWebsiteResourceRow(def, id)
  }

  const sets = keys.map((k, i) => `${k} = $${i + 2}`)
  const values = keys.map((k) => data[k])

  const result = await pool.query(
    `UPDATE ${def.table} SET ${sets.join(', ')}, updated_at = CURRENT_TIMESTAMP WHERE id = $1 RETURNING *`,
    [id, ...values]
  )
  return result.rows[0] ?? null
}

export async function deleteWebsiteResourceRow(def: WebsiteHomeResourceDef, id: number) {
  await pool.query(`DELETE FROM ${def.table} WHERE id = $1`, [id])
}

export async function upsertWebsiteSingleton(def: WebsiteHomeResourceDef, body: Record<string, unknown>) {
  const existing = await pool.query(`SELECT id FROM ${def.table} ORDER BY id LIMIT 1`)
  if (existing.rows[0]?.id) {
    return updateWebsiteResourceRow(def, Number(existing.rows[0].id), body)
  }
  return createWebsiteResourceRow(def, body)
}
