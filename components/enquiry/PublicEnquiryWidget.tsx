import EnquiryChatWidget from '@/components/enquiry/EnquiryChatWidget'
import { loadEnquiryCourseOptionsForCenter } from '@/lib/center-enquiry-courses'

type PublicEnquiryWidgetProps = {
  centerId: number
  centerSlug: string
  centerName: string
  subtitle?: string
  formSource?: string
}

export default async function PublicEnquiryWidget({
  centerId,
  centerSlug,
  centerName,
  subtitle,
  formSource,
}: PublicEnquiryWidgetProps) {
  const courseOptions = await loadEnquiryCourseOptionsForCenter(centerId, centerSlug)

  return (
    <EnquiryChatWidget
      centerId={centerId}
      centerSlug={centerSlug}
      centerName={centerName}
      courseOptions={courseOptions}
      subtitle={subtitle}
      formSource={formSource}
    />
  )
}
