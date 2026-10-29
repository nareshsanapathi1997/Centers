import { NextRequest, NextResponse } from 'next/server'
import { writeFile, mkdir } from 'fs/promises'
import path from 'path'
import { existsSync } from 'fs'
import { verifySuperAdminAuth } from '@/lib/super-admin-auth'
import { SUPER_ADMIN_UPLOAD_FOLDERS, resolveAllowedUploadDir } from '@/lib/upload-folders'

export const dynamic = 'force-dynamic'

const IMAGE_TYPES = [
  'image/jpeg',
  'image/jpg',
  'image/png',
  'image/gif',
  'image/webp',
  'image/svg+xml',
]
const PDF_TYPE = 'application/pdf'

export async function POST(request: NextRequest) {
  try {
    const authResult = await verifySuperAdminAuth(request)
    if (!authResult.authorized) {
      return NextResponse.json({ error: authResult.error || 'Unauthorized' }, { status: 403 })
    }

    const formData = await request.formData()
    const file = formData.get('file') as File
    const folder = (formData.get('folder') as string) || 'course-masters'

    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 })
    }

    const uploadDir = resolveAllowedUploadDir(folder, SUPER_ADMIN_UPLOAD_FOLDERS)
    if (!uploadDir) {
      return NextResponse.json({ error: 'Invalid upload folder' }, { status: 400 })
    }

    const isPdf = file.type === PDF_TYPE
    const isImage = IMAGE_TYPES.includes(file.type)
    if (!isPdf && !isImage) {
      return NextResponse.json(
        { error: 'Invalid file type. Only images and PDF are allowed.' },
        { status: 400 }
      )
    }

    const maxSize = isPdf ? 15 * 1024 * 1024 : 5 * 1024 * 1024
    if (file.size > maxSize) {
      return NextResponse.json(
        { error: `File too large. Max ${isPdf ? '15MB' : '5MB'}.` },
        { status: 400 }
      )
    }

    const timestamp = Date.now()
    const originalName = file.name.replace(/[^a-zA-Z0-9.-]/g, '_')
    const ext = path.extname(originalName)
    const baseName = path.basename(originalName, ext)
    const fileName = `${baseName}_${timestamp}${ext}`

    if (!existsSync(uploadDir)) {
      await mkdir(uploadDir, { recursive: true })
    }

    const bytes = await file.arrayBuffer()
    await writeFile(path.join(uploadDir, fileName), Buffer.from(bytes))

    const publicUrl = `/uploads/${folder}/${fileName}`
    return NextResponse.json({
      success: true,
      url: publicUrl,
      fileName,
      type: file.type,
    })
  } catch (error) {
    console.error('Super admin upload error:', error)
    return NextResponse.json({ error: 'Failed to upload file' }, { status: 500 })
  }
}
