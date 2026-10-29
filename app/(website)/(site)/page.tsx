import dynamic from 'next/dynamic'
import { notFound } from 'next/navigation'
import BackToTopButton from '@/components/BackToTopButton'
import HeroSection from '@/components/sections/HeroSection'
import { getWebsiteHomeBrandingCenter } from '@/lib/website-home-db'
import { getWebsiteHomePageBundle } from '@/lib/website-home-section-data'
import { getCachedWebsiteChromeSettings } from '@/lib/website-chrome-db'
import Link from 'next/link'
import CorporateVisualManifesto from '@/components/website/CorporateVisualManifesto'

const NewsSection = dynamic(() => import('@/components/sections/NewsSection'))
const CoursesSection = dynamic(() => import('@/components/sections/CoursesSection'))
const ResultsSection = dynamic(() => import('@/components/website/WebsiteResultsSection'))
const TextTestimonialsSection = dynamic(() => import('@/components/sections/TextTestimonialsSection'))
const VideoTestimonialsSection = dynamic(() => import('@/components/sections/VideoTestimonialsSection'))
const GallerySection = dynamic(() => import('@/components/sections/GallerySection'))
const BlogSection = dynamic(() => import('@/components/sections/BlogSection'))
const AboutSection = dynamic(() => import('@/components/sections/AboutSection'))
const FAQSection = dynamic(() => import('@/components/sections/FAQSection'))

export const revalidate = 120

export default async function WebsiteHomePage() {
  const [brandingCenter, chrome] = await Promise.all([
    getWebsiteHomeBrandingCenter(),
    getCachedWebsiteChromeSettings(),
  ])
  if (!brandingCenter) notFound()

  const { flags, data } = await getWebsiteHomePageBundle()

  return (
    <>
      <main id="main-content" className="corporate-home bg-pub-paper text-pub-ink">
        {flags.hero && (
          <HeroSection
            centerId={brandingCenter.id}
            centerSlug={brandingCenter.slug}
            centerName={brandingCenter.name}
            heroSlides={data.heroSlides as never}
            heroBackgroundImage={data.heroBackgroundImage}
            showCenterBadge={false}
            heroBadgeBrand={chrome.heroBadgeBrand}
            heroBadgeTitle={chrome.heroBadgeTitle}
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
              <Link href="/centers">
                <em>02</em>
                <span>Centres</span>
              </Link>
              <Link href="#results">
                <em>03</em>
                <span>Results</span>
              </Link>
              <Link href="#contact">
                <em>04</em>
                <span>Guidance</span>
              </Link>
            </nav>
          </div>
        </section>
        {flags.news && (
          <NewsSection
            centerId={brandingCenter.id}
            centerSlug=""
            newsItems={data.newsItems as never}
            notifications={data.notifications as never}
          />
        )}
        {flags.courses && (
          <CoursesSection
            centerId={brandingCenter.id}
            slug=""
            collegeCourses={[]}
            schoolCourses={[]}
            catalogCollegeTab={data.catalogCourses.collegeTab}
            catalogSchool={data.catalogCourses.school}
          />
        )}
        <CorporateVisualManifesto />
        {flags.results && (
          <ResultsSection
            results={data.results as never}
            siteName={chrome.siteName || brandingCenter.name}
          />
        )}
        {flags.videoTestimonials && (
          <VideoTestimonialsSection
            centerId={brandingCenter.id}
            testimonials={data.videoTestimonials as never}
          />
        )}
        {flags.textTestimonials && (
          <TextTestimonialsSection
            centerId={brandingCenter.id}
            testimonials={data.textTestimonials as never}
          />
        )}
        {flags.gallery && (
          <GallerySection
            centerId={brandingCenter.id}
            galleryImages={data.galleryImages as never}
            viewAllHref="/gallery"
          />
        )}
        {flags.blog && (
          <BlogSection
            centerId={brandingCenter.id}
            centerSlug=""
            posts={data.blogPosts as never}
          />
        )}
        {flags.about && (
          <AboutSection center={brandingCenter} aboutData={data.aboutSection as never} />
        )}
        {flags.faq && (
          <FAQSection
            centerId={brandingCenter.id}
            centerName={brandingCenter.name}
            faqs={data.faqs as never}
            viewAllHref="/faq"
          />
        )}
      </main>
      <BackToTopButton />
    </>
  )
}
