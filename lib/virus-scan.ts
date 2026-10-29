/**
 * Optional virus scan hook for uploaded files.
 * Set VIRUS_SCAN_URL to POST the file buffer; expect JSON { clean: true } or 200 OK.
 * Set VIRUS_SCAN_ENABLED=true to reject uploads when scan fails or URL is missing.
 */
export async function scanFileBuffer(
  buffer: Buffer,
  fileName: string
): Promise<{ clean: boolean; error?: string }> {
  if (process.env.VIRUS_SCAN_ENABLED !== 'true') {
    return { clean: true }
  }

  const url = process.env.VIRUS_SCAN_URL?.trim()
  if (!url) {
    return { clean: false, error: 'Virus scanning is enabled but VIRUS_SCAN_URL is not configured' }
  }

  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/octet-stream',
        'X-File-Name': fileName,
      },
      body: new Uint8Array(buffer),
    })

    if (!res.ok) {
      return { clean: false, error: 'Virus scan service rejected the file' }
    }

    const data = (await res.json().catch(() => ({}))) as { clean?: boolean }
    if (data.clean === false) {
      return { clean: false, error: 'File failed virus scan' }
    }

    return { clean: true }
  } catch {
    return { clean: false, error: 'Virus scan service unavailable' }
  }
}
