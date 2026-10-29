import { revalidateTag } from 'next/cache'
import pool from './db'
import { redisDel } from '@/lib/redis-cache'

/**
 * Cache tags for a center's public site content. These mirror the tags attached
 * in `lib/api.ts`; a mismatch silently does nothing, so both lists must be kept
 * in step.
 *
 * Without an explicit invalidation, a CMS save only became visible after the
 * 120 second ISR window expired, which made every edit look like it had failed.
 */
export const CENTER_CACHE_AREAS = {
  about: ['center-about'],
  alerts: ['center-alerts'],
  blog: ['center-blog'],
  center: ['center-slug'],
  courses: ['center-courses', 'center-catalog'],
  cta_sliders: ['center-cta'],
  custom_sections: ['center-custom-sections'],
  faq: ['center-faq'],
  gallery: ['center-gallery'],
  hero: ['center-hero'],
  leadership: ['center-leadership'],
  news: ['center-news'],
  notifications: ['center-notifications'],
  results: ['center-results'],
  sections: ['center-sections'],
  senior_faculty: ['center-senior-faculty'],
  seo: ['center-seo'],
  student_stories: ['center-student-stories'],
  testimonials: ['center-testimonials'],
  vacancies: ['center-vacancies'],
} as const

export type CenterCacheArea = keyof typeof CENTER_CACHE_AREAS

/**
 * Invalidate the public caches for one area of a center's site.
 *
 * Safe to call from any route handler: `revalidateTag` throws outside a request
 * scope, and a failed invalidation must never fail the write that succeeded.
 */
export function revalidateCenterArea(centerId: number, ...areas: CenterCacheArea[]): void {
  try {
    for (const area of areas) {
      for (const prefix of CENTER_CACHE_AREAS[area]) {
        revalidateTag(`${prefix}-${centerId}`)
      }
    }
  } catch (error) {
    console.warn('[center-cache] revalidate failed:', error)
  }
}

/**
 * Also invalidates the slug-keyed center record, which the public routes look up
 * before anything else. Used when center details themselves change.
 */
export async function revalidateCenterBySlug(centerId: number): Promise<void> {
  try {
    const result = await pool.query('SELECT slug FROM centers WHERE id = $1', [centerId])
    const slug = result.rows[0]?.slug
    if (slug) {
      revalidateTag(`center-slug-${slug}`)
      await redisDel(`center:slug:${slug}`)
    }
  } catch (error) {
    console.warn('[center-cache] slug revalidate failed:', error)
  }
}
