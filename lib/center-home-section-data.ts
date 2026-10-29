import {
  getAboutSection,
  getBlogPosts,
  getCourses,
  getFAQs,
  getGalleryImages,
  getHeroSlides,
  getLeadership,
  getNearbyCenters,
  getNewsItems,
  getNotifications,
  getResultImages,
  getSeniorFaculty,
  getStudentStories,
  getTextTestimonials,
  getVideoTestimonials,
} from '@/lib/api'
import { getHeroCommonBackgroundImageUrl } from '@/lib/hero-common-background'
import { getCategoryMapsForCourseNames } from '@/lib/category-paths'
import { getCenterCatalogCoursesForCenterId, type CenterCatalogCoursesPayload } from '@/lib/center-catalog-courses'
import type {
  BlogPost,
  Center,
  Course,
  FAQ,
  GalleryImage,
  HeroSlide,
  Leadership,
  NewsItem,
  ResultImage,
  SeniorFaculty,
  TextTestimonial,
  VideoTestimonial,
} from '@/types'

export type CenterHomeSectionFlags = {
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

export type CenterHomeSectionData = {
  collegeCourses: Course[]
  schoolCourses: Course[]
  heroSlides: HeroSlide[] | null
  heroBackgroundImage: string | null
  newsItems: NewsItem[] | null
  notifications: NewsItem[] | null
  catalogCourses: CenterCatalogCoursesPayload | null
  preloginCategoryPathByName: Record<string, string>
  preloginCategoryIdByCourseName: Record<string, number>
  results: ResultImage[] | null
  videoTestimonials: VideoTestimonial[] | null
  textTestimonials: TextTestimonial[] | null
  studentStories: Record<string, unknown>[] | null
  leadership: Leadership[] | null
  seniorFaculty: SeniorFaculty[] | null
  galleryImages: GalleryImage[] | null
  blogPosts: BlogPost[] | null
  aboutSection: Awaited<ReturnType<typeof getAboutSection>> | null
  nearbyCenters: Center[] | null
  faqs: FAQ[] | null
}

function sectionFlagsFromStates(states: Record<string, boolean>): CenterHomeSectionFlags {
  return {
    hero: states.hero ?? true,
    news: states.news ?? true,
    courses: states.courses ?? true,
    results: states.results ?? true,
    videoTestimonials: states.video_testimonials ?? true,
    textTestimonials: states.text_testimonials ?? true,
    studentStories: states.student_stories ?? true,
    leadership: states.leadership ?? true,
    seniorFaculty: states.senior_faculty ?? true,
    gallery: states.gallery ?? true,
    blog: states.blog ?? true,
    about: states.about ?? true,
    centers: states.centers ?? true,
    faq: states.faq ?? true,
  }
}

/**
 * Load home page section data in one parallel batch (only queries for enabled sections).
 */
export async function loadCenterHomeSectionData(
  center: Center,
  slug: string,
  sectionStates: Record<string, boolean>
): Promise<CenterHomeSectionData> {
  const flags = sectionFlagsFromStates(sectionStates)
  const needCourses = flags.hero || flags.courses

  const [
    collegeCourses,
    schoolCourses,
    heroBundle,
    newsBundle,
    catalogCourses,
    results,
    videoTestimonials,
    textTestimonials,
    studentStories,
    leadership,
    seniorFaculty,
    galleryImages,
    blogPosts,
    aboutSection,
    nearbyCenters,
    faqs,
  ] = await Promise.all([
    needCourses ? getCourses(center.id, 'college_level') : Promise.resolve([]),
    needCourses ? getCourses(center.id, 'school_level') : Promise.resolve([]),
    flags.hero
      ? Promise.all([getHeroSlides(center.id), getHeroCommonBackgroundImageUrl()])
      : Promise.resolve(null),
    flags.news
      ? Promise.all([getNewsItems(center.id), getNotifications(center.id)])
      : Promise.resolve(null),
    needCourses ? getCenterCatalogCoursesForCenterId(center.id) : Promise.resolve(null),
    flags.results ? getResultImages(center.id) : Promise.resolve(null),
    flags.videoTestimonials ? getVideoTestimonials(center.id) : Promise.resolve(null),
    flags.textTestimonials ? getTextTestimonials(center.id) : Promise.resolve(null),
    flags.studentStories ? getStudentStories(center.id) : Promise.resolve(null),
    flags.leadership ? getLeadership(center.id) : Promise.resolve([]),
    flags.seniorFaculty ? getSeniorFaculty(center.id) : Promise.resolve(null),
    flags.gallery ? getGalleryImages(center.id) : Promise.resolve(null),
    flags.blog ? getBlogPosts(center.id, 12) : Promise.resolve(null),
    flags.about ? getAboutSection(center.id) : Promise.resolve(null),
    flags.centers ? getNearbyCenters(center.id) : Promise.resolve(null),
    flags.faq ? getFAQs(center.id) : Promise.resolve(null),
  ])

  let pathByName: Record<string, string> = {}
  let idByCourseName: Record<string, number> = {}
  const mapNames: string[] = [
    ...collegeCourses.map((c) => c.name),
    ...schoolCourses.map((c) => c.name),
  ]
  if (catalogCourses) {
    for (const group of [...catalogCourses.collegeTab, ...catalogCourses.school]) {
      const n = group.course_category_name?.trim()
      if (n) mapNames.push(n)
    }
  }
  if (needCourses && mapNames.length > 0) {
    const maps = await getCategoryMapsForCourseNames(mapNames)
    pathByName = maps.pathByName
    idByCourseName = maps.idByCourseName
  }

  return {
    collegeCourses,
    schoolCourses,
    heroSlides: heroBundle ? heroBundle[0] : null,
    heroBackgroundImage: heroBundle ? heroBundle[1] : null,
    newsItems: newsBundle ? newsBundle[0] : null,
    notifications: newsBundle ? newsBundle[1] : null,
    catalogCourses,
    preloginCategoryPathByName: pathByName,
    preloginCategoryIdByCourseName: idByCourseName,
    results,
    videoTestimonials,
    textTestimonials,
    studentStories,
    leadership,
    seniorFaculty,
    galleryImages,
    blogPosts,
    aboutSection,
    nearbyCenters,
    faqs,
  }
}

export { sectionFlagsFromStates }
