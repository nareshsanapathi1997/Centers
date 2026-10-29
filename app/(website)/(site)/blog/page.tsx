import Link from 'next/link'
import BackToTopButton from '@/components/BackToTopButton'
import PageHero from '@/components/PageHero'
import ContentPagesStyles from '@/components/ContentPagesStyles'
import SafeImage from '@/components/website/PublicImage'
import { getHeroCommonBackgroundImageUrl } from '@/lib/hero-common-background'
import { getWebsiteBlogPosts, getWebsiteHomeBrandingCenter } from '@/lib/website-home-db'
import { getWebsiteChromeSettings } from '@/lib/website-chrome-db'
import type { BlogPost } from '@/types'
import { notFound } from 'next/navigation'

export const revalidate = 120

function formatPublishedDate(dateString?: string | null): string {
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

export default async function WebsiteBlogIndexPage() {
  const [posts, heroBackgroundImage, chrome, brandingCenter] = await Promise.all([
    getWebsiteBlogPosts(48),
    getHeroCommonBackgroundImageUrl(),
    getWebsiteChromeSettings(),
    getWebsiteHomeBrandingCenter(),
  ])

  if (!brandingCenter) notFound()

  const blogPosts = posts as BlogPost[]

  return (
    <>
      <ContentPagesStyles />
      <main id="main-content" style={{ paddingTop: 0 }}>
        <PageHero
          title="Latest"
          titleHighlight="Blog"
          subtitle={`News, insights, and updates from ${chrome.siteName || 'EduSphere'}`}
          backgroundImage={heroBackgroundImage}
          breadcrumbs={[
            { label: 'Home', href: '/' },
            { label: 'Blog', active: true },
          ]}
        />

        <section className="blog-wrap ptb-100 cp-section">
          <div className="container">
            <div className="cp-section-intro">
              <div>
                <span className="cp-kicker">Ideas for ambitious learners</span>
                <h2>Fresh thinking for your next milestone.</h2>
              </div>
              <p>Preparation insights, exam strategy, and updates curated by the EduSphere academic community.</p>
            </div>
            {blogPosts.length === 0 ? (
              <p className="text-center text-muted">No blog posts published yet.</p>
            ) : (
              <div className={`row g-4 ${blogPosts.length === 1 ? 'cp-blog-grid--single' : ''}`}>
                {blogPosts.map((post) => (
                  <div key={post.id} className={blogPosts.length === 1 ? 'col-12' : 'col-lg-4 col-md-6'}>
                    <article className="blog-card style3 h-100">
                      <div className="blog-img">
                        <Link href={`/blog/${post.slug}`}>
                          <SafeImage
                            src={post.featured_image_url || '/assets/img/blog1.jpg'}
                            fallbackSrc="/assets/img/blog1.jpg"
                            alt={post.title}
                            className="img-fluid"
                          />
                        </Link>
                      </div>
                      <div className="blog-info">
                        <ul className="blog-metainfo list-style">
                          {post.author_name ? (
                            <li>
                              <i className="ri-user-add-line" />
                              {post.author_name}
                            </li>
                          ) : null}
                          <li>
                            <i className="ri-calendar-line" />
                            {formatPublishedDate(post.published_date || post.created_at)}
                          </li>
                        </ul>
                        <h3>
                          <Link href={`/blog/${post.slug}`}>{post.title}</Link>
                        </h3>
                        <p className="blog-excerpt">{post.excerpt || post.title}</p>
                        <Link href={`/blog/${post.slug}`} className="blog-read-more-btn">
                          <span>Read More</span>
                          <i className="ri-arrow-right-line" aria-hidden />
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
