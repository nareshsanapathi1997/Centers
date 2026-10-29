export type CourseDetailBatch = {
  id?: number
  batch_name?: string | null
  batch_timing?: string | null
  schedule_days?: string | null
  start_date?: string | null
  end_date?: string | null
  enrollment_deadline?: string | null
  capacity?: number | null
  notes?: string | null
  is_active?: boolean
}

export type CourseDetailFaq = {
  id?: number
  question: string
  answer: string
  is_active?: boolean
}

export type CourseDetailFaculty = {
  id?: number
  name: string
  role?: string | null
  bio?: string | null
  image_url?: string | null
}

export type CourseDetailRecord = {
  id: number
  title: string
  slug?: string
  short_description?: string | null
  detailed_description?: string | null
  image_url?: string | null
  brochure_url?: string | null
  syllabus_html?: string | null
  syllabus_pdf_url?: string | null
  demo_class_link?: string | null
  highlights?: unknown
  features?: unknown
  learning_outcomes?: unknown
  eligibility_criteria?: unknown
  duration?: string | null
  mode?: string | null
  price?: number | string | null
  discount_percent?: number | string | null
  discount_amount?: number | string | null
  coupon_code?: string | null
  coupon_enabled?: boolean
  installment_config?: unknown
  enrollment_validity_days?: number | null
  batches?: CourseDetailBatch[]
  faqs?: CourseDetailFaq[]
  faculty?: CourseDetailFaculty[]
}

export function parseStringList(value: unknown): string[] {
  if (Array.isArray(value)) {
    return value.map((v) => String(v).trim()).filter(Boolean)
  }
  return []
}

export function parseInstallments(value: unknown): Array<{ label?: string; amount?: number; due_days?: number }> {
  if (!Array.isArray(value)) return []
  return value.filter((row) => row && typeof row === 'object') as Array<{
    label?: string
    amount?: number
    due_days?: number
  }>
}

export function formatInr(amount: number): string {
  return `₹${amount.toLocaleString('en-IN')}`
}

export function resolveCoursePricing(course: CourseDetailRecord): {
  original: number | null
  final: number | null
  savings: number | null
  discountLabel: string | null
} {
  const price = course.price != null ? Number(course.price) : null
  if (price == null || !Number.isFinite(price) || price <= 0) {
    return { original: null, final: null, savings: null, discountLabel: null }
  }

  const discountAmount = course.discount_amount != null ? Number(course.discount_amount) : 0
  const discountPercent = course.discount_percent != null ? Number(course.discount_percent) : 0

  let final = price
  let discountLabel: string | null = null

  if (Number.isFinite(discountAmount) && discountAmount > 0) {
    final = Math.max(0, price - discountAmount)
    discountLabel = `${formatInr(discountAmount)} off`
  } else if (Number.isFinite(discountPercent) && discountPercent > 0) {
    final = Math.max(0, Math.round(price * (1 - discountPercent / 100)))
    discountLabel = `${discountPercent}% off`
  }

  const savings = final < price ? price - final : null
  return {
    original: price,
    final,
    savings,
    discountLabel,
  }
}

export function formatModeLabel(mode: string | null | undefined): string {
  if (!mode) return ''
  const m = mode.trim().toLowerCase()
  if (m === 'online') return 'Online'
  if (m === 'offline') return 'Classroom'
  if (m === 'hybrid') return 'Hybrid'
  return mode.charAt(0).toUpperCase() + mode.slice(1)
}

export function formatDetailDate(value: string | null | undefined): string {
  if (!value) return ''
  const d = new Date(value)
  if (Number.isNaN(d.getTime())) return String(value)
  return d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })
}

export function externalHref(url: string | null | undefined): string | null {
  if (!url?.trim()) return null
  const u = url.trim()
  if (u.startsWith('http://') || u.startsWith('https://')) return u
  return u.startsWith('/') ? u : `/${u}`
}
