import { NextRequest, NextResponse } from 'next/server'
import pool from '@/lib/db'
import { verifySuperAdminAuth } from '@/lib/super-admin-auth'

export const dynamic = 'force-dynamic'

// Get a single center
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const authResult = await verifySuperAdminAuth(request)
    if (!authResult.authorized) {
      return NextResponse.json(
        { error: authResult.error || 'Unauthorized' },
        { status: 403 }
      )
    }

    const id = parseInt(params.id)
    const result = await pool.query('SELECT * FROM centers WHERE id = $1', [id])
    
    if (result.rows.length === 0) {
      return NextResponse.json({ error: 'Center not found' }, { status: 404 })
    }

    const center = result.rows[0]
    let nearby_host_center_id: number | null = null
    try {
      const nearbyRes = await pool.query(
        `SELECT center_id FROM nearby_centers WHERE nearby_center_id = $1 ORDER BY display_order ASC LIMIT 1`,
        [id]
      )
      nearby_host_center_id = nearbyRes.rows[0]?.center_id ?? null
    } catch (e: any) {
      if (e.code !== '42P01') throw e
    }

    const list_on_nearby_host =
      !center.is_active && nearby_host_center_id != null

    return NextResponse.json({
      ...center,
      nearby_host_center_id,
      list_on_nearby_host,
    })
  } catch (error) {
    console.error('Error fetching center:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// Update a center
export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const id = parseInt(params.id)
    const beforeRow = await pool.query('SELECT is_active FROM centers WHERE id = $1', [id])
    if (beforeRow.rows.length === 0) {
      return NextResponse.json({ error: 'Center not found' }, { status: 404 })
    }
    const wasInactive = beforeRow.rows[0].is_active === false

    const body = await request.json()
    const {
      slug, name, description, phone, email, address, google_rating, google_rating_url,
      map_embed_url, logo_url, logo_dark_url, favicon_url, center_image_url, social_facebook,
      social_twitter, social_instagram, social_linkedin, social_whatsapp,
      social_telegram, working_hours, is_active,
      list_on_nearby_host,
      nearby_host_center_id,
    } = body

    // Check if slug is being changed and if it already exists
    if (slug) {
      const existingCenter = await pool.query(
        'SELECT id FROM centers WHERE slug = $1 AND id != $2',
        [slug, id]
      )
      if (existingCenter.rows.length > 0) {
        return NextResponse.json({ error: 'Center with this slug already exists' }, { status: 400 })
      }
    }

    // Convert phone to array format if it's a string
    let phoneArray = undefined
    if (phone !== undefined && phone !== null) {
      if (Array.isArray(phone)) {
        phoneArray = phone
      } else if (typeof phone === 'string') {
        // Handle comma-separated string or single phone number
        phoneArray = phone.split(',').map(p => p.trim()).filter(p => p.length > 0)
        if (phoneArray.length === 0) {
          phoneArray = null
        }
      }
    }

    const result = await pool.query(
      `UPDATE centers 
       SET slug = COALESCE($1, slug), name = COALESCE($2, name), description = $3, phone = COALESCE($4, phone), email = $5, address = $6,
           google_rating = $7, google_rating_url = $8, map_embed_url = $9,
           logo_url = $10, logo_dark_url = $11, favicon_url = $12, center_image_url = $13,
           social_facebook = $14, social_twitter = $15, social_instagram = $16,
           social_linkedin = $17, social_whatsapp = $18, social_telegram = $19,
           working_hours = $20, is_active = COALESCE($21, is_active), updated_at = CURRENT_TIMESTAMP
       WHERE id = $22
       RETURNING *`,
      [
        slug || null, name || null, description || null, phoneArray, email || null, address || null,
        google_rating || null, google_rating_url || null, map_embed_url || null,
        logo_url || null, logo_dark_url || null, favicon_url || null, center_image_url || null,
        social_facebook || null, social_twitter || null, social_instagram || null,
        social_linkedin || null, social_whatsapp || null, social_telegram || null,
        working_hours || null, is_active !== undefined ? is_active : null, id
      ]
    )

    if (result.rows.length === 0) {
      return NextResponse.json({ error: 'Center not found' }, { status: 404 })
    }

    const updated = result.rows[0]

    const syncNearby =
      list_on_nearby_host !== undefined || nearby_host_center_id !== undefined

    if (syncNearby) {
      try {
        const wantList =
          list_on_nearby_host === true &&
          !updated.is_active &&
          nearby_host_center_id != null &&
          nearby_host_center_id !== ''

        if (updated.is_active && wasInactive) {
          await pool.query('DELETE FROM nearby_centers WHERE nearby_center_id = $1', [id])
        } else if (list_on_nearby_host === true && !updated.is_active && !wantList) {
          return NextResponse.json(
            { error: 'Select an active host center to show this center on its Our Centers list' },
            { status: 400 }
          )
        } else if (wantList) {
          const hostId = parseInt(String(nearby_host_center_id), 10)
          if (!Number.isFinite(hostId) || hostId === id) {
            return NextResponse.json(
              { error: 'Invalid host center for Our Centers listing' },
              { status: 400 }
            )
          }
          const host = await pool.query(
            'SELECT id FROM centers WHERE id = $1 AND is_active = true',
            [hostId]
          )
          if (host.rows.length === 0) {
            return NextResponse.json(
              { error: 'Host center must be an active center' },
              { status: 400 }
            )
          }
          await pool.query('DELETE FROM nearby_centers WHERE nearby_center_id = $1', [id])
          const orderResult = await pool.query(
            'SELECT COALESCE(MAX(display_order), -1) + 1 AS next_order FROM nearby_centers WHERE center_id = $1',
            [hostId]
          )
          const nextOrder = orderResult.rows[0]?.next_order ?? 0
          await pool.query(
            `INSERT INTO nearby_centers (center_id, nearby_center_id, display_order)
             VALUES ($1, $2, $3)
             ON CONFLICT (center_id, nearby_center_id) DO NOTHING`,
            [hostId, id, nextOrder]
          )
        } else if (list_on_nearby_host === false && !updated.is_active) {
          await pool.query('DELETE FROM nearby_centers WHERE nearby_center_id = $1', [id])
        }
      } catch (e: any) {
        if (e.code === '42P01') {
          console.warn('nearby_centers table missing; skipping nearby listing sync')
        } else {
          throw e
        }
      }
    }

    return NextResponse.json(updated)
  } catch (error: any) {
    console.error('Error updating center:', error)
    if (error.code === '23505') {
      return NextResponse.json({ error: 'Center with this slug already exists' }, { status: 400 })
    }
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// Delete a center
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const authResult = await verifySuperAdminAuth(request)
    if (!authResult.authorized) {
      return NextResponse.json(
        { error: authResult.error || 'Unauthorized' },
        { status: 403 }
      )
    }

    const id = parseInt(params.id)
    
    // Check if center exists
    const centerCheck = await pool.query('SELECT id FROM centers WHERE id = $1', [id])
    if (centerCheck.rows.length === 0) {
      return NextResponse.json({ error: 'Center not found' }, { status: 404 })
    }

    // Delete center (cascade will delete related records)
    await pool.query('DELETE FROM centers WHERE id = $1', [id])

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error deleting center:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

