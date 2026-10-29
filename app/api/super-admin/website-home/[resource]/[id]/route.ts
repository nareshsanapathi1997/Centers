import { NextRequest, NextResponse } from 'next/server'
import { verifySuperAdminAuth } from '@/lib/super-admin-auth'
import { getWebsiteHomeResource } from '@/lib/website-home-resource-registry'
import { deleteWebsiteResourceRow, updateWebsiteResourceRow } from '@/lib/website-home-api-helpers'
import { revalidateWebsiteHomeContent } from '@/lib/website-home-revalidate'

export const dynamic = 'force-dynamic'

type RouteParams = { params: { resource: string; id: string } }

export async function PATCH(request: NextRequest, { params }: RouteParams) {
  const auth = await verifySuperAdminAuth(request)
  if (!auth.authorized) {
    return NextResponse.json({ error: auth.error || 'Unauthorized' }, { status: 401 })
  }

  const def = getWebsiteHomeResource(params.resource)
  if (!def || def.singleton) {
    return NextResponse.json({ error: 'Unknown resource' }, { status: 404 })
  }

  try {
    const body = await request.json()
    const id = Number(params.id)
    const row = await updateWebsiteResourceRow(def, id, body)
    if (!row) return NextResponse.json({ error: 'Not found' }, { status: 404 })
    revalidateWebsiteHomeContent()
    return NextResponse.json(row)
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Internal server error'
    return NextResponse.json({ error: message }, { status: 400 })
  }
}

export async function DELETE(request: NextRequest, { params }: RouteParams) {
  const auth = await verifySuperAdminAuth(request)
  if (!auth.authorized) {
    return NextResponse.json({ error: auth.error || 'Unauthorized' }, { status: 401 })
  }

  const def = getWebsiteHomeResource(params.resource)
  if (!def || def.singleton) {
    return NextResponse.json({ error: 'Unknown resource' }, { status: 404 })
  }

  try {
    await deleteWebsiteResourceRow(def, Number(params.id))
    revalidateWebsiteHomeContent()
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('website-home DELETE error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
