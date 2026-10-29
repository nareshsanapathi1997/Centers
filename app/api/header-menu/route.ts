import { NextRequest, NextResponse } from 'next/server'
import pool from '@/lib/db'
import { buildHeaderMenuTree } from '@/lib/headerMenuTree'

export const dynamic = 'force-dynamic'

export const revalidate = 300

// Get active header menu items with hierarchy (public endpoint)
export async function GET(request: NextRequest) {
  try {
    const settingResult = await pool.query(
      "SELECT setting_value FROM global_settings WHERE setting_key = 'header_dropdown_enabled'",
    )

    const isEnabled = settingResult.rows[0]?.setting_value === 'true'

    if (!isEnabled) {
      return NextResponse.json(
        { enabled: false, items: [] },
        { headers: { 'Cache-Control': 'public, s-maxage=300, stale-while-revalidate=600' } },
      )
    }

    const result = await pool.query(
      'SELECT * FROM header_menu_items WHERE is_active = true ORDER BY display_order',
    )

    return NextResponse.json(
      { enabled: true, items: buildHeaderMenuTree(result.rows) },
      { headers: { 'Cache-Control': 'public, s-maxage=300, stale-while-revalidate=600' } },
    )
  } catch (error) {
    console.error('Error fetching header menu items:', error)
    return NextResponse.json(
      { enabled: false, items: [] },
      { headers: { 'Cache-Control': 'public, s-maxage=60' } },
    )
  }
}
