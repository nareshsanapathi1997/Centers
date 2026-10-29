import Link from 'next/link'
import { notFound } from 'next/navigation'
import BackToTopButton from '@/components/BackToTopButton'
import PageHero from '@/components/PageHero'
import ContentPagesStyles from '@/components/ContentPagesStyles'
import { getHeroCommonBackgroundImageUrl } from '@/lib/hero-common-background'
import { getWebsiteHomeBrandingCenter, getWebsiteNewsItems } from '@/lib/website-home-db'
import { getWebsiteChromeSettings } from '@/lib/website-chrome-db'
import type { NewsItem } from '@/types'

export const revalidate = 120

function formatNewsDate(dateString?: string | null): string {
  if (!dateString) return ''
  try {
    return new Date(dateString).toLocaleDateString('en-IN', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    })
  } catch {
    return ''
  }
}

function newsExcerpt(content?: string | null, maxLength = 180): string {
  if (!content) return ''
  const plain = content.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim()
  if (plain.length <= maxLength) return plain
  return `${plain.slice(0, maxLength).trim()}…`
}

export default async function WebsiteNewsIndexPage() {
  const [newsItems, heroBackgroundImage, chrome, brandingCenter] = await Promise.all([
    getWebsiteNewsItems(),
    getHeroCommonBackgroundImageUrl(),
    getWebsiteChromeSettings(),
    getWebsiteHomeBrandingCenter(),
  ])

  if (!brandingCenter) notFound()

  const siteName = chrome.siteName || brandingCenter.name || 'EduSphere'
  const items = newsItems as NewsItem[]

  return (
    <>
      <ContentPagesStyles />
      <main id="main-content" style={{ paddingTop: 0 }}>
        <PageHero
          title="Latest"
          titleHighlight="News"
          subtitle={`Updates and announcements from ${siteName}`}
          backgroundImage={heroBackgroundImage}
          breadcrumbs={[
            { label: 'Home', href: '/' },
            { label: 'News', active: true },
          ]}
        />

        <section className="blog-wrap ptb-100 cp-section">
          <div className="container">
            {items.length === 0 ? (
              <p className="text-center text-muted mb-0">No news published yet.</p>
            ) : (
              <div className="row g-4">
                {items.map((item) => (
                  <div key={item.id} className="col-lg-6">
                    <article className="cp-card h-100">
                      <div className="cp-card-body">
                        {item.created_at ? (
                          <p className="text-muted small mb-2">
                            <i className="ri-calendar-line me-1" aria-hidden />
                            {formatNewsDate(item.created_at)}
                          </p>
                        ) : null}
                        <h2 className="h4 mb-3">
                          <Link href={`/news/${item.id}`} className="text-decoration-none">
                            {item.title}
                          </Link>
                        </h2>
                        {item.content ? <p className="mb-3">{newsExcerpt(item.content)}</p> : null}
                        <Link href={`/news/${item.id}`} className="chapter-text-link">
                          Read more <i className="ri-arrow-right-line" />
                        </Link>
                      </div>
                    </article>
                  </div>
                ))}
              </div>
            )}
          </div>
        </section>
      </main>
      <BackToTopButton />
    </>
  )
}
