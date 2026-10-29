/**
 * Build a WhatsApp chat URL (https://wa.me/...) from a phone number or existing link.
 */
export function buildWhatsAppUrl(
  value: string | null | undefined,
  options?: { text?: string },
): string | null {
  const raw = String(value ?? '').trim()
  if (!raw) return null

  const textQuery = options?.text?.trim()
    ? `?text=${encodeURIComponent(options.text.trim())}`
    : ''

  const waMeMatch = raw.match(/^https?:\/\/wa\.me\/(\d+)/i)
  if (waMeMatch) {
    return `https://wa.me/${waMeMatch[1]}${textQuery}`
  }

  const apiMatch = raw.match(/[?&]phone=(\d+)/i)
  if (/api\.whatsapp\.com/i.test(raw) && apiMatch) {
    return `https://wa.me/${apiMatch[1]}${textQuery}`
  }

  const digits = raw.replace(/\D/g, '')
  if (!digits) return null

  let phone = digits
  if (phone.length === 10) {
    phone = `91${phone}`
  }

  return `https://wa.me/${phone}${textQuery}`
}

export function resolveCenterWhatsAppUrl(center: {
  social_whatsapp?: string | null
  phone?: string[] | null
}): string | null {
  return (
    buildWhatsAppUrl(center.social_whatsapp) ??
    buildWhatsAppUrl(center.phone?.[0])
  )
}
