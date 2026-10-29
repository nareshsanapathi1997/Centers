import { getNewsItems, getNotifications } from '@/lib/api'
import type { NewsItem } from '@/types'
import NewsMarqueeCard from './NewsMarqueeCard'

interface NewsSectionProps {
  centerId: number
  centerSlug: string
  newsItems?: NewsItem[]
  notifications?: NewsItem[]
}

export default async function NewsSection({
  centerId,
  centerSlug,
  newsItems: newsProp,
  notifications: notifProp,
}: NewsSectionProps) {
  const [newsItems, notifications] = await Promise.all([
    newsProp ?? getNewsItems(centerId),
    notifProp ?? getNotifications(centerId),
  ])

  const news = newsItems.length > 0 ? newsItems : []
  const notifs = notifications.length > 0 ? notifications : []

  return (
    <section className="pub-section premium-section" aria-label="Latest updates">
      <div className="pub-container">
        <div className="premium-updates-intro">
          <div>
            <span className="pub-eyebrow newsroom-kicker">Live desk</span>
            <h2 className="mt-2 text-[clamp(1.55rem,3.2vw,2.35rem)]">What’s happening now.</h2>
          </div>
          <p className="max-w-md text-pub-muted">
            Announcements, exam alerts, and centre updates — kept current so you never miss a deadline or a batch opening.
          </p>
        </div>
        <div className="premium-updates-grid">
          <NewsMarqueeCard
            title="Latest News and Events"
            iconClass="ri-newspaper-line"
            items={news}
            type="news"
            centerId={centerId}
            centerSlug={centerSlug}
            emptyMessage="No news items available"
          />
          <NewsMarqueeCard
            title="Notifications"
            iconClass="ri-notification-3-line"
            items={notifs}
            type="notifications"
            centerId={centerId}
            centerSlug={centerSlug}
            emptyMessage="No notifications available"
          />
        </div>
      </div>
    </section>
  )
}
