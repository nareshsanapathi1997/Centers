type CenterLocationShareInput = {
  name?: string | null
  address?: string | null
  phone?: string[] | null
  map_embed_url?: string | null
  google_rating_url?: string | null
}

export type CenterSharePayload = CenterLocationShareInput

export function toCenterSharePayload(center: CenterLocationShareInput): CenterSharePayload {
  return {
    name: center.name,
    address: center.address,
    phone: center.phone,
    map_embed_url: center.map_embed_url,
    google_rating_url: center.google_rating_url,
  }
}

export function canShareCenterLocation(center: CenterLocationShareInput): boolean {
  return Boolean(
    String(center.address ?? '').trim() ||
      (center.phone ?? []).some((p) => String(p).trim()) ||
      String(center.map_embed_url ?? '').trim() ||
      String(center.google_rating_url ?? '').trim()
  )
}

export function encodeCenterSharePayload(payload: CenterSharePayload): string {
  return encodeURIComponent(JSON.stringify(payload))
}

export function decodeCenterSharePayload(encoded: string): CenterSharePayload | null {
  try {
    return JSON.parse(decodeURIComponent(encoded)) as CenterSharePayload
  } catch {
    return null
  }
}

/** Read centre payload from a WhatsApp trigger click (button or child icon/label). */
export function resolveCenterSharePayloadFromTrigger(target: EventTarget | null): CenterSharePayload | null {
  if (!target || !(target instanceof Element)) return null
  const trigger = target.closest('[data-share-payload]')
  if (!trigger) return null
  const encoded = trigger.getAttribute('data-share-payload')
  if (!encoded) return null
  return decodeCenterSharePayload(encoded)
}

/** Shareable Google Maps link (not embed iframe URL). */
export function resolveCenterGoogleMapsShareUrl(
  center: Pick<CenterLocationShareInput, 'address' | 'map_embed_url' | 'google_rating_url'>
): string | null {
  const ratingUrl = String(center.google_rating_url ?? '').trim()
  if (/google\.com\/maps|maps\.google\.com/i.test(ratingUrl)) {
    return ratingUrl
  }

  const embed = String(center.map_embed_url ?? '').trim()
  if (embed) {
    if (embed.includes('/maps/embed')) {
      return embed.replace('/maps/embed', '/maps')
    }
    if (/google\.com\/maps|maps\.google\.com/i.test(embed)) {
      return embed
    }
  }

  const address = String(center.address ?? '').trim()
  if (address) {
    return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(address)}`
  }

  return null
}

export function buildCenterLocationWhatsAppMessage(center: CenterLocationShareInput): string {
  const lines: string[] = []
  const name = String(center.name ?? '').trim() || 'EduSphere Centre'

  lines.push(`${name} — centre details for your reference:`)
  lines.push('')

  const address = String(center.address ?? '').trim()
  if (address) {
    lines.push('Address:')
    lines.push(address)
    lines.push('')
  }

  const phones = (center.phone ?? []).map((p) => String(p).trim()).filter(Boolean)
  if (phones.length > 0) {
    lines.push('Contact:')
    for (const phone of phones) {
      lines.push(phone)
    }
    lines.push('')
  }

  const mapUrl = resolveCenterGoogleMapsShareUrl(center)
  if (mapUrl) {
    lines.push('Google Maps:')
    lines.push(mapUrl)
  }

  return lines.join('\n').trim()
}
