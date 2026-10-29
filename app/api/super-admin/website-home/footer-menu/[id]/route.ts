import { NextRequest, NextResponse } from 'next/server'
import pool from '@/lib/db'
import { verifySuperAdminAuth } from '@/lib/super-admin-auth'
import { revalidateWebsiteHomeChrome } from '@/lib/website-home-revalidate'

export const dynamic = 'force-dynamic'

type Params = { params: { id: string } }

export async function DELETE(_request: NextRequest, { params }: Params) {
  const auth = await verifySuperAdminAuth(_request)
  if (!auth.authorized) return NextResponse.json({ error: auth.error }, { status: 401 })

  await pool.query('DELETE FROM website_footer_menu_items WHERE id = $1', [Number(params.id)])
  revalidateWebsiteHomeChrome()
  return NextResponse.json({ success: true })
}
