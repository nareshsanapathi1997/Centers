import { unstable_cache } from 'next/cache'
import pool from '@/lib/db'
import { getCenterBySlug } from '@/lib/api'
import type { Center, BlogPost, NewsItem } from '@/types'

export type WebsiteSectionConfig = {
  id: number
  section_key: string
  is_enabled: boolean
  display_order: number
}

export type WebsiteHomeSectionFlags = {
  hero: boolean
  news: boolean
  courses: boolean
  results: boolean
  videoTestimonials: boolean
  textTestimonials: boolean
  studentStories: boolean
  leadership: boolean
  seniorFaculty: boolean
  gallery: boolean
  blog: boolean
  about: boolean
  centers: boolean
  faq: boolean
}

const CACHE_TAG = 'website-home'
const REVALIDATE = 120

async function queryRows<T>(sql: string, params: unknown[] = []): Promise<T[]> {
  const result = await pool.query(sql, params)
  return result.rows as T[]
}

export async function getWebsiteSectionConfigs(): Promise<WebsiteSectionConfig[]> {
  return queryRows<WebsiteSectionConfig>(
    'SELECT * FROM website_section_configs ORDER BY display_order, id'
  )
}

export function websiteSectionFlagsFromConfigs(
  configs: WebsiteSectionConfig[]
): WebsiteHomeSectionFlags {
  const map = Object.fromEntries(configs.map((c) => [c.section_key, c.is_enabled]))
  return {
    hero: map.hero ?? true,
    news: map.news ?? true,
    courses: map.courses ?? true,
    results: map.results ?? true,
    videoTestimonials: map.video_testimonials ?? true,
    textTestimonials: map.text_testimonials ?? true,
    studentStories: map.student_stories ?? true,
    leadership: map.leadership ?? true,
    seniorFaculty: map.senior_faculty ?? true,
    gallery: map.gallery ?? true,
    blog: map.blog ?? true,
    about: map.about ?? true,
    centers: map.centers ?? true,
    faq: map.faq ?? true,
  }
}

export async function getWebsiteSectionEnabledStates(): Promise<Record<string, boolean>> {
  const configs = await getWebsiteSectionConfigs()
  return Object.fromEntries(configs.map((c) => [c.section_key, c.is_enabled]))
}

export const getCachedWebsiteSectionConfigs = unstable_cache(
  getWebsiteSectionConfigs,
  ['website-section-configs'],
  { revalidate: REVALIDATE, tags: [CACHE_TAG] }
)

async function getBrandingCenterSlug(): Promise<string | null> {
  const result = await pool.query(
    `SELECT setting_value FROM global_settings WHERE setting_key = 'website_home_branding_center_slug' LIMIT 1`
  )
  const slug = String(result.rows[0]?.setting_value || '').trim()
  return slug || null
}

export async function getWebsiteHomeBrandingCenter(): Promise<Center | null> {
  const configuredSlug = await getBrandingCenterSlug()
  if (configuredSlug) {
    const center = await getCenterBySlug(configuredSlug)
    if (center) return center
  }

  const fallback = await pool.query(
    `SELECT slug FROM centers WHERE is_active = true ORDER BY id ASC LIMIT 1`
  )
  const slug = fallback.rows[0]?.slug
  if (!slug) return null
  return getCenterBySlug(String(slug))
}

export async function getWebsiteHeroSlides() {
  return queryRows(
    `SELECT * FROM website_hero_slides WHERE is_active = true ORDER BY display_order, id`
  )
}

export async function getWebsiteNewsItems() {
  return queryRows(
    `SELECT * FROM website_news_items WHERE is_active = true AND is_notification = false ORDER BY display_order, id`
  )
}

export async function getWebsiteNotifications() {
  return queryRows(
    `SELECT * FROM website_news_items WHERE is_active = true AND is_notification = true ORDER BY display_order, id`
  )
}

export type WebsiteCourse = {
  id: number
  name: string
  category: string | null
  icon_class: string | null
  link_url: string | null
  display_order: number
  is_active: boolean
}

export async function getWebsiteCourses(): Promise<WebsiteCourse[]> {
  return queryRows<WebsiteCourse>(
    `SELECT * FROM website_courses WHERE is_active = true ORDER BY display_order, id`
  )
}

export async function getWebsiteResultImages() {
  return queryRows(
    `SELECT * FROM website_result_images
     WHERE is_active = true
     ORDER BY result_year DESC NULLS LAST, display_order, id`
  )
}

