import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import BackToTopButton from '@/components/BackToTopButton'
import PageHero from '@/components/PageHero'
import ContentPagesStyles from '@/components/ContentPagesStyles'
import SafeImage from '@/components/website/PublicImage'
import { getHeroCommonBackgroundImageUrl } from '@/lib/hero-common-background'
import {
  getWebsiteBlogPostBySlug,
  getWebsiteBlogPosts,
  getWebsiteHomeBrandingCenter,
} from '@/lib/website-home-db'
import { getWebsiteChromeSettings } from '@/lib/website-chrome-db'
import type { BlogPost } from '@/types'
import { sanitizeCmsHtml } from '@/lib/sanitize-html'

export const revalidate = 120

interface BlogPostPageProps {
  params: { postSlug: string }
}

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

export async function generateMetadata({ params }: BlogPostPageProps): Promise<Metadata> {
  const post = await getWebsiteBlogPostBySlug(params.postSlug)
  const chrome = await getWebsiteChromeSettings()
  if (!post) return { title: 'Blog Post Not Found' }

  const title = post.title
  return {
    title: `${title} | ${chrome.siteName || 'EduSphere'}`,
    description: post.excerpt || title,
  }
}

export default async function WebsiteBlogPostPage({ params }: BlogPostPageProps) {
  const brandingCenter = await getWebsiteHomeBrandingCenter()
  if (!brandingCenter) notFound()

  const [post, heroBackgroundImage, recentPosts, chrome] = await Promise.all([
    getWebsiteBlogPostBySlug(params.postSlug),
    getHeroCommonBackgroundImageUrl(),
    getWebsiteBlogPosts(6),
    getWebsiteChromeSettings(),
  ])

  if (!post) notFound()

  const blogPost = post as BlogPost
  const latestPosts = (recentPosts as BlogPost[])
    .filter((p) => p.slug !== blogPost.slug)
    .slice(0, 5)

  const publishedLabel = formatPublishedDate(blogPost.published_date || blogPost.created_at)
  const contentText = typeof blogPost.content === 'string' ? blogPost.content.trim() : ''
  const isHtmlContent = /<[a-z][\s\S]*>/i.test(contentText)
  const plainTextParagraphs = contentText
    ? contentText.split('\n').map((p) => p.trim()).filter(Boolean)
    : []

  const primaryPhone = chrome.phone || brandingCenter.phone?.[0]
  const contactEmail = chrome.email || brandingCenter.email

  return (
    <>
      <ContentPagesStyles />
      <main id="main-content" style={{ paddingTop: 0 }}>
        <PageHero
          eyebrow="From the learning desk"
          title={blogPost.title}
          backgroundImage={heroBackgroundImage}
          breadcrumbs={[
            { label: 'Home', href: '/' },
            { label: 'Blog', href: '/blog' },
            { label: blogPost.title, active: true },
          ]}
        />

        <section className="blog-details-wrap ptb-100 cp-section">
          <div className="container">
            <div className="row">
              <div className="col-lg-8">
                <article className="cp-card">
                  <div className="cp-card-body">
                    {blogPost.featured_image_url && (
                      <div className="blog-details-featured mb-4">
                        <SafeImage
                          src={blogPost.featured_image_url}
                          fallbackSrc="/assets/img/blog1.jpg"
                          alt={blogPost.title}
                          className="img-fluid w-100 rounded"
                          style={{ maxHeight: 300, objectFit: 'cover' }}
                        />
                      </div>
                    )}

                    <ul className="blog-metainfo list-style mb-3">
                      {blogPost.author_name && (
                        <li>
                          <i className="ri-user-add-line" />
                          {blogPost.author_name}
                        </li>
                      )}
                      {publishedLabel && (
                        <li>
                          <i className="ri-calendar-line" />
                          {publishedLabel}
                        </li>
                      )}
                    </ul>

                    {blogPost.excerpt && (
                      <p className="lead text-muted mb-4">{blogPost.excerpt}</p>
                    )}

                    {contentText ? (
                      isHtmlContent ? (
                        <div
                          className="blog-details-content prose dark:prose-invert max-w-none"
                          dangerouslySetInnerHTML={{ __html: sanitizeCmsHtml(contentText) }}
                        />
                      ) : (
                        <div className="blog-details-content">
                          {plainTextParagraphs.map((paragraph, index) => (
                            <p key={index} className="mb-3">
                              {paragraph}
                            </p>
                          ))}
                        </div>
                      )
                    ) : (
                      <p className="text-muted mb-0">Full article content will be published soon.</p>
                    )}

                    <div className="mt-4 pt-3 border-top">
                      <Link href="/" className="btn style1">
                        <i className="ri-arrow-left-line" /> Back to Home
                      </Link>
                    </div>
                  </div>
                </article>
              </div>

              <div className="col-lg-4">
                <aside className="sidebar blog-details-sidebar">
                  {latestPosts.length > 0 && (
                    <div className="sidebar-widget">
                      <h4>Latest Blogs</h4>
                      <div className="pp-post-wrap">
                        {latestPosts.map((latestPost) => (
                          <div className="pp-post-item" key={latestPost.id}>
                            <div className="pp-post-img">
                              <Link href={`/blog/${latestPost.slug}`}>
                                <SafeImage
                                  src={latestPost.featured_image_url || '/assets/img/blog1.jpg'}
                                  fallbackSrc="/assets/img/blog1.jpg"
                                  alt={latestPost.title}
                                  style={{ width: 85, height: 65, objectFit: 'cover', borderRadius: 4 }}
                                />
                              </Link>
                            </div>
                            <div className="pp-post-info">
                              <h6>
                                <Link href={`/blog/${latestPost.slug}`}>{latestPost.title}</Link>
                              </h6>
                              <span>
                                <i className="ri-calendar-line" />
                                {formatPublishedDate(latestPost.published_date || latestPost.created_at)}
                              </span>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  <div className="sidebar-widget blog-guidance-widget">
                    <h4>Need Guidance?</h4>
                    <p className="mb-3">
                      Talk to our experts for course details and admissions.
                    </p>
                    <ul className="list-style mb-3" style={{ padding: 0, listStyle: 'none' }}>
                      {primaryPhone && (
                        <li className="mb-2">
                          <a href={`tel:${primaryPhone}`} className="d-inline-flex align-items-center gap-2">
                            <i className="ri-phone-line" />
                            {primaryPhone}
                          </a>
                        </li>
                      )}
                      {contactEmail && (
                        <li className="mb-2">
                          <a href={`mailto:${contactEmail}`} className="d-inline-flex align-items-center gap-2">
                            <i className="ri-mail-line" />
                            {contactEmail}
                          </a>
                        </li>
                      )}
                    </ul>
                    <Link href="/contact" className="btn style1 w-100">
                      <i className="ri-customer-service-2-line" /> Contact Us
                    </Link>
                  </div>
                </aside>
              </div>
            </div>
          </div>
        </section>
      </main>
      <BackToTopButton />
    </>
  )
}
