import pool from '@/lib/db'
import { getCourseMasterById } from '@/lib/course-masters-db'
import { isCourseAssignedToCenter, listCourseBatchesWithFees } from '@/lib/course-fees-db'
import { getBatchSeatInfo } from '@/lib/enrollment-engine'
import { getCentreCoursePrice, type CentrePrice } from '@/lib/course-centre-price'
import { getEnrollmentSettings } from '@/lib/enrollment-settings'

export type BrandCentreBatch = {
  id: number
  name: string
  timing: string | null
  startDate: string | null
  seatsLeft: number | null
  full: boolean
}

export type BrandCentreOffer = {
  centerId: number
  slug: string
  name: string
  address: string | null
  price: CentrePrice | null
  seatsLeft: number | null
  allFull: boolean
  showSeats: boolean
  batches: BrandCentreBatch[]
}

export async function getActiveCourseBySlug(key: string) {
  const numericId = Number.parseInt(key, 10)
  if (/^\d+$/.test(key) && numericId > 0) return getCourseMasterById(numericId)
  const r = await pool.query(`SELECT id FROM course_masters WHERE slug = $1 AND is_active = true LIMIT 1`, [key])
  const id = r.rows[0]?.id
  return id ? getCourseMasterById(Number(id)) : null
}

/** Every active centre that offers the course, with its own price, seats and batches. */
export async function listCentresOfferingCourse(courseId: number): Promise<BrandCentreOffer[]> {
  const centres = await pool.query(`SELECT * FROM centers WHERE is_active = true ORDER BY name ASC`)
  const out: BrandCentreOffer[] = []
  for (const c of centres.rows as Array<Record<string, unknown>>) {
    const centerId = Number(c.id)
    try {
      if (!(await isCourseAssignedToCenter(courseId, centerId))) continue
      const settings = await getEnrollmentSettings(centerId)
      const [price, batchRows] = await Promise.all([
        getCentreCoursePrice(courseId, centerId, settings.max_installments || 12),
        listCourseBatchesWithFees(courseId, centerId),
      ])
      const active = batchRows.filter((b) => b.is_active !== false)
      const seats = await getBatchSeatInfo(centerId, active.map((b) => Number(b.id)))
      const batches: BrandCentreBatch[] = active.map((b) => {
        const s = seats[Number(b.id)]
        const left = s && s.left != null ? Math.max(0, Number(s.left)) : null
        return {
          id: Number(b.id),
          name: b.batch_name || `Batch ${b.id}`,
          timing: b.batch_timing || null,
          startDate: b.start_date ? String(b.start_date) : null,
          seatsLeft: left,
          full: left === 0,
        }
      })
      const known = batches.filter((b) => b.seatsLeft != null)
      out.push({
        centerId,
        slug: String(c.slug),
        name: String(c.name || c.slug),
        address: (c.address as string) || (c.location as string) || null,
        price,
        seatsLeft: known.length ? known.reduce((a, b) => a + (b.seatsLeft || 0), 0) : null,
        allFull: batches.length > 0 && batches.every((b) => b.full),
        showSeats: settings.show_seats_left !== false,
        batches,
      })
    } catch (err) {
      console.error('listCentresOfferingCourse centre failed', centerId, err)
    }
  }
  return out
}
