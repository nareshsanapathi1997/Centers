import { getBlogPosts } from '@/lib/api'
import type { BlogPost } from '@/types'
import Link from 'next/link'
import SectionHeading from '@/components/ui/SectionHeading'
import PublicEmptyState from '@/components/ui/PublicEmptyState'
import BlogSlider from './BlogSlider'

interface BlogSectionProps {
  centerId: number
  centerSlug: string
  posts?: BlogPost[]
}

export default async function BlogSection({ centerId, centerSlug, posts: postsProp }: BlogSectionProps) {
  const posts = postsProp ?? (await getBlogPosts(centerId, 12))
  const viewAllHref = centerSlug ? `/${centerSlug}/blog` : '/blog'

  return (
    <section id="blog" className="pub-section premium-section">
      <div className="pub-container">
        <div className="mb-6 flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
          <SectionHeading
            variant="underline"
            align="left"
            badge="The desk"
            icon="ri-article-line"
            title={
              <>
                Briefings for the next <span className="section-heading-highlight">exam season</span>
              </>
            }
            className="mb-0"
          />
          {posts.length > 0 ? (
            <Link href={viewAllHref} className="pub-btn-ghost shrink-0">
              All insights <i className="ri-arrow-right-line" />
            </Link>
          ) : null}
        </div>
        {posts.length === 0 ? (
          <PublicEmptyState
            icon="ri-article-line"
            title="No blog posts yet"
            message="Published articles will appear here once they are available."
          />
        ) : (
          <BlogSlider centerSlug={centerSlug} posts={posts} />
        )}
      </div>
    </section>
  )
}
