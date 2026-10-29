import { unstable_cache } from 'next/cache'
import pool from '@/lib/db'
import type { Vacancy } from '@/types'

export type WebsiteVacancyRow = Vacancy & {
  center_name: string
  center_slug: string
  center_address: string | null
  center_phone: string[] | null
  center_email: string | null
  center_whatsapp: string | null
  center_working_hours: string | null
}

async function queryAllActiveVacancies(): Promise<WebsiteVacancyRow[]> {
  const result = await pool.query<WebsiteVacancyRow>(
    `SELECT v.*,
            c.name AS center_name,
            c.slug AS center_slug,
            c.address AS center_address,
            c.phone AS center_phone,
            c.email AS center_email,
            c.social_whatsapp AS center_whatsapp,
            c.working_hours AS center_working_hours
     FROM vacancies v
     INNER JOIN centers c ON c.id = v.center_id
     WHERE v.is_active = true AND c.is_active = true
     ORDER BY c.name ASC, v.display_order ASC, v.created_at DESC`
  )
  return result.rows
}

export const getAllWebsiteVacancies = unstable_cache(
  queryAllActiveVacancies,
  ['website-all-vacancies'],
  { revalidate: 120, tags: ['website-vacancies'] }
)

export function groupVacanciesByCenter(rows: WebsiteVacancyRow[]) {
  const groups = new Map<
    string,
    { centerName: string; centerSlug: string; vacancies: WebsiteVacancyRow[] }
  >()
  for (const row of rows) {
    const key = row.center_slug || String(row.center_id)
    if (!groups.has(key)) {
      groups.set(key, {
        centerName: row.center_name,
        centerSlug: row.center_slug,
        vacancies: [],
      })
    }
    groups.get(key)!.vacancies.push(row)
  }
  return Array.from(groups.values())
}
