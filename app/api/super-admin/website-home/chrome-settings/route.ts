import { NextRequest, NextResponse } from 'next/server'
import pool from '@/lib/db'
import { verifySuperAdminAuth } from '@/lib/super-admin-auth'
import { WEBSITE_CHROME_SETTING_KEYS } from '@/lib/website-chrome-keys'
import { revalidateWebsiteHomeAll } from '@/lib/website-home-revalidate'

export const dynamic = 'force-dynamic'

export async function GET() {
  try {
    const result = await pool.query(
      `SELECT setting_key, setting_value FROM global_settings WHERE setting_key = ANY($1)`,
      [WEBSITE_CHROME_SETTING_KEYS]
    )
    const map = Object.fromEntries(result.rows.map((r) => [r.setting_key, r.setting_value]))
    return NextResponse.json(map)
  } catch (error) {
    console.error('website chrome GET:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function PUT(request: NextRequest) {
  const auth = await verifySuperAdminAuth(request)
  if (!auth.authorized) return NextResponse.json({ error: auth.error }, { status: 401 })

  try {
    const body = await request.json()
    for (const key of WEBSITE_CHROME_SETTING_KEYS) {
      if (!(key in body)) continue
      await pool.query(
        `INSERT INTO global_settings (setting_key, setting_value, description)
         VALUES ($1, $2, 'Website home chrome')
         ON CONFLICT (setting_key) DO UPDATE SET setting_value = EXCLUDED.setting_value, updated_at = CURRENT_TIMESTAMP`,
        [key, String(body[key] ?? '')]
      )
    }
    revalidateWebsiteHomeAll()
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('website chrome PUT:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
