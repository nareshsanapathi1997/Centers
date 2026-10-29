import { NextRequest, NextResponse } from 'next/server'

import { requireAdminPermission, httpMethodToAction } from '@/lib/admin-access'
import pool from '@/lib/db'
import { logActivity } from '@/lib/activity-log'
import { writeFile, mkdir } from 'fs/promises'
import path from 'path'
import { getUploadPath } from '@/lib/upload-storage'
import {
  buildSafeAdminImageFileName,
  validateAdminImageUpload,
} from '@/lib/admin-image-upload-validation'
import { getAdminToken } from '@/lib/auth'

export const dynamic = 'force-dynamic'

export async function POST(request: NextRequest) {
  try {
    const token = getAdminToken(request)
    if (!token) {
      return NextResponse.json({ error: 'No token provided' }, { status: 401 })
    }

    const formData = await request.formData()
    const centerId = parseInt(formData.get('center_id') as string)
    const images = formData.getAll('images') as File[]

    if (!centerId) {
      return NextResponse.json({ error: 'Center ID is required' }, { status: 400 })
    }

    if (!images || images.length === 0) {
      return NextResponse.json({ error: 'At least one image is required' }, { status: 400 })
    }
    const perm = await requireAdminPermission(token, centerId, 'senior_faculty', httpMethodToAction(request.method))
    if (!perm.ok) return NextResponse.json({ error: perm.error }, { status: perm.status })

    const uploadDir = getUploadPath('senior-faculty', centerId.toString())
    await mkdir(uploadDir, { recursive: true })

    const uploadedItems = []

    for (const image of images) {
      const bytes = await image.arrayBuffer()
      const buffer = Buffer.from(bytes)
      const formatError = validateAdminImageUpload({
        fileName: image.name,
        mimeType: image.type,
        buffer,
      })
      if (formatError) {
        return NextResponse.json({ error: formatError }, { status: 400 })
      }

      const filename = buildSafeAdminImageFileName(image.name, buffer)
      const filepath = path.join(uploadDir, filename)
      
      await writeFile(filepath, buffer)
      const imageUrl = `/uploads/senior-faculty/${centerId}/${filename}`

      // Extract name from filename (remove extension)
      const name = image.name.replace(/\.[^/.]+$/, '')

      const result = await pool.query(
        `INSERT INTO senior_faculty (center_id, name, role, image_url, display_order, is_active, created_at, updated_at)
         VALUES ($1, $2, $3, $4, $5, $6, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
         RETURNING id, name, role, image_url`,
        [centerId, name, 'Faculty Member', imageUrl, 0, true]
      )

      uploadedItems.push(result.rows[0])
    }

    // Log activity
    await logActivity(
      {
        user_type: 'admin',
        user_id: perm.adminId,
        center_id: centerId,
        action: 'bulk_create',
        entity_type: 'senior_faculty',
        entity_name: `${uploadedItems.length} items`,
        details: { count: uploadedItems.length },
      },
      { headers: request.headers }
    )

    return NextResponse.json({
      message: `Successfully uploaded ${uploadedItems.length} faculty member(s)`,
      items: uploadedItems,
    })
  } catch (error) {
    console.error('Error uploading faculty members:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
