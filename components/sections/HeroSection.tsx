import { getHeroSlides } from '@/lib/api'
import { teemsCityFromCenterSlug } from '@/lib/center-mssql-city'
import type { HeroSlide } from '@/types'
import HeroSectionLayout from './HeroSectionLayout'

interface HeroSectionProps {
  centerId: number
  centerSlug: string
  centerName: string
  heroSlides?: HeroSlide[]
  heroBackgroundImage?: string | null
  showCenterBadge?: boolean
  heroBadgeBrand?: string
  heroBadgeTitle?: string
}

export default async function HeroSection({
  centerId,
  centerSlug,
  centerName,
  heroSlides: slidesProp,
  showCenterBadge = true,
  heroBadgeBrand,
  heroBadgeTitle,
}: HeroSectionProps) {
  const slides = slidesProp ?? (await getHeroSlides(centerId))

  return (
    <section
      id="hero"
      className={`premium-hero stage-hero ${showCenterBadge ? 'premium-hero--center stage-hero--center' : 'premium-hero--corporate stage-hero--corporate'}`}
    >
      <HeroSectionLayout
        slides={slides}
        centerId={centerId}
        centerName={centerName}
        centerSlug={centerSlug}
        centerLocationLabel={teemsCityFromCenterSlug(centerSlug)}
        showCenterBadge={showCenterBadge}
        heroBadgeBrand={heroBadgeBrand}
        heroBadgeTitle={heroBadgeTitle}
      />
    </section>
  )
}
