import { NextRequest, NextResponse } from 'next/server'
import pool from '@/lib/db'
import { verifySuperAdminAuth } from '@/lib/super-admin-auth'
import { revalidateWebsiteHomeChrome } from '@/lib/website-home-revalidate'

export const dynamic = 'force-dynamic'

type Params = { params: { id: string } }

export async function DELETE(_request: NextRequest, { params }: Params) {
  const auth = await verifySuperAdminAuth(_request)
  if (!auth.authorized) return NextResponse.json({ error: auth.error }, { status: 401 })

  const id = Number(params.id)
  if (!Number.isFinite(id)) {
    return NextResponse.json({ error: 'Invalid id' }, { status: 400 })
  }

  const result = await pool.query(
    'DELETE FROM website_header_menu_items WHERE id = $1 RETURNING id',
    [id]
  )
  if (!result.rows[0]) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }

  revalidateWebsiteHomeChrome()
  return NextResponse.json({ success: true, id: result.rows[0].id })
}
