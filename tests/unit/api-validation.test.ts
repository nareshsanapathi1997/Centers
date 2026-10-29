import { describe, expect, it } from 'vitest'
import { NextRequest } from 'next/server'
import { z } from 'zod'
import {
  DEFAULT_PAGE_SIZE,
  MAX_PAGE_SIZE,
  booleanish,
  idSchema,
  pageMeta,
  paginationQuery,
  parseBody,
  parseQuery,
} from '@/lib/api-validation'

function request(url: string, init?: RequestInit) {
  return new NextRequest(new Request(`http://localhost${url}`, init))
}

describe('paginationQuery', () => {
  it('defaults to page 1 with the default page size', () => {
    const result = paginationQuery.parse({})
    expect(result).toEqual({
      page: 1,
      pageSize: DEFAULT_PAGE_SIZE,
      limit: DEFAULT_PAGE_SIZE,
      offset: 0,
    })
  })

  it('derives offset from page and pageSize', () => {
    expect(paginationQuery.parse({ page: '3', pageSize: '10' })).toMatchObject({
      page: 3,
      offset: 20,
      limit: 10,
    })
  })

  it('derives the page number when only an offset is given', () => {
    expect(paginationQuery.parse({ offset: '50', limit: '25' })).toMatchObject({
      page: 3,
      offset: 50,
    })
  })

  it('rejects a page size above the cap so a client cannot request a whole table', () => {
    expect(paginationQuery.safeParse({ pageSize: String(MAX_PAGE_SIZE + 1) }).success).toBe(false)
    expect(paginationQuery.safeParse({ limit: '100000' }).success).toBe(false)
  })

  it('rejects a zero or negative page', () => {
    expect(paginationQuery.safeParse({ page: '0' }).success).toBe(false)
    expect(paginationQuery.safeParse({ page: '-2' }).success).toBe(false)
  })
})

describe('pageMeta', () => {
  it('reports totalPages and hasMore for a middle page', () => {
    const pagination = paginationQuery.parse({ page: '2', pageSize: '10' })
    expect(pageMeta(pagination, 35)).toEqual({
      page: 2,
      pageSize: 10,
      total: 35,
      totalPages: 4,
      hasMore: true,
    })
  })

  it('reports no more pages on the last page', () => {
    const pagination = paginationQuery.parse({ page: '4', pageSize: '10' })
    expect(pageMeta(pagination, 35).hasMore).toBe(false)
  })

  it('reports one page when there are no rows, so a pager is never blank', () => {
    expect(pageMeta(paginationQuery.parse({}), 0).totalPages).toBe(1)
  })
})

describe('idSchema', () => {
  it('coerces the string form that query params arrive as', () => {
    expect(idSchema.parse('42')).toBe(42)
  })

  it.each(['0', '-1', '1.5', 'abc', ''])('rejects %j', (value) => {
    expect(idSchema.safeParse(value).success).toBe(false)
  })
})

describe('booleanish', () => {
  it.each([
    [true, true],
    [false, false],
    ['true', true],
    ['false', false],
    ['1', true],
    ['0', false],
  ])('maps %j to %j', (input, expected) => {
    expect(booleanish.parse(input)).toBe(expected)
  })

  it('rejects a value that is neither', () => {
    expect(booleanish.safeParse('yes').success).toBe(false)
  })
})

describe('parseBody', () => {
  const Schema = z.object({ name: z.string().min(1), age: z.coerce.number().int() })

  it('returns parsed data for a valid body', async () => {
    const result = await parseBody(
      request('/x', { method: 'POST', body: JSON.stringify({ name: 'a', age: '3' }) }),
      Schema,
    )
    expect(result).toEqual({ ok: true, data: { name: 'a', age: 3 } })
  })

  it('returns a 400 for malformed JSON rather than throwing', async () => {
    const result = await parseBody(request('/x', { method: 'POST', body: '{oops' }), Schema)
    expect(result.ok).toBe(false)
    if (result.ok) return
    expect(result.response.status).toBe(400)
    await expect(result.response.json()).resolves.toMatchObject({
      error: 'Request body must be valid JSON',
    })
  })

  it('reports field errors keyed by path', async () => {
    const result = await parseBody(
      request('/x', { method: 'POST', body: JSON.stringify({ name: '', age: 'no' }) }),
      Schema,
    )
    expect(result.ok).toBe(false)
    if (result.ok) return

    const body = await result.response.json()
    expect(Object.keys(body.details)).toEqual(expect.arrayContaining(['name', 'age']))
  })

  it('drops keys that are not in the schema so they cannot reach SQL', async () => {
    const result = await parseBody(
      request('/x', {
        method: 'POST',
        body: JSON.stringify({ name: 'a', age: 1, is_admin: true }),
      }),
      Schema,
    )
    expect(result.ok).toBe(true)
    if (!result.ok) return
    expect(result.data).not.toHaveProperty('is_admin')
  })
})

describe('parseQuery', () => {
  it('parses search params', () => {
    const result = parseQuery(request('/x?centerId=7'), z.object({ centerId: idSchema }))
    expect(result).toEqual({ ok: true, data: { centerId: 7 } })
  })

  it('returns a 400 naming the offending param', async () => {
    const result = parseQuery(request('/x?centerId=abc'), z.object({ centerId: idSchema }))
    expect(result.ok).toBe(false)
    if (result.ok) return

    expect(result.response.status).toBe(400)
    const body = await result.response.json()
    expect(body.error).toContain('centerId')
  })
})
