import { NextRequest, NextResponse } from 'next/server'
import pool from '@/lib/db'
import { verifySuperAdminAccess } from '@/lib/auth'

export const dynamic = 'force-dynamic'

async function requireSuperAdmin(request: NextRequest) {
  const auth = await verifySuperAdminAccess(request)
  if (!auth.isValid) {
    return NextResponse.json({ error: auth.error || 'Unauthorized' }, { status: 401 })
  }
  return null
}

// Get all global settings
export async function GET(request: NextRequest) {
  const denied = await requireSuperAdmin(request)
  if (denied) return denied

  try {
    const result = await pool.query(
      'SELECT * FROM global_settings ORDER BY setting_key'
    )
    return NextResponse.json(result.rows)
  } catch (error) {
    console.error('Error fetching global settings:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// Update a global setting
export async function PUT(request: NextRequest) {
  const denied = await requireSuperAdmin(request)
  if (denied) return denied

  try {
    const body = await request.json()
    const { setting_key, setting_value } = body

    if (!setting_key) {
      return NextResponse.json({ error: 'Setting key is required' }, { status: 400 })
    }

    const result = await pool.query(
      `UPDATE global_settings 
       SET setting_value = $1, updated_at = CURRENT_TIMESTAMP 
       WHERE setting_key = $2 
       RETURNING *`,
      [setting_value, setting_key]
    )

    if (result.rows.length === 0) {
      return NextResponse.json({ error: 'Setting not found' }, { status: 404 })
    }

    return NextResponse.json(result.rows[0])
  } catch (error) {
    console.error('Error updating global setting:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// Create a new global setting
export async function POST(request: NextRequest) {
  const denied = await requireSuperAdmin(request)
  if (denied) return denied

  try {
    const body = await request.json()
    const { setting_key, setting_value, setting_type, description } = body

    if (!setting_key) {
      return NextResponse.json({ error: 'Setting key is required' }, { status: 400 })
    }

    const result = await pool.query(
      `INSERT INTO global_settings (setting_key, setting_value, setting_type, description) 
       VALUES ($1, $2, $3, $4) 
       RETURNING *`,
      [setting_key, setting_value || '', setting_type || 'string', description || null]
    )

    return NextResponse.json(result.rows[0], { status: 201 })
  } catch (error: any) {
    console.error('Error creating global setting:', error)
    if (error.code === '23505') {
      return NextResponse.json({ error: 'Setting with this key already exists' }, { status: 400 })
    }
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
