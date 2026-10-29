import dynamic from 'next/dynamic'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { getCenterBySlug, getAllSectionEnabledStates } from '@/lib/api'
import { loadCenterHomeSectionData, sectionFlagsFromStates } from '@/lib/center-home-section-data'
import HeroSection from '@/components/sections/HeroSection'
import BackToTopButton from '@/components/BackToTopButton'
import CorporateVisualManifesto from '@/components/website/CorporateVisualManifesto'
import CenterTemplate from '../template'

const NewsSection = dynamic(() => import('@/components/sections/NewsSection'))
const CoursesSection = dynamic(() => import('@/components/sections/CoursesSection'))
const ResultsSection = dynamic(() => import('@/components/sections/ResultsSection'))
const TextTestimonialsSection = dynamic(() => import('@/components/sections/TextTestimonialsSection'))
const VideoTestimonialsSection = dynamic(() => import('@/components/sections/VideoTestimonialsSection'))
const LeadershipSection = dynamic(() => import('@/components/sections/LeadershipSection'))
const SeniorFacultySection = dynamic(() => import('@/components/sections/SeniorFacultySection'))
const GallerySection = dynamic(() => import('@/components/sections/GallerySection'))
const BlogSection = dynamic(() => import('@/components/sections/BlogSection'))
const AboutSection = dynamic(() => import('@/components/sections/AboutSection'))
const CentersSection = dynamic(() => import('@/components/sections/CentersSection'))
const FAQSection = dynamic(() => import('@/components/sections/FAQSection'))

export const revalidate = 120

interface PageProps {
  params: {
    slug: string
  }
}

export default async function CenterPage({ params }: PageProps) {
  const center = await getCenterBySlug(params.slug)

  if (!center) {
    notFound()
  }

  const sectionStates = await getAllSectionEnabledStates(center.id)
  const sections = sectionFlagsFromStates(sectionStates)
  const homeData = await loadCenterHomeSectionData(center, params.slug, sectionStates)
  const base = `/${center.slug}`

  return (
    <CenterTemplate>
      <main id="main-content" className="corporate-home bg-pub-paper text-pub-ink">
        {sections.hero && (
          <HeroSection
            centerId={center.id}
            centerSlug={center.slug}
            centerName={center.name}
            heroSlides={homeData.heroSlides ?? undefined}
            heroBackgroundImage={homeData.heroBackgroundImage}
          />
        )}
        <section id="corporate-intent" className="pub-section" aria-label="Quick start">
          <div className="pub-container">
            <nav className="intent-rail" aria-label="Start here">
              <p className="intent-rail__label">Start here</p>
              <Link href="#department">
                <em>01</em>
                <span>Programmes</span>
              </Link>
              <Link href="#results">
                <em>02</em>
                <span>Results</span>
              </Link>
              <Link href={`${base}/faculty`}>
                <em>03</em>
                <span>Faculty</span>
              </Link>
              <Link href="#contact">
                <em>04</em>
                <span>Guidance</span>
              </Link>
            </nav>
          </div>
        </section>
        {sections.news && (
          <NewsSection
            centerId={center.id}
            centerSlug={params.slug}
            newsItems={homeData.newsItems ?? undefined}
            notifications={homeData.notifications ?? undefined}
          />
        )}
        {sections.courses && (
          <CoursesSection
            centerId={center.id}
            slug={params.slug}
            collegeCourses={homeData.collegeCourses}
            schoolCourses={homeData.schoolCourses}
            categoryIdByCourseName={homeData.preloginCategoryIdByCourseName}
            catalogCollegeTab={homeData.catalogCourses?.collegeTab ?? []}
            catalogSchool={homeData.catalogCourses?.school ?? []}
          />
        )}
        <CorporateVisualManifesto aboutHref={`${base}/about`} />
        {sections.results && (
          <ResultsSection
            centerId={center.id}
            centerName={center.name}
            results={homeData.results ?? undefined}
            viewAllHref={`${base}/results`}
          />
        )}
        {sections.videoTestimonials && (
          <VideoTestimonialsSection
            centerId={center.id}
            centerName={center.name}
            testimonials={homeData.videoTestimonials ?? undefined}
          />
        )}
        {sections.textTestimonials && (
          <TextTestimonialsSection
            centerId={center.id}
            centerName={center.name}
            testimonials={homeData.textTestimonials ?? undefined}
          />
        )}
        {sections.leadership && (
          <LeadershipSection
            centerId={center.id}
            centerName={center.name}
            leadership={homeData.leadership ?? undefined}
          />
        )}
        {sections.seniorFaculty && (
          <SeniorFacultySection
            centerId={center.id}
            faculty={homeData.seniorFaculty ?? undefined}
            viewAllHref={`${base}/faculty`}
          />
        )}
        {sections.gallery && (
          <GallerySection
            centerId={center.id}
            galleryImages={homeData.galleryImages ?? undefined}
            viewAllHref={`${base}/gallery`}
          />
        )}
        {sections.blog && (
          <BlogSection
            centerId={center.id}
            centerSlug={params.slug}
            posts={homeData.blogPosts ?? undefined}
          />
        )}
        {sections.about && (
          <AboutSection center={center} aboutData={homeData.aboutSection ?? undefined} />
        )}
        {sections.centers && (
          <CentersSection centerId={center.id} nearbyCenters={homeData.nearbyCenters ?? undefined} />
        )}
        {sections.faq && (
          <FAQSection
            centerId={center.id}
            centerName={center.name}
            faqs={homeData.faqs ?? undefined}
            viewAllHref={`${base}/faq`}
          />
        )}
      </main>
      <BackToTopButton />
    </CenterTemplate>
  )
}
