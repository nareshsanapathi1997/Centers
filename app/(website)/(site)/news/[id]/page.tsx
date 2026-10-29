import { notFound } from 'next/navigation'
import { withBasePath } from '@/lib/with-base-path'
import BackToTopButton from '@/components/BackToTopButton'
import PageHero from '@/components/PageHero'
import ContentPagesStyles from '@/components/ContentPagesStyles'
import NewsDetailSidebar from '@/components/news/NewsDetailSidebar'
import { getHeroCommonBackgroundImageUrl } from '@/lib/hero-common-background'
import {
  getWebsiteHomeBrandingCenter,
  getWebsiteNewsItemById,
  getWebsiteNewsSidebarItems,
  getWebsiteNotificationSidebarItems,
} from '@/lib/website-home-db'
import type { NewsItem } from '@/types'
import { sanitizeCmsHtml } from '@/lib/sanitize-html'

export const revalidate = 120

export default async function WebsiteNewsDetailPage({ params }: { params: { id: string } }) {
  const brandingCenter = await getWebsiteHomeBrandingCenter()
  if (!brandingCenter) notFound()

  const id = parseInt(params.id, 10)
  if (Number.isNaN(id)) notFound()

  const [item, heroBackgroundImage, newsItems, notifications] = await Promise.all([
    getWebsiteNewsItemById(id),
    getHeroCommonBackgroundImageUrl(),
    getWebsiteNewsSidebarItems(20),
    getWebsiteNotificationSidebarItems(20),
  ])

  if (!item) notFound()

  const newsItem = item as NewsItem
  const isNotification = newsItem.is_notification === true
  const label = isNotification ? 'Notification' : 'News'

  return (
    <>
      <link rel="stylesheet" href={withBasePath('/assets/css/news-detail-sidebar.css')} />
      <ContentPagesStyles />
      <main id="main-content" style={{ paddingTop: 0 }}>
        <PageHero
          eyebrow="News"
          title={newsItem.title || label}
          backgroundImage={heroBackgroundImage}
          breadcrumbs={[
            { label: 'Home', href: '/' },
            { label: 'News', href: '/news' },
            { label: newsItem.title || 'Detail', active: true },
          ]}
        />

        <section className="news-details-wrap ptb-100">
          <div className="container-fluid news-details-wrap__container">
            <div className="row g-4">
              <div className="col-lg-9">
                <article className="cp-card">
                  <div className="cp-card-body">
                    <div className="text-sm text-gray-500 dark:text-gray-400 mb-4">
                      {newsItem.created_at
                        ? new Date(newsItem.created_at).toLocaleDateString(undefined, { dateStyle: 'long' })
                        : ''}
                      {newsItem.is_notification && <span className="ml-2"> · Notification</span>}
                    </div>
                    {newsItem.content ? (
                      <div
                        className="news-detail-content prose dark:prose-invert max-w-none"
                        dangerouslySetInnerHTML={{ __html: sanitizeCmsHtml(newsItem.content) }}
                      />
                    ) : (
                      <p className="text-gray-600 dark:text-gray-400">No content.</p>
                    )}
                    {newsItem.link_url && (
                      <p className="mt-4">
                        <a
                          href={newsItem.link_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-blue-600 dark:text-blue-400 hover:underline"
                        >
                          {newsItem.link_url}
                        </a>
                      </p>
                    )}
                  </div>
                </article>
              </div>

              <div className="col-lg-3">
                <NewsDetailSidebar
                  centerSlug=""
                  currentId={id}
                  newsItems={newsItems as NewsItem[]}
                  notifications={notifications as NewsItem[]}
                />
              </div>
            </div>
          </div>
        </section>
      </main>
      <BackToTopButton />
    </>
  )
}
