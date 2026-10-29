import Link from 'next/link'
import { notFound } from 'next/navigation'
import BackToTopButton from '@/components/BackToTopButton'
import PageHero from '@/components/PageHero'
import PublicEmptyState from '@/components/ui/PublicEmptyState'
import SafeImage from '@/components/website/PublicImage'
import { getCenterBySlug, getBlogPosts } from '@/lib/api'
import { getHeroCommonBackgroundImageUrl } from '@/lib/hero-common-background'

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

export default async function CenterBlogIndexPage({ params }: { params: { slug: string } }) {
  const center = await getCenterBySlug(params.slug)
  if (!center) notFound()

  const [posts, heroBackgroundImage] = await Promise.all([
    getBlogPosts(center.id, 48),
    getHeroCommonBackgroundImageUrl(),
  ])

  return (
    <>
      <main id="main-content" className="corporate-home bg-pub-paper text-pub-ink">
        <PageHero
          title="Latest"
          titleHighlight="Blog"
          subtitle={`News, insights, and updates from ${center.name}`}
          backgroundImage={heroBackgroundImage}
          breadcrumbs={[
            { label: 'Home', href: `/${center.slug}` },
            { label: 'Blog', active: true },
          ]}
        />

        <section className="pub-section" id="blog">
          <div className="pub-container">
            <div className="mb-6 max-w-3xl">
              <p className="pub-eyebrow">Ideas for ambitious learners</p>
              <h2 className="pub-hero-title mt-2 text-4xl">Fresh thinking for your next milestone.</h2>
              <p className="mt-3 text-pub-muted">Preparation insights, exam strategy, and centre updates curated by the academic team.</p>
            </div>
            {posts.length === 0 ? (
              <PublicEmptyState
                icon="ri-article-line"
                title="No blog posts yet"
                message="Published articles from this centre will appear here."
              />
            ) : (
              <div className="pub-blog-grid">
                {posts.map((post) => (
                  <div key={post.id}>
                    <article className="blog-card style3 h-100">
                      <div className="blog-img">
                        <Link href={`/${center.slug}/blog/${post.slug}`}>
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
                          <Link href={`/${center.slug}/blog/${post.slug}`}>{post.title}</Link>
                        </h3>
                        <p className="blog-excerpt">{post.excerpt || post.title}</p>
                        <Link
                          href={`/${center.slug}/blog/${post.slug}`}
                          className="blog-read-more-btn"
                        >
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
