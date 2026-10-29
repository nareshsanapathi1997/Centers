import NewsDetailSidebarClient from './NewsDetailSidebarClient'
import type { NewsItem } from '@/types'

interface NewsDetailSidebarProps {
  centerSlug: string
  currentId: number
  newsItems: NewsItem[]
  notifications: NewsItem[]
}

export default function NewsDetailSidebar({
  centerSlug,
  currentId,
  newsItems,
  notifications,
}: NewsDetailSidebarProps) {
  const latestNews = newsItems.filter((item) => item.id !== currentId)
  const latestNotifications = notifications.filter((item) => item.id !== currentId)

  return (
    <NewsDetailSidebarClient
      centerSlug={centerSlug}
      newsItems={latestNews}
      notifications={latestNotifications}
    />
  )
}
