import { NextRequest, NextResponse } from 'next/server'
import { readFile } from 'fs/promises'
import path from 'path'
import { getStudentToken, verifyStudentAccess } from '@/lib/student-auth'
import { getStudentMaterials } from '@/lib/student-materials-db'
import { resolveStoredUploadPath } from '@/lib/upload-storage'

export const dynamic = 'force-dynamic'

const MIMES: Record<string, string> = {
  '.pdf': 'application/pdf',
  '.doc': 'application/msword',
  '.docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  '.ppt': 'application/vnd.ms-powerpoint',
  '.pptx': 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
  '.xls': 'application/vnd.ms-excel',
  '.xlsx': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  '.zip': 'application/zip',
  '.mp4': 'video/mp4',
  '.mp3': 'audio/mpeg',
}

/**
 * Serves a single course material to a student who has paid for that course.
 *
 * `getStudentMaterials` already restricts rows to courses with a completed
 * payment for this student, so resolving the material through that list is the
 * enrolment check — the material id alone grants nothing.
 */
export async function GET(request: NextRequest) {
  try {
    const centerId = parseInt(request.nextUrl.searchParams.get('centerId') || '', 10)
    const materialId = parseInt(request.nextUrl.searchParams.get('materialId') || '', 10)

    if (!centerId || !materialId) {
      return NextResponse.json(
        { error: 'centerId and materialId are required' },
        { status: 400 }
      )
    }

    const token = getStudentToken(request)
    if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const auth = await verifyStudentAccess(token, centerId)
    if (!auth.authorized || !auth.studentId) {
      return NextResponse.json({ error: auth.error }, { status: 403 })
    }

    const materials = await getStudentMaterials(auth.studentId, centerId)
    const material = materials.find((m) => Number(m.id) === materialId)
    if (!material) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 })
    }

    const filePath = resolveStoredUploadPath(material.file_url || '')
    if (!filePath) {
      return NextResponse.json({ error: 'File unavailable' }, { status: 404 })
    }

    const buffer = await readFile(filePath)
    const ext = path.extname(filePath).toLowerCase()
    const downloadName = `${(material.title || 'material').replace(/[^\w.-]+/g, '_')}${ext}`

    return new NextResponse(buffer, {
      headers: {
        'Content-Type': MIMES[ext] || 'application/octet-stream',
        'Content-Disposition': `attachment; filename="${downloadName}"`,
        'Cache-Control': 'private, no-store',
      },
    })
  } catch (error) {
    console.error('Material download error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
