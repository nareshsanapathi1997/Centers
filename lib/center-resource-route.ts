import { NextRequest, NextResponse } from 'next/server'
import { z, type ZodType } from 'zod'
import pool from './db'
import { getAdminToken, verifyAdminAccess } from './auth'
import { logActivity } from './activity-log'
import { applyApprovalWorkflow, resolveApprovalStatus } from './approval-settings'
import type { ApprovalSectionKey } from './approval-sections'
import { revalidateCenterArea, type CenterCacheArea } from './center-cache'
import { badRequest, forbidden, notFound, serverError, unauthorized } from './api-response'
import { idSchema, parseBody, parseQuery } from './api-validation'

/**
 * Route factory for the center-admin content resources.
 *
 * Roughly a dozen resources (alerts, CTA sliders, FAQs, gallery, news, …) had
 * two hand-written route files each that differed only in table name, column
 * list, and log label. The duplication is why fixes landed unevenly: cache
 * revalidation, tenant checks, and the "resolve center from the row before
 * authorising" ordering each had to be re-applied per file and were sometimes
 * missed.
 *
 * A descriptor states the table, its writable columns, and its cache areas; the
 * generated handlers own the parts that must not vary:
 *
 *   - the row's own `center_id` decides which center is authorised, never a
 *     client-supplied one, so an id from another tenant cannot be edited
 *   - only declared columns reach SQL, so an extra body key cannot write to an
 *     unintended column
 *   - every successful write revalidates the public cache and writes an audit
 *     log entry
 */

export type ResourceColumn = {
  /** Database column, also the body key. */
  name: string
  schema: ZodType
  /** Applied on create when the key is absent. */
  createDefault?: unknown
  /** Excluded from PATCH (e.g. a column only meaningful at creation). */
  immutable?: boolean
}

export type CenterResource = {
  table: string
  /** `entity_type` in the activity log; singular, snake_case. */
  entityType: string
  /** Human label used in error messages, e.g. 'Alert'. */
  label: string
  /** Column shown as `entity_name` in the audit log. */
  labelColumn: string
  columns: ResourceColumn[]
  cacheAreas: CenterCacheArea[]
  /** SQL fragment, without the ORDER BY keyword. */
  orderBy?: string
  /** Set when the resource participates in the super-admin approval workflow. */
  approvalSectionKey?: ApprovalSectionKey
}

/** Resolves the admin session and confirms it may write to `centerId`. */
async function authorize(request: NextRequest, centerId: number) {
  const token = getAdminToken(request)
  if (!token) return { ok: false as const, response: unauthorized('No token provided') }

  const auth = await verifyAdminAccess(token, centerId)
  if (!auth.authorized || !auth.adminId) {
    return { ok: false as const, response: forbidden(auth.error || 'Unauthorized') }
  }
  return { ok: true as const, adminId: auth.adminId }
}

function createSchema(resource: CenterResource) {
  const shape: Record<string, ZodType> = { center_id: idSchema }
  for (const column of resource.columns) {
    shape[column.name] =
      column.createDefault === undefined
        ? column.schema
        : column.schema.optional().default(column.createDefault as never)
  }
  // Unknown keys are dropped rather than rejected: the admin forms post whole
  // form state, including fields that are not columns.
  return z.object(shape)
}

function patchSchema(resource: CenterResource) {
  const shape: Record<string, ZodType> = {}
  for (const column of resource.columns) {
    if (column.immutable) continue
    shape[column.name] = column.schema.optional()
  }
  return z.object(shape)
}

async function loadOwner(resource: CenterResource, id: number) {
  const result = await pool.query(
    `SELECT center_id, ${resource.labelColumn} AS label FROM ${resource.table} WHERE id = $1`,
    [id],
  )
  return result.rows[0] as { center_id: number; label: string } | undefined
}

/** GET (list by center) and POST (create) for `/api/admin/<resource>`. */
export function createCenterCollectionRoute(resource: CenterResource) {
  const CreateBody = createSchema(resource)
  const orderBy = resource.orderBy ?? 'display_order, id'

  async function GET(request: NextRequest) {
    try {
      const parsed = parseQuery(request, z.object({ centerId: idSchema }))
      if (!parsed.ok) return parsed.response

      const result = await pool.query(
        `SELECT * FROM ${resource.table} WHERE center_id = $1 ORDER BY ${orderBy}`,
        [parsed.data.centerId],
      )
      return NextResponse.json(result.rows)
    } catch (error) {
      return serverError(`${resource.table}:list`, error)
    }
  }

  async function POST(request: NextRequest) {
    try {
      const parsed = await parseBody(request, CreateBody)
      if (!parsed.ok) return parsed.response

      const body = parsed.data as Record<string, unknown>
      const centerId = body.center_id as number

      const auth = await authorize(request, centerId)
      if (!auth.ok) return auth.response

      const columns = ['center_id']
      const values: unknown[] = [centerId]

      for (const column of resource.columns) {
        if (body[column.name] === undefined) continue
        columns.push(column.name)
        values.push(body[column.name])
      }

      if (resource.approvalSectionKey) {
        columns.push('approval_status')
        values.push(
          await applyApprovalWorkflow({
            sectionKey: resource.approvalSectionKey,
            title: String(body[resource.labelColumn] ?? resource.label),
            centerId,
          }),
        )
      }

      const placeholders = values.map((_, index) => `$${index + 1}`).join(', ')
      const result = await pool.query(
        `INSERT INTO ${resource.table} (${columns.join(', ')}) VALUES (${placeholders}) RETURNING *`,
        values,
      )
      const created = result.rows[0]

      revalidateCenterArea(centerId, ...resource.cacheAreas)

      await logActivity(
        {
          user_type: 'admin',
          user_id: auth.adminId,
          center_id: centerId,
          action: 'create',
          entity_type: resource.entityType,
          entity_id: created.id,
          entity_name: String(created[resource.labelColumn] ?? resource.label).slice(0, 120),
        },
        request,
      )

      return NextResponse.json(created, { status: 201 })
    } catch (error) {
      return serverError(`${resource.table}:create`, error)
    }
  }

  return { GET, POST }
}

