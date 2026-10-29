import { NextResponse } from 'next/server'
import pool from '@/lib/db'

export const dynamic = 'force-dynamic'

export async function GET() {
  try {
    const result = await pool.query(
      `SELECT id, name, slug, address
       FROM centers
       WHERE is_active = true
       ORDER BY name`
    )
    const centers = result.rows.map((row) => ({
      id: row.id,
      name: row.name,
      slug: row.slug,
      address: row.address || null,
      city: extractCity(row.address),
    }))
    return NextResponse.json({ centers })
  } catch (error) {
    console.error('Public centers error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

function extractCity(address: string | null): string | null {
  if (!address?.trim()) return null
  const parts = address.split(',').map((p) => p.trim()).filter(Boolean)
  if (parts.length >= 2) return parts[parts.length - 2] || parts[0]
  return parts[0] || null
}
