import { NextRequest, NextResponse } from 'next/server'
import { writeFile, mkdir } from 'fs/promises'
import path from 'path'
import { existsSync } from 'fs'
import crypto from 'crypto'
import { requireSuperAdminPermission } from '@/lib/super-admin-access'
import { getUploadBasePath } from '@/lib/upload-storage'
import { validateUploadFile } from '@/lib/file-upload-security'
import {

  buildSafeAdminImageFileName,
  validateAdminImageUpload,
} from '@/lib/admin-image-upload-validation'
import { scanFileBuffer } from '@/lib/virus-scan'

export const dynamic = 'force-dynamic'

const IMAGE_EXT = new Set(['jpg', 'jpeg', 'png', 'webp', 'gif'])
const PDF_EXT = new Set(['pdf'])

export async function POST(request: NextRequest) {
  try {
    const perm = await requireSuperAdminPermission(request, 'expenses', 'create')
    if (!perm.ok) return perm.response

    const formData = await request.formData()
    const file = formData.get('file') as File
    const centerId = formData.get('centerId') as string

    if (!file || !centerId) {
      return NextResponse.json({ error: 'File and centerId are required' }, { status: 400 })
    }

    const bytes = await file.arrayBuffer()
    const buffer = Buffer.from(bytes)
    const ext = (file.name.split('.').pop() || '').toLowerCase()

    let fileName: string
    if (IMAGE_EXT.has(ext)) {
      const formatError = validateAdminImageUpload({
        fileName: file.name,
        mimeType: file.type,
        buffer,
      })
      if (formatError) {
        return NextResponse.json({ error: formatError }, { status: 400 })
      }
      fileName = buildSafeAdminImageFileName(file.name, buffer)
    } else if (PDF_EXT.has(ext)) {
      const validation = validateUploadFile({
        fileName: file.name,
        size: file.size,
        buffer,
        allowedExt: PDF_EXT,
      })
      if (!validation.ok) {
        return NextResponse.json({ error: validation.error }, { status: 400 })
      }
      fileName = `receipt-${Date.now()}-${crypto.randomBytes(4).toString('hex')}.pdf`
    } else {
      return NextResponse.json(
        { error: 'Receipt must be an image (JPG, PNG, WebP) or PDF' },
        { status: 400 }
      )
    }

    const scan = await scanFileBuffer(buffer, file.name)
    if (!scan.clean) {
      return NextResponse.json({ error: scan.error || 'File rejected by security scan' }, { status: 400 })
    }

    const uploadDir = path.join(getUploadBasePath(), 'expenses', `center_${centerId}`)
    if (!existsSync(uploadDir)) {
      await mkdir(uploadDir, { recursive: true })
    }

    await writeFile(path.join(uploadDir, fileName), buffer)
    const publicUrl = `/uploads/expenses/center_${centerId}/${fileName}`

    return NextResponse.json({
      success: true,
      url: publicUrl,
      fileName,
      originalName: file.name,
      size: file.size,
      type: file.type,
    })
  } catch (error) {
    console.error('Super-admin expense receipt upload error:', error)
    return NextResponse.json({ error: 'Upload failed' }, { status: 500 })
  }
}
