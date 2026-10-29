import HashScrollRestore from '@/components/HashScrollRestore'
import HistoryNavigationFix from '@/components/HistoryNavigationFix'
import NavbarCollapseReset from '@/components/template/NavbarCollapseReset'
import WebsiteHeader from '@/components/website/WebsiteHeader'
import WebsiteFooter from '@/components/website/WebsiteFooter'
import CenterWhatsAppModal from '@/components/shared/CenterWhatsAppModal'
import PublicEnquiryWidget from '@/components/enquiry/PublicEnquiryWidget'
import { getWebsiteHomeBrandingCenter } from '@/lib/website-home-db'
import { toCenterSharePayload } from '@/lib/center-location-share'

export default async function WebsiteHomeTemplate({ children }: { children: React.ReactNode }) {
  const brandingCenter = await getWebsiteHomeBrandingCenter()
  const defaultPayload = brandingCenter ? toCenterSharePayload(brandingCenter) : null

  return (
    <div className="page-wrapper loaded min-h-screen bg-pub-paper text-pub-ink" data-cm-public="true">
      <HashScrollRestore />
      <HistoryNavigationFix />
      <NavbarCollapseReset />
      <WebsiteHeader />
      {children}
      <WebsiteFooter />
      {brandingCenter ? (
        <PublicEnquiryWidget
          centerId={brandingCenter.id}
          centerSlug={brandingCenter.slug}
          centerName={brandingCenter.name}
          subtitle="Connect with EduSphere Experts"
          formSource="Website - Enquiry widget"
        />
      ) : null}
      <CenterWhatsAppModal defaultPayload={defaultPayload} />
    </div>
  )
}
