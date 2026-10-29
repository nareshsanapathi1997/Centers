import { NextResponse } from 'next/server'

/**
 * Response helpers for route handlers.
 *
 * The failure shape is deliberately the existing `{ error: string }` that every
 * client page already reads, so these can be adopted route by route without a
 * coordinated front-end change. What they add is a consistent status code per
 * failure kind, an optional machine-readable `details` for field errors, and one
 * place that decides how much of an exception is safe to expose.
 */

export type ApiErrorBody = {
  error: string
  /** Field-level messages, keyed by input path. Present on validation failures. */
  details?: Record<string, string[]>
  /** Stable identifier for clients that need to branch on the failure. */
  code?: string
}

export function apiError(
  message: string,
  status: number,
  extra?: { details?: Record<string, string[]>; code?: string },
): NextResponse<ApiErrorBody> {
  return NextResponse.json({ error: message, ...extra }, { status })
}

export const badRequest = (message: string, details?: Record<string, string[]>) =>
  apiError(message, 400, details ? { details } : undefined)

export const unauthorized = (message = 'Unauthorized') => apiError(message, 401)

export const forbidden = (message = 'Forbidden') => apiError(message, 403)

export const notFound = (message = 'Not found') => apiError(message, 404)

export const conflict = (message: string) => apiError(message, 409)

/**
 * 500 handler. Logs the real error server-side and returns a generic message,
 * because exception text routinely contains SQL fragments, column names, and
 * connection details.
 */
export function serverError(context: string, error: unknown): NextResponse<ApiErrorBody> {
  console.error(`[${context}]`, error)
  return apiError('Internal server error', 500)
}

export type PageMeta = {
  page: number
  pageSize: number
  total: number
  totalPages: number
  hasMore: boolean
}

/**
 * Envelope for paginated list endpoints.
 *
 * List routes previously returned a bare array and the client sliced it, which
 * meant every row in a table was sent over the wire to render 25 of them.
 */
export function apiPage<T>(items: T[], meta: PageMeta) {
  return NextResponse.json({ items, pagination: meta })
}
