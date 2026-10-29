import WebsiteHomeTemplate from '@/components/website/WebsiteHomeTemplate'

export default function WebsiteSiteLayout({ children }: { children: React.ReactNode }) {
  return <WebsiteHomeTemplate>{children}</WebsiteHomeTemplate>
}