export async function getWebsiteVideoTestimonials() {
  return queryRows(
    `SELECT * FROM website_video_testimonials WHERE is_active = true ORDER BY display_order, id`
  )
}

export async function getWebsiteTextTestimonials() {
  return queryRows(
    `SELECT * FROM website_text_testimonials WHERE is_active = true ORDER BY display_order, id`
  )
}

export async function getWebsiteStudentStories() {
  return queryRows(
    `SELECT * FROM website_student_stories WHERE is_active = true ORDER BY display_order, id`
  )
}

export async function getWebsiteLeadership() {
  return queryRows(
    `SELECT * FROM website_leadership WHERE is_active = true ORDER BY display_order, id`
  )
}

export async function getWebsiteSeniorFaculty() {
  return queryRows(
    `SELECT * FROM website_senior_faculty WHERE is_active = true ORDER BY display_order, id`
  )
}

export async function getWebsiteGalleryImages() {
  return queryRows(
    `SELECT * FROM website_gallery_images WHERE is_active = true ORDER BY display_order, id`
  )
}

export async function getWebsiteBlogPosts(limit = 12) {
  return queryRows(
    `SELECT * FROM website_blog_posts WHERE is_published = true ORDER BY published_date DESC NULLS LAST, id DESC LIMIT $1`,
    [limit]
  )
}

export async function getWebsiteBlogPostBySlug(slug: string): Promise<BlogPost | null> {
  const rows = await queryRows<BlogPost>(
    `SELECT * FROM website_blog_posts WHERE slug = $1 AND is_published = true LIMIT 1`,
    [slug]
  )
  return rows[0] ?? null
}

export async function getWebsiteNewsItemById(id: number): Promise<NewsItem | null> {
  const rows = await queryRows<NewsItem>(
    `SELECT * FROM website_news_items WHERE id = $1 AND is_active = true LIMIT 1`,
    [id]
  )
  return rows[0] ?? null
}

export async function getWebsiteNewsSidebarItems(limit = 20) {
  return queryRows(
    `SELECT * FROM website_news_items WHERE is_active = true AND is_notification = false ORDER BY display_order, id LIMIT $1`,
    [limit]
  )
}

export async function getWebsiteNotificationSidebarItems(limit = 20) {
  return queryRows(
    `SELECT * FROM website_news_items WHERE is_active = true AND is_notification = true ORDER BY display_order, id LIMIT $1`,
    [limit]
  )
}

export type WebsiteAboutSection = {
  id: number
  title: string | null
  heading: string | null
  description: string | null
  subtext: string | null
  feature_list: string[] | null
  image_url: string | null
  is_active: boolean
  overview_hero_title?: string | null
  overview_hero_highlight?: string | null
  overview_hero_subtitle?: string | null
  overview_badge_years?: string | null
  overview_badge_label?: string | null
  philosophy_heading?: string | null
  philosophy_description?: string | null
  philosophy_image_url?: string | null
  philosophy_feature_list?: string[] | null
  philosophy_hero_title?: string | null
  philosophy_hero_highlight?: string | null
  philosophy_hero_subtitle?: string | null
  philosophy_eyebrow?: string | null
  promoters_hero_title?: string | null
  promoters_hero_highlight?: string | null
  promoters_hero_subtitle?: string | null
  promoters_eyebrow?: string | null
  promoters_section_heading?: string | null
  promoters_section_intro?: string | null
  promoters_directors_heading?: string | null
  promoters_directors_subtitle?: string | null
  promoters_message_label?: string | null
}

export async function getWebsiteAboutSection(): Promise<WebsiteAboutSection | null> {
  const rows = await queryRows<WebsiteAboutSection>(
    `SELECT * FROM website_about_sections ORDER BY id LIMIT 1`
  )
  return rows[0] ?? null
}

export async function getWebsiteFaqs() {
  return queryRows(`SELECT * FROM website_faqs WHERE is_active = true ORDER BY display_order, id`)
}

export async function getWebsiteFeaturedCenters(): Promise<Center[]> {
  const result = await pool.query(
    `SELECT c.*
     FROM website_featured_centers wfc
     JOIN centers c ON c.id = wfc.center_id
     WHERE c.is_active = true
     ORDER BY wfc.display_order, wfc.id`
  )
  return result.rows as Center[]
}
