/**
 * Admin-managed enrollment / checkout settings.
 * Layering: built-in DEFAULTS <- Super Admin defaults (center_key 0) <- Centre Admin override.
 * Stored as JSON text in enrollment_settings.settings (LONGTEXT, parsed here).
 */
import pool from '@/lib/db'

export type FormFieldType = 'text' | 'email' | 'tel' | 'select' | 'textarea' | 'date'

export type CheckoutFormField = {
  key: string
  label: string
  type: FormFieldType
  enabled: boolean
  required: boolean
  options?: string[]
  placeholder?: string
}

export type IconText = { icon: string; text: string }

export type ReminderSettings = {
  enabled: boolean
  days_before: number[]
  overdue_every_days: number
  channels: { email: boolean; sms: boolean; whatsapp: boolean; in_app: boolean }
}

export type EnrollmentSettings = {
  perks: IconText[]
  trust_badges: IconText[]
  checkout_trust: IconText[]
  success_title: string
  success_text: string
  approval_pending_text: string
  contact_fee_text: string
  counselling_title: string
  counselling_text: string
  max_installments: number
  form_fields: CheckoutFormField[]
  require_terms: boolean
  terms_html: string
  refund_policy_html: string
  gstin: string
  legal_name: string
  billing_address: string
  approval_required: boolean
  show_seats_left: boolean
  low_seats_threshold: number
  waitlist_enabled: boolean
  scholarship_enabled: boolean
  referral_enabled: boolean
  referral_auto_issue: boolean
  referral_reward_type: 'percent' | 'fixed'
  referral_reward_value: number
  allow_stacking: boolean
  reminders: ReminderSettings
}

export const DEFAULT_FORM_FIELDS: CheckoutFormField[] = [
  { key: 'student_email', label: 'Email address', type: 'email', enabled: true, required: false, placeholder: 'you@example.com' },
  { key: 'guardian_name', label: 'Parent / guardian name', type: 'text', enabled: false, required: false },
  { key: 'guardian_mobile', label: 'Parent / guardian mobile', type: 'tel', enabled: false, required: false },
  { key: 'city', label: 'City', type: 'text', enabled: false, required: false },
  { key: 'college', label: 'College / school', type: 'text', enabled: false, required: false },
  { key: 'qualification', label: 'Highest qualification', type: 'select', enabled: false, required: false, options: ['Class 12', 'Graduate', 'Post-graduate', 'Working professional'] },
  { key: 'date_of_birth', label: 'Date of birth', type: 'date', enabled: false, required: false },
  { key: 'address', label: 'Address', type: 'textarea', enabled: false, required: false },
]

export const DEFAULT_ENROLLMENT_SETTINGS: EnrollmentSettings = {
  perks: [
    { icon: 'ri-book-2-line', text: 'Comprehensive printed & digital study material' },
    { icon: 'ri-bar-chart-box-line', text: 'All-India proctored mock test series included' },
    { icon: 'ri-discuss-line', text: '1-on-1 doubt clearing & mentor guidance' },
  ],
  trust_badges: [
    { icon: 'ri-shield-check-line', text: 'Verified Curriculum' },
    { icon: 'ri-book-open-line', text: 'Study Material Included' },
    { icon: 'ri-timer-line', text: 'Proctored Mock Tests' },
  ],
  checkout_trust: [
    { icon: 'ri-lock-2-line', text: 'Encrypted checkout' },
    { icon: 'ri-flashlight-line', text: 'Instant confirmation' },
    { icon: 'ri-file-list-3-line', text: 'Digital receipt' },
  ],
  success_title: 'Payment Successful',
  success_text: 'Your enrollment is confirmed. A receipt has been sent to your email, and your Student Portal account is ready.',
  approval_pending_text: 'Payment received. Your enrollment is awaiting confirmation from the centre; we will notify you shortly.',
  contact_fee_text: 'Contact the centre for the current fee and available offers.',
  counselling_title: 'Need Academic Guidance?',
  counselling_text: 'Not sure which batch is right for you? Talk to a senior mentor at {centerName} for a free counselling session.',
  max_installments: 3,
  form_fields: DEFAULT_FORM_FIELDS,
  require_terms: false,
  terms_html: '',
  refund_policy_html: '',
  gstin: '',
  legal_name: '',
  billing_address: '',
  approval_required: false,
  show_seats_left: true,
  low_seats_threshold: 10,
  waitlist_enabled: true,
  scholarship_enabled: false,
  referral_enabled: false,
  referral_auto_issue: false,
  referral_reward_type: 'fixed',
  referral_reward_value: 500,
  allow_stacking: false,
  reminders: {
    enabled: true,
    days_before: [3, 1],
    overdue_every_days: 3,
    channels: { email: true, sms: true, whatsapp: false, in_app: true },
  },
}

