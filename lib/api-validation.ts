import { NextRequest, NextResponse } from 'next/server'
import { z, type ZodType } from 'zod'
import { badRequest, type PageMeta } from './api-response'

/**
 * Zod-based input parsing for route handlers.
 *
 * Handlers previously read `await request.json()` and destructured it, so a
 * missing field became `undefined` in a SQL parameter and a wrong type became a
 * runtime error surfaced as a 500. Numeric ids arrived as strings and were
 * `parseInt`-ed inline, sometimes producing `NaN` that silently matched nothing.
 *
 * Both helpers return a discriminated result rather than throwing, so a handler
 * stays a straight line:
 *
 *   const parsed = await parseBody(request, CreateAlert)
 *   if (!parsed.ok) return parsed.response
 *   const { title } = parsed.data
 */

export type ParseResult<T> = { ok: true; data: T } | { ok: false; response: NextResponse }

function toDetails(error: z.ZodError): Record<string, string[]> {
  const details: Record<string, string[]> = {}
  for (const issue of error.issues) {
    const key = issue.path.length ? issue.path.join('.') : '_'
    ;(details[key] ??= []).push(issue.message)
  }
  return details
}

function firstMessage(error: z.ZodError): string {
  const issue = error.issues[0]
  if (!issue) return 'Invalid request'
  // Our own messages are full sentences; show them as-is to the student.
  if (/[.!?]$/.test(issue.message)) return issue.message
  const path = issue.path.join('.')
  const label = path ? path : ''
  return label ? `${label}: ${issue.message}` : issue.message
}

export async function parseBody<T>(
  request: NextRequest,
  schema: ZodType<T>,
): Promise<ParseResult<T>> {
  let raw: unknown
  try {
    raw = await request.json()
  } catch {
    return { ok: false, response: badRequest('Request body must be valid JSON') }
  }

  const result = schema.safeParse(raw)
  if (!result.success) {
    return {
      ok: false,
      response: badRequest(firstMessage(result.error), toDetails(result.error)),
    }
  }
  return { ok: true, data: result.data }
}

export function parseQuery<T>(request: NextRequest, schema: ZodType<T>): ParseResult<T> {
  // Repeated keys collapse to the last value, matching URLSearchParams.get().
  const raw = Object.fromEntries(request.nextUrl.searchParams.entries())
  const result = schema.safeParse(raw)

  if (!result.success) {
    return {
      ok: false,
      response: badRequest(firstMessage(result.error), toDetails(result.error)),
    }
  }
  return { ok: true, data: result.data }
}

/* ---------------------------------------------------------------- primitives */

/** Positive integer that also accepts the string form query params arrive as. */
export const idSchema = z.coerce.number().int().positive()

export const optionalIdSchema = z.coerce.number().int().positive().optional()

/**
 * Checkbox and select values arrive as 'true'/'false' strings from query
 * params but as real booleans from JSON bodies.
 */
export const booleanish = z
  .union([z.boolean(), z.enum(['true', 'false', '1', '0'])])
  .transform((value) => value === true || value === 'true' || value === '1')

/** Trimmed, non-empty string with an upper bound so a body cannot be unbounded. */
export const text = (max = 500) => z.string().trim().min(1).max(max)

export const optionalText = (max = 500) =>
  z
    .string()
    .trim()
    .max(max)
    .optional()
    // '' from an untouched form field means "not set", not "set to empty".
    .transform((value) => (value ? value : undefined))

export const centerIdQuery = z.object({ centerId: idSchema })

/* ---------------------------------------------------------------- pagination */

export const MAX_PAGE_SIZE = 200
export const DEFAULT_PAGE_SIZE = 25

/**
 * Pagination params, clamped so a client cannot request the whole table.
 *
 * Both `page`/`pageSize` and `limit`/`offset` are accepted because the existing
 * endpoints use both spellings.
 */
export const paginationQuery = z
  .object({
    page: z.coerce.number().int().min(1).optional(),
    pageSize: z.coerce.number().int().min(1).max(MAX_PAGE_SIZE).optional(),
    limit: z.coerce.number().int().min(1).max(MAX_PAGE_SIZE).optional(),
    offset: z.coerce.number().int().min(0).optional(),
  })
  .transform(({ page, pageSize, limit, offset }) => {
    const size = pageSize ?? limit ?? DEFAULT_PAGE_SIZE
    // An explicit offset wins, since a caller using it is paging by row.
    const resolvedPage = offset != null ? Math.floor(offset / size) + 1 : (page ?? 1)
    return {
      page: resolvedPage,
      pageSize: size,
      limit: size,
      offset: offset ?? (resolvedPage - 1) * size,
    }
  })

export type Pagination = z.infer<typeof paginationQuery>

export function pageMeta(pagination: Pagination, total: number): PageMeta {
  const totalPages = Math.max(1, Math.ceil(total / pagination.pageSize))
  return {
    page: pagination.page,
    pageSize: pagination.pageSize,
    total,
    totalPages,
    hasMore: pagination.offset + pagination.pageSize < total,
  }
}
