import { notFound } from 'next/navigation'
import { getCenterBySlug, getNewsItemForDisplay, getNewsSidebarItems, getNotificationSidebarItems } from '@/lib/api'
import { getHeroCommonBackgroundImageUrl } from '@/lib/hero-common-background'
import { withBasePath } from '@/lib/with-base-path'
import BackToTopButton from '@/components/BackToTopButton'
import PageHero from '@/components/PageHero'
import NewsDetailSidebar from '@/components/news/NewsDetailSidebar'
import { sanitizeCmsHtml } from '@/lib/sanitize-html'

export const revalidate = 120

export default async function NewsDetailPage({ params }: { params: { slug: string; id: string } }) {
  const center = await getCenterBySlug(params.slug)
  if (!center) notFound()

  const id = parseInt(params.id, 10)
  if (Number.isNaN(id)) notFound()

  const [item, heroBackgroundImage, newsItems, notifications] = await Promise.all([
    getNewsItemForDisplay(id, center.id),
    getHeroCommonBackgroundImageUrl(),
    getNewsSidebarItems(center.id, 20),
    getNotificationSidebarItems(center.id, 20),
  ])
  if (!item) notFound()

  const isNotification = item.is_notification === true
  const label = isNotification ? 'Notification' : 'News'

  return (
    <>
      <link rel="stylesheet" href={withBasePath('/assets/css/news-detail-sidebar.css')} />
      <main id="main-content" className="corporate-home bg-pub-paper text-pub-ink">
        <PageHero
          eyebrow="News"
          title={item.title || label}
          backgroundImage={heroBackgroundImage}
          breadcrumbs={[
            { label: 'Home', href: `/${center.slug}` },
            { label: label, href: `/${center.slug}` },
            { label: item.title || 'Detail', active: true },
          ]}
        />

        <section className="pub-section news-details-wrap">
          <div className="pub-container news-details-wrap__container">
            <div className="row g-4">
              <div className="col-lg-9">
                <article className="cp-card">
                  <div className="cp-card-body">
                    <div className="text-sm text-gray-500 dark:text-gray-400 mb-4">
                      {item.created_at ? new Date(item.created_at).toLocaleDateString(undefined, { dateStyle: 'long' }) : ''}
                      {item.is_notification && <span className="ml-2"> · Notification</span>}
                    </div>
                    {item.content ? (
                      <div
                        className="news-detail-content prose dark:prose-invert max-w-none"
                        dangerouslySetInnerHTML={{ __html: sanitizeCmsHtml(item.content) }}
                      />
                    ) : (
                      <p className="text-gray-600 dark:text-gray-400">No content.</p>
                    )}
                    {item.link_url && (
                      <p className="mt-4">
                        <a href={item.link_url} target="_blank" rel="noopener noreferrer" className="text-blue-600 dark:text-blue-400 hover:underline">
                          {item.link_url}
                        </a>
                      </p>
                    )}
                  </div>
                </article>
              </div>

              <div className="col-lg-3">
                <NewsDetailSidebar
                  centerSlug={center.slug}
                  currentId={id}
                  newsItems={newsItems}
                  notifications={notifications}
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
