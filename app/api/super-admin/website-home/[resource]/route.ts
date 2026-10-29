import { NextRequest, NextResponse } from 'next/server'
import pool from '@/lib/db'
import { verifySuperAdminAuth } from '@/lib/super-admin-auth'
import { getWebsiteHomeResource } from '@/lib/website-home-resource-registry'
import {

  createWebsiteResourceRow,
  deleteWebsiteResourceRow,
  listWebsiteResourceRows,
  updateWebsiteResourceRow,
  upsertWebsiteSingleton,
} from '@/lib/website-home-api-helpers'
import { revalidateWebsiteHomeContent } from '@/lib/website-home-revalidate'

export const dynamic = 'force-dynamic'

type RouteParams = { params: { resource: string } }

export async function GET(_request: NextRequest, { params }: RouteParams) {
  const def = getWebsiteHomeResource(params.resource)
  if (!def) {
    return NextResponse.json({ error: 'Unknown resource' }, { status: 404 })
  }

  try {
    const rows = await listWebsiteResourceRows(def)
    return NextResponse.json(rows)
  } catch (error) {
    console.error('website-home GET error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function POST(request: NextRequest, { params }: RouteParams) {
  const auth = await verifySuperAdminAuth(request)
  if (!auth.authorized) {
    return NextResponse.json({ error: auth.error || 'Unauthorized' }, { status: 401 })
  }

  const def = getWebsiteHomeResource(params.resource)
  if (!def) {
    return NextResponse.json({ error: 'Unknown resource' }, { status: 404 })
  }

  try {
    const body = await request.json()
    const row = def.singleton
      ? await upsertWebsiteSingleton(def, body)
      : await createWebsiteResourceRow(def, body)
    revalidateWebsiteHomeContent()
    return NextResponse.json(row)
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Internal server error'
    return NextResponse.json({ error: message }, { status: 400 })
  }
}

export async function PATCH(request: NextRequest, { params }: RouteParams) {
  const auth = await verifySuperAdminAuth(request)
  if (!auth.authorized) {
    return NextResponse.json({ error: auth.error || 'Unauthorized' }, { status: 401 })
  }

  const def = getWebsiteHomeResource(params.resource)
  if (!def) {
    return NextResponse.json({ error: 'Unknown resource' }, { status: 404 })
  }

  try {
    const body = await request.json()
    if (def.singleton) {
      const row = await upsertWebsiteSingleton(def, body)
      revalidateWebsiteHomeContent()
      return NextResponse.json(row)
    }
    const id = Number(body.id)
    if (!Number.isFinite(id)) {
      return NextResponse.json({ error: 'id is required' }, { status: 400 })
    }
    const row = await updateWebsiteResourceRow(def, id, body)
    if (!row) return NextResponse.json({ error: 'Not found' }, { status: 404 })
    revalidateWebsiteHomeContent()
    return NextResponse.json(row)
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Internal server error'
    return NextResponse.json({ error: message }, { status: 400 })
  }
}
