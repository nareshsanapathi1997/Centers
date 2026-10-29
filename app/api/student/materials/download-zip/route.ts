import { NextRequest, NextResponse } from 'next/server'
import { getStudentToken, verifyStudentAccess } from '@/lib/student-auth'
import { getStudentMaterials } from '@/lib/student-materials-db'
import { readFile } from 'fs/promises'
import path from 'path'
import { resolveStoredUploadPath } from '@/lib/upload-storage'
import { zipSync } from 'fflate'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  try {
    const centerId = parseInt(request.nextUrl.searchParams.get('centerId') || '', 10)
    const courseMasterId = parseInt(request.nextUrl.searchParams.get('courseMasterId') || '', 10)

    if (!centerId || !courseMasterId) {
      return NextResponse.json({ error: 'centerId and courseMasterId are required' }, { status: 400 })
    }

    const token = getStudentToken(request)
    if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const auth = await verifyStudentAccess(token, centerId)
    if (!auth.authorized || !auth.studentId) {
      return NextResponse.json({ error: auth.error }, { status: 403 })
    }

    const allMaterials = await getStudentMaterials(auth.studentId, centerId)
    const materials = allMaterials.filter((m) => m.course_master_id === courseMasterId)
    if (materials.length === 0) {
      return NextResponse.json({ error: 'No materials found for this course' }, { status: 404 })
    }

    const zipEntries: Record<string, Uint8Array> = {}

    for (const m of materials) {
      const url = m.file_url || ''
      const filePath = resolveStoredUploadPath(url)
      if (!filePath) continue
      try {
        const buf = await readFile(filePath)
        const safeName = `${m.sort_order || 0}-${(m.title || 'file').replace(/[^\w.-]+/g, '_')}${path.extname(url) || `.${m.file_type || 'bin'}`}`
        zipEntries[safeName] = new Uint8Array(buf)
      } catch {
        // skip missing files
      }
    }

    if (Object.keys(zipEntries).length === 0) {
      return NextResponse.json({ error: 'No downloadable files found' }, { status: 404 })
    }

    const zipped = zipSync(zipEntries)
    return new NextResponse(Buffer.from(zipped), {
      headers: {
        'Content-Type': 'application/zip',
        'Content-Disposition': `attachment; filename="course-${courseMasterId}-materials.zip"`,
      },
    })
  } catch (error) {
    console.error('Materials ZIP error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