/** GET, PATCH, and DELETE for `/api/admin/<resource>/[id]`. */
export function createCenterItemRoute(resource: CenterResource) {
  const PatchBody = patchSchema(resource)

  type Context = { params: { id: string } }

  function parseId(context: Context) {
    const id = Number(context.params.id)
    return Number.isInteger(id) && id > 0 ? id : null
  }

  async function GET(_request: NextRequest, context: Context) {
    try {
      const id = parseId(context)
      if (!id) return badRequest('Invalid id')

      const result = await pool.query(`SELECT * FROM ${resource.table} WHERE id = $1`, [id])
      if (result.rows.length === 0) return notFound(`${resource.label} not found`)

      return NextResponse.json(result.rows[0])
    } catch (error) {
      return serverError(`${resource.table}:get`, error)
    }
  }

  async function PATCH(request: NextRequest, context: Context) {
    try {
      const id = parseId(context)
      if (!id) return badRequest('Invalid id')

      const parsed = await parseBody(request, PatchBody)
      if (!parsed.ok) return parsed.response
      const body = parsed.data as Record<string, unknown>

      // The stored row decides the center, so the caller cannot redirect the
      // authorisation check at a center they do have access to.
      const existing = await loadOwner(resource, id)
      if (!existing) return notFound(`${resource.label} not found`)

      const auth = await authorize(request, existing.center_id)
      if (!auth.ok) return auth.response

      const assignments: string[] = []
      const values: unknown[] = []

      for (const column of resource.columns) {
        if (column.immutable || body[column.name] === undefined) continue
        values.push(body[column.name])
        assignments.push(`${column.name} = $${values.length}`)
      }

      if (assignments.length === 0) return badRequest('No fields to update')

      const approvalStatus = resource.approvalSectionKey
        ? await resolveApprovalStatus(resource.approvalSectionKey)
        : null

      if (approvalStatus) {
        values.push(approvalStatus)
        assignments.push(`approval_status = $${values.length}`)
      }

      assignments.push('updated_at = CURRENT_TIMESTAMP')
      values.push(id)

      const result = await pool.query(
        `UPDATE ${resource.table} SET ${assignments.join(', ')} WHERE id = $${values.length} RETURNING *`,
        values,
      )
      const updated = result.rows[0]

      revalidateCenterArea(existing.center_id, ...resource.cacheAreas)

      // Editing an approved item sends it back for review, which needs a new
      // approval request rather than just the status column.
      if (approvalStatus === 'pending' && resource.approvalSectionKey) {
        await applyApprovalWorkflow({
          sectionKey: resource.approvalSectionKey,
          title: String(updated[resource.labelColumn] ?? resource.label),
          centerId: existing.center_id,
        })
      }

      await logActivity(
        {
          user_type: 'admin',
          user_id: auth.adminId,
          center_id: existing.center_id,
          action: 'update',
          entity_type: resource.entityType,
          entity_id: id,
          entity_name: String(updated[resource.labelColumn] ?? resource.label).slice(0, 120),
        },
        request,
      )

      return NextResponse.json(updated)
    } catch (error) {
      return serverError(`${resource.table}:update`, error)
    }
  }

  async function DELETE(request: NextRequest, context: Context) {
    try {
      const id = parseId(context)
      if (!id) return badRequest('Invalid id')

      const existing = await loadOwner(resource, id)
      if (!existing) return notFound(`${resource.label} not found`)

      const auth = await authorize(request, existing.center_id)
      if (!auth.ok) return auth.response

      await pool.query(`DELETE FROM ${resource.table} WHERE id = $1`, [id])

      revalidateCenterArea(existing.center_id, ...resource.cacheAreas)

      await logActivity(
        {
          user_type: 'admin',
          user_id: auth.adminId,
          center_id: existing.center_id,
          action: 'delete',
          entity_type: resource.entityType,
          entity_id: id,
          entity_name: String(existing.label ?? resource.label).slice(0, 120),
        },
        request,
      )

      return NextResponse.json({ success: true })
    } catch (error) {
      return serverError(`${resource.table}:delete`, error)
    }
  }

  return { GET, PATCH, DELETE }
}

/* --------------------------------------------------------- shared column bits */

export const displayOrderColumn: ResourceColumn = {
  name: 'display_order',
  schema: z.coerce.number().int().min(0),
  createDefault: 0,
}

export const isActiveColumn: ResourceColumn = {
  name: 'is_active',
  schema: z.coerce.boolean(),
  createDefault: true,
}

/** Optional free-text column that stores NULL rather than '' when cleared. */
export function nullableText(name: string, max = 2000): ResourceColumn {
  return {
    name,
    schema: z
      .string()
      .trim()
      .max(max)
      .nullish()
      .transform((value) => value || null),
    createDefault: null,
  }
}
