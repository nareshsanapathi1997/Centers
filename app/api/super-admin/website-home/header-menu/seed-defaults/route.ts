import { NextRequest, NextResponse } from 'next/server'
import pool from '@/lib/db'
import { verifySuperAdminAuth } from '@/lib/super-admin-auth'
import { revalidateWebsiteHomeChrome } from '@/lib/website-home-revalidate'
import { runWebsiteHeaderMenuSeed } from '@/lib/seed-website-header-menu'

export const dynamic = 'force-dynamic'

export async function POST(request: NextRequest) {
  const auth = await verifySuperAdminAuth(request)
  if (!auth.authorized) return NextResponse.json({ error: auth.error }, { status: 401 })

  const client = await pool.connect()
  try {
    await runWebsiteHeaderMenuSeed(client, { reset: true })
    revalidateWebsiteHomeChrome()
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('website header menu seed-defaults:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  } finally {
    client.release()
  }
}
