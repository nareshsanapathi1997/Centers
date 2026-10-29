import { NextRequest, NextResponse } from 'next/server'
import pool from '@/lib/db'
import { getAdminToken } from '@/lib/auth'
import { requireAdminPermission, httpMethodToAction } from '@/lib/admin-access'
import { logActivity } from '@/lib/activity-log'
import { centerHasCatalogCourses } from '@/lib/center-section-config'
import { revalidateCenterBySlug } from '@/lib/center-cache'

export const dynamic = 'force-dynamic'

export async function GET(
  request: NextRequest,
  { params }: { params: { centerId: string } }
) {
  try {
    const centerId = parseInt(params.centerId)
    
    const token = getAdminToken(request)
    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const perm = await requireAdminPermission(token, centerId, 'settings', httpMethodToAction(request.method))
    if (!perm.ok) return NextResponse.json({ error: perm.error }, { status: perm.status })
    
    const result = await pool.query('SELECT * FROM centers WHERE id = $1', [centerId])
    
    if (result.rows.length === 0) {
      return NextResponse.json({ error: 'Center not found' }, { status: 404 })
    }

    const center = result.rows[0]
    const catalogCoursesAvailable = await centerHasCatalogCourses(String(center.slug ?? ''))

    return NextResponse.json({ ...center, catalogCoursesAvailable })
  } catch (error) {
    console.error('Error fetching center:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: { centerId: string } }
) {
  try {
    const centerId = parseInt(params.centerId)
    
    // Verify admin authorization
    const token = getAdminToken(request)
    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    
    const perm = await requireAdminPermission(token, centerId, 'settings', httpMethodToAction(request.method))
    if (!perm.ok) return NextResponse.json({ error: perm.error }, { status: perm.status })
    
    const body = await request.json()
    
    const {
      name, description, phone, email, address, google_rating, google_rating_url,
      map_embed_url, logo_url, logo_dark_url, favicon_url, social_facebook,
      social_twitter, social_instagram, social_linkedin, social_whatsapp,
      social_telegram, working_hours, is_active
    } = body

    const result = await pool.query(
      `UPDATE centers 
       SET name = $1, description = $2, phone = $3, email = $4, address = $5,
           google_rating = $6, google_rating_url = $7, map_embed_url = $8,
           logo_url = $9, logo_dark_url = $10, favicon_url = $11,
           social_facebook = $12, social_twitter = $13, social_instagram = $14,
           social_linkedin = $15, social_whatsapp = $16, social_telegram = $17,
           working_hours = $18, is_active = $19, updated_at = CURRENT_TIMESTAMP
       WHERE id = $20
       RETURNING *`,
      [
        name, description || null, phone || null, email || null, address || null,
        google_rating || null, google_rating_url || null, map_embed_url || null,
        logo_url || null, logo_dark_url || null, favicon_url || null,
        social_facebook || null, social_twitter || null, social_instagram || null,
        social_linkedin || null, social_whatsapp || null, social_telegram || null,
        working_hours || null, is_active !== false, centerId
      ]
    )

    // Center details appear in the header, footer and contact blocks of every
    // public page, so the slug-keyed record has to be dropped too.
    await revalidateCenterBySlug(centerId)

    // Log activity
    await logActivity(
      {
        user_type: 'admin',
        user_id: perm.adminId,
        center_id: centerId,
        action: 'update',
        entity_type: 'center',
        entity_id: centerId,
        entity_name: name || result.rows[0].name,
        details: body,
      },
      request
    )

    return NextResponse.json(result.rows[0])
  } catch (error) {
    console.error('Error updating center:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
