import { NextRequest, NextResponse } from 'next/server'
import pool from '@/lib/db'
import { verifySuperAdminAuth } from '@/lib/super-admin-auth'
import { getWebsiteSectionConfigs } from '@/lib/website-home-db'
import { buildWebsiteHeaderNavItems } from '@/lib/website-header-nav'
import { revalidateWebsiteHomeChrome } from '@/lib/website-home-revalidate'

export const dynamic = 'force-dynamic'

export async function POST(request: NextRequest) {
  const auth = await verifySuperAdminAuth(request)
  if (!auth.authorized) return NextResponse.json({ error: auth.error }, { status: 401 })

  try {
    const configs = await getWebsiteSectionConfigs()
    const items = buildWebsiteHeaderNavItems(configs)

    await pool.query('DELETE FROM website_main_nav_items')

    for (let i = 0; i < items.length; i += 1) {
      const item = items[i]
      await pool.query(
        `INSERT INTO website_main_nav_items (label, href, display_order, is_active)
         VALUES ($1, $2, $3, true)`,
        [item.label, item.href, i + 1]
      )
    }

    revalidateWebsiteHomeChrome()

    const result = await pool.query(
      'SELECT * FROM website_main_nav_items ORDER BY display_order, id'
    )
    return NextResponse.json({ success: true, items: result.rows })
  } catch (error) {
    console.error('website main nav sync:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
