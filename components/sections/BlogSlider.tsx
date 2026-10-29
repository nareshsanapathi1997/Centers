'use client'

import { BlogPost } from '@/types'
import Link from 'next/link'
import SafeImage from '@/components/website/PublicImage'

interface BlogSliderProps {
  centerSlug: string
  posts: BlogPost[]
}

const BLOG_FALLBACKS = [
  '/assets/demo/campus-1.jpg',
  '/assets/demo/campus-3.jpg',
  '/assets/demo/campus-5.jpg',
  '/assets/demo/campus-6.jpg',
]

function formatDate(dateString?: string) {
  if (!dateString) return 'Academic Briefing'
  try {
    return new Date(dateString).toLocaleDateString('en-IN', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    })
  } catch {
    return 'Academic Briefing'
  }
}

export default function BlogSlider({ centerSlug, posts }: BlogSliderProps) {
  if (posts.length === 0) return null

  const [featured, ...rest] = posts
  const side = rest.slice(0, 3)
  const featuredHref = centerSlug ? `/${centerSlug}/blog/${featured.slug}` : `/blog/${featured.slug}`

  return (
    <div className="blog-magazine">
      <Link href={featuredHref} className="blog-magazine__feature">
        <div className="blog-magazine__feature-media">
          <SafeImage
            src={featured.featured_image_url || BLOG_FALLBACKS[0]}
            fallbackSrc={BLOG_FALLBACKS[0]}
            alt={featured.title}
            loading="eager"
          />
        </div>
        <div className="blog-magazine__feature-copy">
          <span className="blog-magazine__badge">
            <i className="ri-calendar-event-line" aria-hidden="true" /> {formatDate(featured.published_date || featured.created_at)}
          </span>
          <h3>{featured.title}</h3>
          <p>{featured.excerpt || 'Practical strategy notes, revision frameworks, and exam-room preparation guidance from our faculty.'}</p>
          <span className="blog-magazine__cta">
            Read full briefing <i className="ri-arrow-right-up-line" aria-hidden="true" />
          </span>
        </div>
      </Link>

      <div className="blog-magazine__side">
        {side.map((post, idx) => {
          const href = centerSlug ? `/${centerSlug}/blog/${post.slug}` : `/blog/${post.slug}`
          return (
            <Link key={post.id} href={href} className="blog-magazine__side-card">
              <div className="blog-magazine__side-thumb">
                <SafeImage
                  src={post.featured_image_url || BLOG_FALLBACKS[(idx + 1) % BLOG_FALLBACKS.length]}
                  fallbackSrc={BLOG_FALLBACKS[(idx + 1) % BLOG_FALLBACKS.length]}
                  alt={post.title}
                  loading="eager"
                />
              </div>
              <div className="blog-magazine__side-body">
                <span className="blog-magazine__date">
                  {formatDate(post.published_date || post.created_at)}
                </span>
                <h3>{post.title}</h3>
                {post.excerpt && <p className="blog-magazine__excerpt">{post.excerpt}</p>}
              </div>
            </Link>
          )
        })}
      </div>
    </div>
  )
}
