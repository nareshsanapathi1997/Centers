import { Center } from '@/types'
import { getAboutSection } from '@/lib/api'
import SafeImage from '@/components/website/PublicImage'
import SectionHeading from '@/components/ui/SectionHeading'

interface AboutSectionProps {
  center: Center
  aboutData?: Awaited<ReturnType<typeof getAboutSection>>
}

export default async function AboutSection({ center, aboutData: aboutProp }: AboutSectionProps) {
  const aboutData = aboutProp !== undefined ? aboutProp : await getAboutSection(center.id)

  if (!aboutData) {
    return null
  }

  const title = aboutData.title || 'Get To Know Us'
  const heading = aboutData.heading || `Empowering Students with Quality Education at ${center.name}`
  const description = aboutData.description || center.description || ''
  const subtext = aboutData.subtext || 'Committed to academic excellence, student success, and long-term career growth'
  const featureList = aboutData.feature_list || []
  const imageUrl = aboutData.image_url || '/assets/img/about-img.jpg'
  const descriptionParagraphs =
    typeof description === 'string' ? description.split('\n').filter((p) => p.trim().length > 0) : []

  return (
    <section id="about" className="pub-section premium-section premium-section--about">
      <div className="pub-container premium-about">
        <div className="premium-about__visual">
          <div className="premium-about__image">
            <SafeImage
              className="img-fluid"
              src={imageUrl}
              fallbackSrc="/assets/img/about-img.jpg"
              alt={`About ${center.name}`}
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
          {typeof description === 'string' && descriptionParagraphs.length > 0 ? (
            descriptionParagraphs.map((para, idx) => (
              <p key={idx} className="text-pub-muted">
                {para}
              </p>
            ))
          ) : typeof description === 'string' ? (
            <p className="text-pub-muted">{description}</p>
          ) : (
            description
          )}
          {featureList && featureList.length > 0 ? (
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
          ) : null}
          {subtext ? (
            <div className="about-subtext">
              <p className="about-subtext-line">{subtext}</p>
            </div>
          ) : null}
        </div>
      </div>
    </section>
  )
}
