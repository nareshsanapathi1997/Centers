import SuperAdminWebsiteHomeSubNav from '@/components/admin/SuperAdminWebsiteHomeSubNav'

export default function WebsiteHomeLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="space-y-4">
      <SuperAdminWebsiteHomeSubNav />
      {children}
    </div>
  )
}
