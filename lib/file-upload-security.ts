const MAX_UPLOAD_BYTES = Number(process.env.MAX_UPLOAD_BYTES || 50 * 1024 * 1024)

const EXT_MIME: Record<string, string[]> = {
  pdf: ['application/pdf'],
  doc: ['application/msword'],
  docx: ['application/vnd.openxmlformats-officedocument.wordprocessingml.document'],
  ppt: ['application/vnd.ms-powerpoint'],
  pptx: ['application/vnd.openxmlformats-officedocument.presentationml.presentation'],
  xls: ['application/vnd.ms-excel'],
  xlsx: ['application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'],
  zip: ['application/zip', 'application/x-zip-compressed'],
  mp4: ['video/mp4'],
  mp3: ['audio/mpeg', 'audio/mp3'],
}

export function getMaxUploadBytes(): number {
  return MAX_UPLOAD_BYTES
}

export function validateUploadFile(input: {
  fileName: string
  size: number
  buffer: Buffer
  allowedExt: Set<string>
}): { ok: true; ext: string } | { ok: false; error: string } {
  if (input.size > MAX_UPLOAD_BYTES) {
    const mb = Math.round(MAX_UPLOAD_BYTES / (1024 * 1024))
    return { ok: false, error: `File exceeds maximum size of ${mb}MB` }
  }

  const ext = input.fileName.split('.').pop()?.toLowerCase() || ''
  if (!input.allowedExt.has(ext)) {
    return { ok: false, error: `File type .${ext} is not allowed` }
  }

  const allowedMimes = EXT_MIME[ext]
  if (allowedMimes?.length) {
    const header = input.buffer.subarray(0, 12)
    const mimeOk = sniffMime(header, ext, allowedMimes)
    if (!mimeOk) {
      return { ok: false, error: 'File content does not match its extension' }
    }
  }

  return { ok: true, ext }
}

function sniffMime(header: Buffer, ext: string, allowed: string[]): boolean {
  if (ext === 'pdf' && header[0] === 0x25 && header[1] === 0x50 && header[2] === 0x44 && header[3] === 0x46) {
    return allowed.includes('application/pdf')
  }
  if (ext === 'zip' && header[0] === 0x50 && header[1] === 0x4b) {
    return allowed.some((m) => m.includes('zip'))
  }
  if (ext === 'mp4' && header[4] === 0x66 && header[5] === 0x74 && header[6] === 0x79 && header[7] === 0x70) {
    return allowed.includes('video/mp4')
  }
  if (ext === 'mp3' && (header[0] === 0x49 && header[1] === 0x44 && header[2] === 0x33)) {
    return allowed.includes('audio/mpeg')
  }
  // Office / legacy formats: accept if extension whitelisted (weak sniff)
  if (['doc', 'docx', 'ppt', 'pptx', 'xls', 'xlsx'].includes(ext)) {
    return true
  }
  return allowed.length === 0
}
