import { NextRequest, NextResponse } from 'next/server'
import { writeFile, mkdir } from 'fs/promises'
import { existsSync } from 'fs'
import path from 'path'
import pool from '@/lib/db'
import { getStudentToken, verifyStudentAccess } from '@/lib/student-auth'
import { getStudentById } from '@/lib/student-portal-db'
import {

  buildSafeAdminImageFileName,
  validateAdminImageUpload,
} from '@/lib/admin-image-upload-validation'
import { resolveAllowedUploadDir, STUDENT_UPLOAD_FOLDERS } from '@/lib/upload-folders'

export const dynamic = 'force-dynamic'

const MAX_BYTES = 500 * 1024

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData()
    const file = formData.get('file') as File | null
    const centerId = parseInt(String(formData.get('centerId') || ''), 10)

    if (!centerId) {
      return NextResponse.json({ error: 'centerId is required' }, { status: 400 })
    }

    const token = getStudentToken(request)
    if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const auth = await verifyStudentAccess(token, centerId)
    if (!auth.authorized || !auth.studentId) {
      return NextResponse.json({ error: auth.error || 'Unauthorized' }, { status: 403 })
    }

    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 })
    }

    if (file.size > MAX_BYTES) {
      return NextResponse.json({ error: 'Photo must be 500KB or smaller' }, { status: 400 })
    }

    const uploadDir = resolveAllowedUploadDir(
      'student-photos',
      STUDENT_UPLOAD_FOLDERS,
      `center_${centerId}`,
      `student_${auth.studentId}`
    )
    if (!uploadDir) {
      return NextResponse.json({ error: 'Invalid upload folder' }, { status: 400 })
    }

    const bytes = await file.arrayBuffer()
    const buffer = Buffer.from(bytes)

    const formatError = validateAdminImageUpload({
      fileName: file.name,
      mimeType: file.type,
      buffer,
    })
    if (formatError) {
      return NextResponse.json({ error: formatError }, { status: 400 })
    }

    const fileName = buildSafeAdminImageFileName(file.name, buffer)

    if (!existsSync(uploadDir)) {
      await mkdir(uploadDir, { recursive: true })
    }

    const filePath = path.join(uploadDir, fileName)
    await writeFile(filePath, buffer)

    const publicUrl = `/uploads/student-photos/center_${centerId}/student_${auth.studentId}/${fileName}`

    await pool.query(
      `UPDATE students SET photo_url = $1, updated_at = CURRENT_TIMESTAMP
       WHERE id = $2 AND center_id = $3`,
      [publicUrl, auth.studentId, centerId]
    )

    const student = await getStudentById(auth.studentId, centerId)
    return NextResponse.json({ success: true, url: publicUrl, student })
  } catch (error) {
    console.error('Student photo upload error:', error)
    return NextResponse.json({ error: 'Failed to upload photo' }, { status: 500 })
  }
}
