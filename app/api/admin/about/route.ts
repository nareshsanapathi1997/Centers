import { NextRequest, NextResponse } from 'next/server'
import pool from '@/lib/db'
import { getAdminToken } from '@/lib/auth'
import { requireAdminPermission, httpMethodToAction } from '@/lib/admin-access'
import { logActivity } from '@/lib/activity-log'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  try {
    const token = getAdminToken(request)
    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const searchParams = request.nextUrl.searchParams
    const centerId = parseInt(searchParams.get('centerId') || '0')

    if (!centerId) {
      return NextResponse.json({ error: 'centerId is required' }, { status: 400 })
    }

    const perm = await requireAdminPermission(token, centerId, 'about', httpMethodToAction(request.method))
    if (!perm.ok) return NextResponse.json({ error: perm.error }, { status: perm.status })

    const result = await pool.query(
      'SELECT * FROM about_sections WHERE center_id = $1',
      [centerId]
    )

    if (result.rows.length === 0) {
      return NextResponse.json(null)
    }

    return NextResponse.json(result.rows[0])
  } catch (error: any) {
    console.error('Error fetching about section:', error)
    // If table doesn't exist, return null
    if (error.code === '42P01') {
      return NextResponse.json(null)
    }
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const token = getAdminToken(request)
    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { center_id, title, heading, description, subtext, feature_list, image_url, is_active } = body

    if (!center_id) {
      return NextResponse.json({ error: 'center_id is required' }, { status: 400 })
    }
    const perm = await requireAdminPermission(token, center_id, 'about', httpMethodToAction(request.method))
    if (!perm.ok) return NextResponse.json({ error: perm.error }, { status: perm.status })

    // Convert feature_list to array if it's a string or ensure it's an array
    let featureArray = null
    if (feature_list) {
      if (Array.isArray(feature_list)) {
        featureArray = feature_list.filter(f => f && f.trim().length > 0)
      } else if (typeof feature_list === 'string') {
        featureArray = feature_list.split('\n').map(f => f.trim()).filter(f => f.length > 0)
      }
      if (featureArray && featureArray.length === 0) {
        featureArray = null
      }
    }

    const result = await pool.query(
      `INSERT INTO about_sections (center_id, title, heading, description, subtext, feature_list, image_url, is_active)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
       ON CONFLICT (center_id) 
       DO UPDATE SET 
         title = EXCLUDED.title,
         heading = EXCLUDED.heading,
         description = EXCLUDED.description,
         subtext = EXCLUDED.subtext,
         feature_list = EXCLUDED.feature_list,
         image_url = EXCLUDED.image_url,
         is_active = EXCLUDED.is_active,
         updated_at = CURRENT_TIMESTAMP
       RETURNING *`,
      [
        center_id,
        title || 'Get To Know Us',
        heading || null,
        description || null,
        subtext || null,
        featureArray,
        image_url || null,
        is_active !== false
      ]
    )

    const aboutSection = result.rows[0]
    const isUpdate = aboutSection.updated_at !== aboutSection.created_at

    // Log activity
    await logActivity(
      {
        user_type: 'admin',
        user_id: perm.adminId,
        center_id: center_id,
        action: isUpdate ? 'update' : 'create',
        entity_type: 'about',
        entity_id: aboutSection.id,
        entity_name: title || 'About Section',
        details: body,
      },
      request
    )

    return NextResponse.json(aboutSection, { status: 201 })
  } catch (error: any) {
    console.error('Error saving about section:', error)
    if (error.code === '42P01') {
      return NextResponse.json({ error: 'about_sections table does not exist. Please run migration script.' }, { status: 500 })
    }
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const token = getAdminToken(request)
    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { center_id, title, heading, description, subtext, feature_list, image_url, is_active } = body

    if (!center_id) {
      return NextResponse.json({ error: 'center_id is required' }, { status: 400 })
    }
    const perm = await requireAdminPermission(token, center_id, 'about', httpMethodToAction(request.method))
    if (!perm.ok) return NextResponse.json({ error: perm.error }, { status: perm.status })

    // Convert feature_list to array if needed
    let featureArray = undefined
    if (feature_list !== undefined) {
      if (Array.isArray(feature_list)) {
        featureArray = feature_list.filter(f => f && f.trim().length > 0)
        if (featureArray.length === 0) {
          featureArray = null
        }
      } else if (typeof feature_list === 'string') {
        featureArray = feature_list.split('\n').map(f => f.trim()).filter(f => f.length > 0)
        if (featureArray.length === 0) {
          featureArray = null
        }
      } else if (feature_list === null) {
        featureArray = null
      }
    }

    const updateFields: string[] = []
    const updateValues: any[] = []
    let paramCount = 1

    if (title !== undefined) {
      updateFields.push(`title = $${paramCount++}`)
      updateValues.push(title)
    }
    if (heading !== undefined) {
      updateFields.push(`heading = $${paramCount++}`)
      updateValues.push(heading)
    }
    if (description !== undefined) {
      updateFields.push(`description = $${paramCount++}`)
      updateValues.push(description)
    }
    if (subtext !== undefined) {
      updateFields.push(`subtext = $${paramCount++}`)
      updateValues.push(subtext)
    }
    if (feature_list !== undefined) {
      updateFields.push(`feature_list = $${paramCount++}`)
      updateValues.push(featureArray)
    }
    if (image_url !== undefined) {
      updateFields.push(`image_url = $${paramCount++}`)
      updateValues.push(image_url)
    }
    if (is_active !== undefined) {
      updateFields.push(`is_active = $${paramCount++}`)
      updateValues.push(is_active)
    }

    if (updateFields.length === 0) {
      return NextResponse.json({ error: 'No fields to update' }, { status: 400 })
    }

    updateFields.push(`updated_at = CURRENT_TIMESTAMP`)
    updateValues.push(center_id)

    const result = await pool.query(
      `UPDATE about_sections SET ${updateFields.join(', ')} WHERE center_id = $${paramCount} RETURNING *`,
      updateValues
    )

    if (result.rows.length === 0) {
      return NextResponse.json({ error: 'About section not found' }, { status: 404 })
    }

    // Log activity
    await logActivity(
      {
        user_type: 'admin',
        user_id: perm.adminId,
        center_id: center_id,
        action: 'update',
        entity_type: 'about',
        entity_id: result.rows[0].id,
        entity_name: title || result.rows[0].title || 'About Section',
        details: body,
      },
      request
    )

    return NextResponse.json(result.rows[0])
  } catch (error: any) {
    console.error('Error updating about section:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
