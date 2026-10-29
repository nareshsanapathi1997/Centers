import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { getCenterBySlug, getBlogPostBySlug, getBlogPosts, getVisibleBlogComments } from '@/lib/api'
import { getHeroCommonBackgroundImageUrl } from '@/lib/hero-common-background'
import BackToTopButton from '@/components/BackToTopButton'
import PageHero from '@/components/PageHero'
import SafeImage from '@/components/website/PublicImage'
import BlogCommentsSection from '@/components/blog/BlogCommentsSection'
import { sanitizeCmsHtml } from '@/lib/sanitize-html'

export const revalidate = 120

interface BlogPostPageProps {
  params: {
    slug: string
    postSlug: string
  }
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
  const center = await getCenterBySlug(params.slug)
  if (!center) return { title: 'Blog' }

  const post = await getBlogPostBySlug(center.id, params.postSlug)
  if (!post) return { title: 'Blog Post Not Found' }

  return {
    title: `${post.title} | ${center.name}`,
    description: post.excerpt || post.title,
  }
}

export default async function BlogPostPage({ params }: BlogPostPageProps) {
  const center = await getCenterBySlug(params.slug)
  if (!center) notFound()

  const post = await getBlogPostBySlug(center.id, params.postSlug)
  if (!post) notFound()

  const [heroBackgroundImage, recentPosts, visibleComments] = await Promise.all([
    getHeroCommonBackgroundImageUrl(),
    getBlogPosts(center.id, 6),
    getVisibleBlogComments(center.id, post.id),
  ])

  const latestPosts = recentPosts.filter((p) => p.slug !== post.slug).slice(0, 5)
  const primaryPhone = center.phone?.[0]

  const publishedLabel = formatPublishedDate(post.published_date || post.created_at)
  const contentText = typeof post.content === 'string' ? post.content.trim() : ''
  const isHtmlContent = /<[a-z][\s\S]*>/i.test(contentText)
  const plainTextParagraphs = contentText
    ? contentText.split('\n').map((p) => p.trim()).filter(Boolean)
    : []

  return (
    <>
      <main id="main-content" className="corporate-home bg-pub-paper text-pub-ink">
        <PageHero
          eyebrow="From the learning desk"
          title={post.title}
          backgroundImage={heroBackgroundImage}
          breadcrumbs={[
            { label: 'Home', href: `/${center.slug}` },
            { label: 'Blog', href: `/${center.slug}#blog` },
            { label: post.title, active: true },
          ]}
        />

        <section className="pub-section blog-details-wrap">
          <div className="pub-container">
            <div className="row">
              <div className="col-lg-8">
                <article className="cp-card">
                  <div className="cp-card-body">
                    {post.featured_image_url && (
                      <div className="blog-details-featured mb-4">
                        <SafeImage
                          src={post.featured_image_url}
                          fallbackSrc="/assets/img/blog1.jpg"
                          alt={post.title}
                          className="img-fluid w-100 rounded"
                          style={{ maxHeight: 300, objectFit: 'cover' }}
                        />
                      </div>
                    )}

                    <ul className="blog-metainfo list-style mb-3">
                      {post.author_name && (
                        <li>
                          <i className="ri-user-add-line" />
                          {post.author_name}
                        </li>
                      )}
                      {publishedLabel && (
                        <li>
                          <i className="ri-calendar-line" />
                          {publishedLabel}
                        </li>
                      )}
                    </ul>

                    {post.excerpt && (
                      <p className="lead text-muted mb-4">{post.excerpt}</p>
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

                    <BlogCommentsSection
                      centerId={center.id}
                      blogPostId={post.id}
                      initialComments={visibleComments}
                    />

                    <div className="mt-4 pt-3 border-top">
                      <Link href={`/${center.slug}`} className="btn style1">
                        <i className="ri-arrow-left-line"></i> Back to Home
                      </Link>
                    </div>
                  </div>
                </article>
              </div>

              {/* Sidebar */}
              <div className="col-lg-4">
                <aside className="sidebar blog-details-sidebar">
                  {latestPosts.length > 0 && (
                    <div className="sidebar-widget">
                      <h4>Latest Blogs</h4>
                      <div className="pp-post-wrap">
                        {latestPosts.map((latestPost) => (
                          <div className="pp-post-item" key={latestPost.id}>
                            <div className="pp-post-img">
                              <Link href={`/${center.slug}/blog/${latestPost.slug}`}>
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
                                <Link href={`/${center.slug}/blog/${latestPost.slug}`}>
                                  {latestPost.title}
                                </Link>
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
                      Talk to our experts at {center.name} for course details and admissions.
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
                      {center.email && (
                        <li className="mb-2">
                          <a href={`mailto:${center.email}`} className="d-inline-flex align-items-center gap-2">
                            <i className="ri-mail-line" />
                            {center.email}
                          </a>
                        </li>
                      )}
                    </ul>
                    <Link href={`/${center.slug}/contact`} className="btn style1 w-100">
                      <i className="ri-customer-service-2-line"></i> Contact Us
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