function parseJson(raw: unknown): Record<string, unknown> {
  if (!raw) return {}
  if (typeof raw === 'object') return raw as Record<string, unknown>
  try {
    const v = JSON.parse(String(raw))
    return v && typeof v === 'object' ? v : {}
  } catch {
    return {}
  }
}

const str = (v: unknown, max = 4000) => (typeof v === 'string' ? v.slice(0, max) : undefined)
const bool = (v: unknown) => (typeof v === 'boolean' ? v : v === 1 || v === '1' || v === 'true' ? true : v === 0 || v === '0' || v === 'false' ? false : undefined)
const int = (v: unknown, min: number, max: number) => {
  const n = Number(v)
  return Number.isFinite(n) ? Math.min(max, Math.max(min, Math.round(n))) : undefined
}

function iconList(v: unknown): IconText[] | undefined {
  if (!Array.isArray(v)) return undefined
  return v
    .map((x) => ({
      icon: String((x as IconText)?.icon || 'ri-checkbox-circle-line').replace(/[^a-z0-9-]/gi, '').slice(0, 60),
      text: String((x as IconText)?.text || '').slice(0, 200),
    }))
    .filter((x) => x.text.trim())
    .slice(0, 8)
}

function stripDangerousHtml(html: string): string {
  return html
    .replace(/<\s*(script|style|iframe|object|embed)[\s\S]*?<\s*\/\s*\1\s*>/gi, '')
    .replace(/<\s*(script|style|iframe|object|embed)[^>]*>/gi, '')
    .replace(/\son\w+\s*=\s*("[^"]*"|'[^']*'|[^\s>]+)/gi, '')
    .replace(/javascript:/gi, '')
    .slice(0, 20000)
}

const FIELD_TYPES: FormFieldType[] = ['text', 'email', 'tel', 'select', 'textarea', 'date']

function formFields(v: unknown): CheckoutFormField[] | undefined {
  if (!Array.isArray(v)) return undefined
  const seen = new Set<string>()
  const out: CheckoutFormField[] = []
  for (const raw of v) {
    const f = raw as Partial<CheckoutFormField>
    const key = String(f?.key || '').toLowerCase().replace(/[^a-z0-9_]/g, '_').slice(0, 40)
    if (!key || seen.has(key) || ['student_name', 'student_mobile', 'coupon_code'].includes(key)) continue
    seen.add(key)
    out.push({
      key,
      label: String(f.label || key).slice(0, 120),
      type: FIELD_TYPES.includes(f.type as FormFieldType) ? (f.type as FormFieldType) : 'text',
      enabled: Boolean(f.enabled),
      required: Boolean(f.required),
      options: Array.isArray(f.options) ? f.options.map((o) => String(o).slice(0, 80)).filter(Boolean).slice(0, 30) : undefined,
      placeholder: f.placeholder ? String(f.placeholder).slice(0, 120) : undefined,
    })
  }
  return out.slice(0, 20)
}

/** Whitelist + coerce an admin-submitted settings object. Unknown keys are dropped. */
export function sanitizeSettingsPatch(input: unknown): Partial<EnrollmentSettings> {
  const src = parseJson(input)
  const out: Partial<EnrollmentSettings> = {}
  const set = <K extends keyof EnrollmentSettings>(k: K, v: EnrollmentSettings[K] | undefined) => {
    if (v !== undefined) out[k] = v
  }
  set('perks', iconList(src.perks))
  set('trust_badges', iconList(src.trust_badges))
  set('checkout_trust', iconList(src.checkout_trust))
  for (const k of ['success_title', 'success_text', 'approval_pending_text', 'contact_fee_text', 'counselling_title', 'counselling_text', 'legal_name', 'billing_address'] as const) {
    set(k, str(src[k], 1000))
  }
  const g = str(src.gstin, 20)
  if (g !== undefined) set('gstin', g.toUpperCase().replace(/[^0-9A-Z]/g, ''))
  if (typeof src.terms_html === 'string') set('terms_html', stripDangerousHtml(src.terms_html))
  if (typeof src.refund_policy_html === 'string') set('refund_policy_html', stripDangerousHtml(src.refund_policy_html))
  set('max_installments', int(src.max_installments, 1, 12))
  set('low_seats_threshold', int(src.low_seats_threshold, 0, 1000))
  set('referral_reward_value', src.referral_reward_value != null ? Math.max(0, Number(src.referral_reward_value) || 0) : undefined)
  if (src.referral_reward_type === 'percent' || src.referral_reward_type === 'fixed') set('referral_reward_type', src.referral_reward_type)
  for (const k of ['require_terms', 'approval_required', 'show_seats_left', 'waitlist_enabled', 'scholarship_enabled', 'referral_enabled', 'referral_auto_issue', 'allow_stacking'] as const) {
    set(k, bool(src[k]))
  }
  set('form_fields', formFields(src.form_fields))
  if (src.reminders && typeof src.reminders === 'object') {
    const r = src.reminders as Partial<ReminderSettings>
    const base = DEFAULT_ENROLLMENT_SETTINGS.reminders
    out.reminders = {
      enabled: bool(r.enabled) ?? base.enabled,
      days_before: Array.isArray(r.days_before)
        ? Array.from(new Set(r.days_before.map((d) => int(d, 0, 60)).filter((d): d is number => d !== undefined))).slice(0, 6)
        : base.days_before,
      overdue_every_days: int(r.overdue_every_days, 0, 60) ?? base.overdue_every_days,
      channels: {
        email: bool(r.channels?.email) ?? base.channels.email,
        sms: bool(r.channels?.sms) ?? base.channels.sms,
        whatsapp: bool(r.channels?.whatsapp) ?? base.channels.whatsapp,
        in_app: bool(r.channels?.in_app) ?? base.channels.in_app,
      },
    }
  }
  return out
}

export function mergeSettings(...layers: Partial<EnrollmentSettings>[]): EnrollmentSettings {
  let s: EnrollmentSettings = { ...DEFAULT_ENROLLMENT_SETTINGS }
  for (const layer of layers) {
    const clean = sanitizeSettingsPatch(layer)
    s = { ...s, ...clean, reminders: { ...s.reminders, ...(clean.reminders || {}) } }
  }
  // Built-in fields an admin removed from the list stay available but disabled.
  const keys = new Set(s.form_fields.map((f) => f.key))
  if (!keys.has('student_email')) s.form_fields = [{ ...DEFAULT_FORM_FIELDS[0], enabled: false }, ...s.form_fields]
  return s
}

export async function getSettingsLayer(centerKey: number): Promise<Partial<EnrollmentSettings> | null> {
  try {
    const r = await pool.query(`SELECT settings FROM enrollment_settings WHERE center_key = $1`, [centerKey])
    if (!r.rows[0]) return null
    return sanitizeSettingsPatch(r.rows[0].settings)
  } catch {
    return null
  }
}

export async function getEnrollmentSettings(centerId: number | null | undefined): Promise<EnrollmentSettings> {
  const global = (await getSettingsLayer(0)) || {}
  const centre = centerId ? (await getSettingsLayer(Number(centerId))) || {} : {}
  return mergeSettings(global, centre)
}

export async function saveSettingsLayer(centerKey: number, patch: unknown, actor: string | null): Promise<EnrollmentSettings> {
  const clean = sanitizeSettingsPatch(patch)
  const json = JSON.stringify(clean)
  await pool.query(
    `INSERT INTO enrollment_settings (center_key, settings, updated_by) VALUES ($1, $2, $3)
     ON CONFLICT (center_key) DO UPDATE SET settings = EXCLUDED.settings, updated_by = EXCLUDED.updated_by`,
    [centerKey, json, actor]
  )
  return getEnrollmentSettings(centerKey || null)
}

export async function deleteSettingsLayer(centerKey: number): Promise<void> {
  await pool.query(`DELETE FROM enrollment_settings WHERE center_key = $1`, [centerKey])
}

/** Subset safe to ship to the public checkout / course page. */
export function publicEnrollmentSettings(s: EnrollmentSettings) {
  return {
    perks: s.perks,
    trust_badges: s.trust_badges,
    checkout_trust: s.checkout_trust,
    success_title: s.success_title,
    success_text: s.success_text,
    approval_pending_text: s.approval_pending_text,
    contact_fee_text: s.contact_fee_text,
    counselling_title: s.counselling_title,
    counselling_text: s.counselling_text,
    max_installments: s.max_installments,
    form_fields: s.form_fields.filter((f) => f.enabled),
    require_terms: s.require_terms,
    terms_html: s.terms_html,
    refund_policy_html: s.refund_policy_html,
    show_seats_left: s.show_seats_left,
    low_seats_threshold: s.low_seats_threshold,
    waitlist_enabled: s.waitlist_enabled,
    scholarship_enabled: s.scholarship_enabled,
    referral_enabled: s.referral_enabled,
    approval_required: s.approval_required,
  }
}

export type PublicEnrollmentSettings = ReturnType<typeof publicEnrollmentSettings>
