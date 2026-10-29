import { NextRequest, NextResponse } from 'next/server'
import { writeFile, mkdir } from 'fs/promises'
import path from 'path'
import { existsSync } from 'fs'
import crypto from 'crypto'
import { getAdminToken } from '@/lib/auth'
import { requireAdminPermission } from '@/lib/admin-access'
import { getUploadBasePath } from '@/lib/upload-storage'
import { validateUploadFile } from '@/lib/file-upload-security'
import { scanFileBuffer } from '@/lib/virus-scan'

export const dynamic = 'force-dynamic'

const ALLOWED_EXT = new Set(['pdf', 'doc', 'docx', 'ppt', 'pptx', 'xls', 'xlsx', 'zip', 'mp4', 'mp3'])

export async function POST(request: NextRequest) {
  try {
    const token = getAdminToken(request)
    if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const formData = await request.formData()
    const file = formData.get('file') as File
    const centerId = formData.get('centerId') as string

    if (!file || !centerId) {
      return NextResponse.json({ error: 'File and centerId are required' }, { status: 400 })
    }

    const perm = await requireAdminPermission(token, parseInt(centerId, 10), 'course_materials', 'create')
    if (!perm.ok) return NextResponse.json({ error: perm.error }, { status: perm.status })

    const bytes = await file.arrayBuffer()
    const buffer = Buffer.from(bytes)

    const validation = validateUploadFile({
      fileName: file.name,
      size: file.size,
      buffer,
      allowedExt: ALLOWED_EXT,
    })
    if (!validation.ok) {
      return NextResponse.json({ error: validation.error }, { status: 400 })
    }

    const scan = await scanFileBuffer(buffer, file.name)
    if (!scan.clean) {
      return NextResponse.json({ error: scan.error || 'File rejected by security scan' }, { status: 400 })
    }

    const ext = validation.ext
    const fileName = `material-${Date.now()}-${crypto.randomBytes(4).toString('hex')}.${ext}`
    const uploadDir = path.join(getUploadBasePath(), 'materials', `center_${centerId}`)

    if (!existsSync(uploadDir)) {
      await mkdir(uploadDir, { recursive: true })
    }

    await writeFile(path.join(uploadDir, fileName), buffer)

    const publicUrl = `/uploads/materials/center_${centerId}/${fileName}`
    return NextResponse.json({
      success: true,
      url: publicUrl,
      fileName,
      fileType: ext,
      size: file.size,
    })
  } catch (error) {
    console.error('Material upload error:', error)
    return NextResponse.json({ error: 'Upload failed' }, { status: 500 })
  }
}
