import PageHero from '@/components/PageHero'
import { notFound } from 'next/navigation'
import BackToTopButton from '@/components/BackToTopButton'
import CentersSection from '@/components/sections/CentersSection'
import { getAllCenters } from '@/lib/api'
import { getWebsiteHomeBrandingCenter } from '@/lib/website-home-db'

export const revalidate = 120

export default async function WebsiteCentersPage() {
  const brandingCenter = await getWebsiteHomeBrandingCenter()
  if (!brandingCenter) notFound()

  const centers = await getAllCenters()

  return (
    <>
      <main id="main-content" className="corporate-home bg-pub-paper text-pub-ink">
        <PageHero title="Your goals." titleHighlight="Your neighbourhood." subtitle="Find your EduSphere centre and meet the people who will help you move forward." breadcrumbs={[{ label: 'Home', href: '/' }, { label: 'Centres', active: true }]} />
        <CentersSection
          centerId={brandingCenter.id}
          nearbyCenters={centers}
          linkToCenterSite
          standalone
          sectionTitle="Our Centres"
          sectionHeading="EduSphere Centres Near You"
        />
      </main>
      <BackToTopButton />
    </>
  )
}
