import { getAdminToken } from '@/lib/auth'
import { requireAdminPermission } from '@/lib/admin-access'
import { NextRequest, NextResponse } from 'next/server'
import { writeFile, mkdir } from 'fs/promises'
import path from 'path'
import { existsSync } from 'fs'
import { isGalleryOrResultsUploadFolder } from '@/lib/gallery-results-image-spec'
import { isHeroBannerUpload } from '@/lib/hero-banner-image-spec'
import { validateGalleryResultsImageBuffer, validateHeroBannerImageBuffer } from '@/lib/image-dimensions'
import {

  buildSafeAdminImageFileName,
  validateAdminImageUpload,
} from '@/lib/admin-image-upload-validation'
import { ADMIN_UPLOAD_FOLDERS, resolveAllowedUploadDir } from '@/lib/upload-folders'

export const dynamic = 'force-dynamic'

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData()
    const file = formData.get('file') as File
    const folder = (formData.get('folder') as string) || 'uploads'
    const centerId = formData.get('centerId') as string

    const token = getAdminToken(request)
    if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    if (!centerId) return NextResponse.json({ error: 'centerId is required' }, { status: 400 })

    const perm = await requireAdminPermission(token, parseInt(centerId, 10), 'settings', 'update')
    if (!perm.ok) return NextResponse.json({ error: perm.error }, { status: perm.status })

    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 })
    }

    const uploadDir = resolveAllowedUploadDir(
      folder,
      ADMIN_UPLOAD_FOLDERS,
      `center_${centerId}`
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

    if (isGalleryOrResultsUploadFolder(folder)) {
      const dimensionError = validateGalleryResultsImageBuffer(buffer, file.name)
      if (dimensionError) {
        return NextResponse.json({ error: dimensionError }, { status: 400 })
      }
    }

    if (isHeroBannerUpload(folder, centerId)) {
      const dimensionError = validateHeroBannerImageBuffer(buffer, file.name)
      if (dimensionError) {
        return NextResponse.json({ error: dimensionError }, { status: 400 })
      }
    }

    const filePath = path.join(uploadDir, fileName)
    await writeFile(filePath, buffer)

    const publicUrl = `/uploads/${folder}/center_${centerId}/${fileName}`

    return NextResponse.json({
      success: true,
      url: publicUrl,
      fileName: fileName,
      originalName: file.name,
      size: file.size,
      type: file.type,
    })
  } catch (error) {
    console.error('Upload error:', error)
    return NextResponse.json({ error: 'Failed to upload file' }, { status: 500 })
  }
}
