import pool from '@/lib/db'
import { listFeeCoursesForCenter } from '@/lib/course-fees-db'
import { getCentreCoursePrice } from '@/lib/course-centre-price'

export type CentreOption = { id: number; slug: string; name: string; label: string }

/** Drop the shared brand prefix ("EduSphere Pune Deccan" -> "Pune Deccan"). */
export function centreLabels(names: string[]): string[] {
  const split = names.map((n) => n.trim().split(/\s+/))
  let k = 0
  if (split.length > 1) {
    while (split.every((w) => w.length > k + 1 && w[k] === split[0][k])) k++
  }
  return split.map((w) => w.slice(k).join(' '))
}

export async function listActiveCentreOptions(): Promise<CentreOption[]> {
  const r = await pool.query(`SELECT id, slug, name FROM centers WHERE is_active = true ORDER BY name ASC`)
  const rows = r.rows as Array<{ id: number; slug: string; name: string | null }>
  const labels = centreLabels(rows.map((c) => String(c.name || c.slug)))
  return rows.map((c, i) => ({ id: Number(c.id), slug: String(c.slug), name: String(c.name || c.slug), label: labels[i] }))
}

export async function offeredCourseIds(centerId: number): Promise<Set<number>> {
  try {
    const list = await listFeeCoursesForCenter(centerId)
    return new Set(list.map((c) => Number(c.course_master_id)))
  } catch (err) {
    console.error('offeredCourseIds failed', centerId, err)
    return new Set()
  }
}

/** Resolve ?centre= (or "all") then the last-centre cookie. Returns '' for all centres. */
export function resolveSelectedCentre(
  options: CentreOption[],
  param: string | string[] | undefined,
  cookieSlug: string | undefined,
): string {
  const p = (Array.isArray(param) ? param[0] : param)?.trim() || ''
  if (p === 'all') return ''
  if (p && options.some((o) => o.slug === p)) return p
  if (!p && cookieSlug && options.some((o) => o.slug === cookieSlug)) return cookieSlug
  return ''
}

/** Courses offered at a centre, with that centre's price written into the card price fields. */
export async function coursesForCentre(
  courses: Record<string, unknown>[],
  centerId: number,
  ids?: Set<number>,
): Promise<Record<string, unknown>[]> {
  const set = ids ?? (await offeredCourseIds(centerId))
  const kept = courses.filter((c) => set.has(Number(c.id)))
  return Promise.all(
    kept.map(async (c) => {
      const p = await getCentreCoursePrice(Number(c.id), centerId).catch(() => null)
      if (!p || p.final == null) return c
      const hasSave = p.original != null && p.original > p.final
      return {
        ...c,
        originalPrice: String(hasSave ? p.original : p.final),
        discountedPrice: hasSave ? String(p.final) : '',
        original_price: null,
        discounted_price: null,
        offer_details: p.discountLabel || c.offer_details || null,
      }
    }),
  )
}

/** Per-centre course counts for a list of courses. */
export async function centreCounts(options: CentreOption[], courses: Record<string, unknown>[]) {
  const sets = await Promise.all(options.map((o) => offeredCourseIds(o.id)))
  const counts: Record<string, number> = {}
  options.forEach((o, i) => {
    counts[o.slug] = courses.filter((c) => sets[i].has(Number(c.id))).length
  })
  return { counts, sets }
}

/** No centre selected: keep a price only when every offering centre charges the same. */
export async function applyBrandPrices(
  courses: Record<string, unknown>[],
  options: CentreOption[],
  sets: Set<number>[],
): Promise<Record<string, unknown>[]> {
  return Promise.all(
    courses.map(async (c) => {
      const id = Number(c.id)
      const at = options.filter((_, i) => sets[i].has(id))
      if (!at.length) return c
      const prices = await Promise.all(at.map((o) => getCentreCoursePrice(id, o.id).catch(() => null)))
      const finals = prices.map((p) => (p && p.final != null ? p.final : null))
      if (finals.every((f) => f != null && f === finals[0])) {
        const p = prices[0]!
        const hasSave = p.original != null && p.original > (p.final as number)
        return { ...c, originalPrice: String(hasSave ? p.original : p.final), discountedPrice: hasSave ? String(p.final) : '', original_price: null, discounted_price: null }
      }
      return { ...c, fees_vary: true, originalPrice: '', discountedPrice: '', original_price: null, discounted_price: null, offer_details: null }
    }),
  )
}
