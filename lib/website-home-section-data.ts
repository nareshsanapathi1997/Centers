import { getHeroCommonBackgroundImageUrl } from '@/lib/hero-common-background'
import {
  getWebsiteCatalogCourses,
  type WebsiteCatalogCoursesPayload,
} from '@/lib/website-catalog-courses'
import {
  getCachedWebsiteSectionConfigs,
  getWebsiteAboutSection,
  getWebsiteBlogPosts,
  getWebsiteFaqs,
  getWebsiteGalleryImages,
  getWebsiteHeroSlides,
  getWebsiteNewsItems,
  getWebsiteNotifications,
  getWebsiteResultImages,
  getWebsiteStudentStories,
  getWebsiteTextTestimonials,
  getWebsiteVideoTestimonials,
  websiteSectionFlagsFromConfigs,
  type WebsiteHomeSectionFlags,
} from '@/lib/website-home-db'
import type { Course } from '@/types'

const EMPTY_CATALOG: WebsiteCatalogCoursesPayload = { collegeTab: [], school: [] }

export type WebsiteHomeSectionData = {
  heroSlides: Awaited<ReturnType<typeof getWebsiteHeroSlides>>
  heroBackgroundImage: string | null
  newsItems: Awaited<ReturnType<typeof getWebsiteNewsItems>>
  notifications: Awaited<ReturnType<typeof getWebsiteNotifications>>
  collegeCourses: Course[]
  schoolCourses: Course[]
  catalogCourses: WebsiteCatalogCoursesPayload
  results: Awaited<ReturnType<typeof getWebsiteResultImages>>
  videoTestimonials: Awaited<ReturnType<typeof getWebsiteVideoTestimonials>>
  textTestimonials: Awaited<ReturnType<typeof getWebsiteTextTestimonials>>
  studentStories: Awaited<ReturnType<typeof getWebsiteStudentStories>>
  galleryImages: Awaited<ReturnType<typeof getWebsiteGalleryImages>>
  blogPosts: Awaited<ReturnType<typeof getWebsiteBlogPosts>>
  aboutSection: Awaited<ReturnType<typeof getWebsiteAboutSection>>
  faqs: Awaited<ReturnType<typeof getWebsiteFaqs>>
}

export async function loadWebsiteHomeSectionData(
  flags: WebsiteHomeSectionFlags
): Promise<WebsiteHomeSectionData> {
  const [
    heroSlides,
    heroBackgroundImage,
    newsItems,
    notifications,
    catalogCourses,
    results,
    videoTestimonials,
    textTestimonials,
    studentStories,
    galleryImages,
    blogPosts,
    aboutSection,
    faqs,
  ] = await Promise.all([
    flags.hero ? getWebsiteHeroSlides() : Promise.resolve([]),
    flags.hero ? getHeroCommonBackgroundImageUrl() : Promise.resolve(null),
    flags.news ? getWebsiteNewsItems() : Promise.resolve([]),
    flags.news ? getWebsiteNotifications() : Promise.resolve([]),
    flags.courses ? getWebsiteCatalogCourses() : Promise.resolve(EMPTY_CATALOG),
    flags.results ? getWebsiteResultImages() : Promise.resolve([]),
    flags.videoTestimonials ? getWebsiteVideoTestimonials() : Promise.resolve([]),
    flags.textTestimonials ? getWebsiteTextTestimonials() : Promise.resolve([]),
    flags.studentStories ? getWebsiteStudentStories() : Promise.resolve([]),
    flags.gallery ? getWebsiteGalleryImages() : Promise.resolve([]),
    flags.blog ? getWebsiteBlogPosts(12) : Promise.resolve([]),
    flags.about ? getWebsiteAboutSection() : Promise.resolve(null),
    flags.faq ? getWebsiteFaqs() : Promise.resolve([]),
  ])

  return {
    heroSlides,
    heroBackgroundImage,
    newsItems,
    notifications,
    collegeCourses: [],
    schoolCourses: [],
    catalogCourses,
    results,
    videoTestimonials,
    textTestimonials,
    studentStories,
    galleryImages,
    blogPosts,
    aboutSection,
    faqs,
  }
}

export async function getWebsiteHomePageBundle() {
  const configs = await getCachedWebsiteSectionConfigs()
  const flags = websiteSectionFlagsFromConfigs(configs)
  const data = await loadWebsiteHomeSectionData(flags)
  return { flags, data, configs }
}

export { websiteSectionFlagsFromConfigs }
