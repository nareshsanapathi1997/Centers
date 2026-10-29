import { NextResponse } from 'next/server'
import { getCenterBySlug, getCenterSEOSettings } from '@/lib/api'
import pool from '@/lib/db'
import { withBasePath } from '@/lib/with-base-path'

export async function GET(
  request: Request,
  { params }: { params: { slug: string } }
) {
  try {
    const center = await getCenterBySlug(params.slug)
    
    if (!center) {
      return new NextResponse('Center not found', { status: 404 })
    }

    // Check if sitemap is enabled for this center
    const seoSettings = await getCenterSEOSettings(center.id)
    if (seoSettings && seoSettings.sitemap_enabled === false) {
      return new NextResponse('Sitemap disabled', { status: 404 })
    }

    const baseUrl = (process.env.NEXT_PUBLIC_BASE_URL || 'https://example.com').replace(/\/+$/, '')
    const centerUrl = `${baseUrl}${withBasePath(`/${params.slug}`)}`

    // Get all pages/sections for this center
    const urls: string[] = [centerUrl] // Homepage

    // Add blog posts if blog section is enabled
    try {
      const blogPosts = await pool.query(
        'SELECT slug FROM blog_posts WHERE center_id = $1 AND is_published = true',
        [center.id]
      )
      blogPosts.rows.forEach((post: any) => {
        if (post.slug) {
          urls.push(`${centerUrl}/blog/${post.slug}`)
        }
      })
    } catch (e) {
      // Blog table might not exist
    }

    // Generate XML sitemap
    const sitemap = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls.map(url => `  <url>
    <loc>${url}</loc>
    <changefreq>weekly</changefreq>
    <priority>0.8</priority>
  </url>`).join('\n')}
</urlset>`

    return new NextResponse(sitemap, {
      headers: {
        'Content-Type': 'application/xml',
      },
    })
  } catch (error) {
    console.error('Error generating sitemap:', error)
    return new NextResponse('Error generating sitemap', { status: 500 })
  }
}
