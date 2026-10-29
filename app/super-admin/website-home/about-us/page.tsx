import { Suspense } from 'react'
import WebsiteAboutUsAdmin from '@/components/admin/website-home/WebsiteAboutUsAdmin'

export default function SuperAdminWebsiteHomeAboutUsPage() {
  return (
    <Suspense fallback={null}>
      <WebsiteAboutUsAdmin />
    </Suspense>
  )
}
