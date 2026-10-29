export const WEBSITE_RESULT_ENTRY_TYPES = ['image', 'text', 'image_text'] as const

export type WebsiteResultEntryType = (typeof WEBSITE_RESULT_ENTRY_TYPES)[number]

export type WebsiteResultEntryRow = {
  id?: number
  title?: string | null
  image_url?: string | null
  content_html?: string | null
  entry_type?: string | null
  exam_category?: string | null
  result_year?: number | null
  display_order?: number | null
  is_active?: boolean
}

export const WEBSITE_RESULT_ENTRY_LABELS: Record<WebsiteResultEntryType, string> = {
  image: 'Image only',
  text: 'Text only',
  image_text: 'Image + text',
}

export function normalizeResultEntryType(raw: unknown): WebsiteResultEntryType {
  const value = String(raw || 'image').toLowerCase()
  if (value === 'text' || value === 'image_text') return value
  return 'image'
}

export function resultEntryTypeLabel(type: WebsiteResultEntryType): string {
  return WEBSITE_RESULT_ENTRY_LABELS[type]
}

export function resultEntryHasImage(type: WebsiteResultEntryType): boolean {
  return type === 'image' || type === 'image_text'
}

export function resultEntryHasText(type: WebsiteResultEntryType): boolean {
  return type === 'text' || type === 'image_text'
}

function stripHtml(html: string): string {
  return html.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim()
}

export function validateWebsiteResultEntryPayload(body: Record<string, unknown>): void {
  const title = String(body.title ?? '').trim()
  if (!title) throw new Error('Title is required')

  const entryType = normalizeResultEntryType(body.entry_type)
  const imageUrl = String(body.image_url ?? '').trim()
  const contentHtml = String(body.content_html ?? '').trim()
  const plainText = stripHtml(contentHtml)

  const yearRaw = body.result_year
  const year = typeof yearRaw === 'number' ? yearRaw : Number.parseInt(String(yearRaw ?? ''), 10)
  if (!Number.isFinite(year) || year < 1990 || year > new Date().getFullYear() + 1) {
    throw new Error('Result year is required (e.g. 2024, 2025)')
  }

  if (resultEntryHasImage(entryType) && !imageUrl) {
    throw new Error('Image is required for this entry type')
  }

  if (resultEntryHasText(entryType) && !plainText) {
    throw new Error('Rich text content is required for this entry type')
  }
}

export function buildWebsiteResultEntryPayload(body: Record<string, unknown>): Record<string, unknown> {
  const entryType = normalizeResultEntryType(body.entry_type)
  const payload: Record<string, unknown> = {
    title: String(body.title ?? '').trim(),
    entry_type: entryType,
    result_year:
      typeof body.result_year === 'number'
        ? body.result_year
        : Number.parseInt(String(body.result_year ?? ''), 10) || null,
    exam_category: body.exam_category ? String(body.exam_category) : null,
    display_order:
      typeof body.display_order === 'number'
        ? body.display_order
        : Number.parseInt(String(body.display_order ?? '0'), 10) || 0,
    is_active: body.is_active !== false && body.is_active !== 'false',
    content_html: resultEntryHasText(entryType) ? String(body.content_html ?? '').trim() : null,
    image_url: resultEntryHasImage(entryType) ? String(body.image_url ?? '').trim() : null,
  }

  validateWebsiteResultEntryPayload(payload)
  return payload
}
