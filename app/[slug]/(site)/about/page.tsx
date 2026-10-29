import { notFound } from 'next/navigation'
import Link from 'next/link'
import { getCenterBySlug, getAboutSection } from '@/lib/api'
import { getHeroCommonBackgroundImageUrl } from '@/lib/hero-common-background'
import SafeImage from '@/components/website/PublicImage'
import BackToTopButton from '@/components/BackToTopButton'
import PageHero from '@/components/PageHero'
import SectionHeading from '@/components/ui/SectionHeading'

export const revalidate = 120

const DEFAULT_ABOUT = {
  title: 'Get To Know Us',
  heading: 'Empowering Students with Quality Education',
  description:
    'We are committed to academic excellence, building strong fundamentals, and helping students achieve their goals in competitive exams and beyond. Our experienced faculty, proven pedagogy, and result-oriented approach have made us a trusted name in test preparation and career-focused education.',
  subtext: 'Committed to excellence, student success, and long-term career growth.',
  features: [
    'Structured curriculum designed for competitive exams',
    'Experienced faculty with industry expertise',
    'Regular assessments and performance tracking',
    'Personalized attention and doubt-resolution support',
    'Proven track record of top ranks and selections',
  ],
  imageUrl: '/assets/img/about-img.jpg',
}

export default async function AboutPage({ params }: { params: { slug: string } }) {
  const center = await getCenterBySlug(params.slug)
  if (!center) notFound()

  const [aboutData, heroBackgroundImage] = await Promise.all([
    getAboutSection(center.id),
    getHeroCommonBackgroundImageUrl(),
  ])
  const title = aboutData?.title || DEFAULT_ABOUT.title
  const heading = aboutData?.heading || `${DEFAULT_ABOUT.heading} at ${center.name}`
  const description = aboutData?.description || DEFAULT_ABOUT.description.replace('We are', `${center.name} is`)
  const subtext = aboutData?.subtext || DEFAULT_ABOUT.subtext
  const featureList =
    Array.isArray(aboutData?.feature_list) && aboutData.feature_list.length > 0
      ? aboutData.feature_list
      : DEFAULT_ABOUT.features
  const imageUrl = aboutData?.image_url || DEFAULT_ABOUT.imageUrl
  const descriptionParagraphs =
    typeof description === 'string' ? description.split('\n').filter((p: string) => p.trim().length > 0) : [description]

  return (
    <>
      <main id="main-content" className="corporate-home bg-pub-paper text-pub-ink">
        <PageHero
          title="About"
          titleHighlight="Us"
          subtitle="Our mission, values, and commitment to your success"
          backgroundImage={heroBackgroundImage}
          breadcrumbs={[
            { label: 'Home', href: `/${center.slug}` },
            { label: 'About Us', active: true },
          ]}
        />

        <section className="pub-section premium-section premium-section--about">
          <div className="pub-container premium-about">
            <div className="premium-about__visual">
              <div className="premium-about__image">
                <SafeImage
                  src={imageUrl}
                  fallbackSrc={DEFAULT_ABOUT.imageUrl}
                  alt={heading}
                  width={640}
                  height={520}
                />
                <div className="premium-about__experience">
                  <p className="about-promo-heading">
                    <span>30+</span> Years of excellence
                  </p>
                </div>
              </div>
            </div>
            <div className="premium-about__content">
              <SectionHeading
                as="content-title"
                variant="about-left"
                align="left"
                badge={title}
                icon="ri-school-line"
                title={heading}
                className="section-heading--about-left mb-3"
              />
              {descriptionParagraphs.map((para: string, idx: number) => (
                <p key={idx} className="text-pub-muted">
                  {para}
                </p>
              ))}
              <ul className="content-feature-list list-style style3">
                {featureList.map((feature: string, index: number) => (
                  <li key={index}>
                    <span>
                      <i className="ri-check-double-line" />
                    </span>
                    {feature}
                  </li>
                ))}
              </ul>
              {subtext ? (
                <div className="about-subtext">
                  <p className="about-subtext-line">{subtext}</p>
                </div>
              ) : null}
              <div className="mt-5">
                <Link href={`/${center.slug}/enquiry`} className="pub-btn">
                  Talk to the centre <i className="ri-arrow-right-line" />
                </Link>
              </div>
            </div>
          </div>
        </section>
      </main>
      <BackToTopButton />
    </>
  )
}
