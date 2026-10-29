import { NextResponse } from 'next/server'
import { getCenterBySlug, getCenterSEOSettings } from '@/lib/api'
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

    const seoSettings = await getCenterSEOSettings(center.id)
    
    // Use custom robots.txt if provided, otherwise use default
    if (seoSettings?.robots_txt_content) {
      return new NextResponse(seoSettings.robots_txt_content, {
        headers: {
          'Content-Type': 'text/plain',
        },
      })
    }

    // Default robots.txt
    const baseUrl = (process.env.NEXT_PUBLIC_BASE_URL || 'https://example.com').replace(/\/+$/, '')
    const defaultRobots = `User-agent: *
Allow: /
Disallow: ${withBasePath('/admin/')}
Disallow: ${withBasePath('/api/')}
Sitemap: ${baseUrl}${withBasePath(`/${params.slug}/sitemap.xml`)}`

    return new NextResponse(defaultRobots, {
      headers: {
        'Content-Type': 'text/plain',
      },
    })
  } catch (error) {
    console.error('Error generating robots.txt:', error)
    return new NextResponse('Error generating robots.txt', { status: 500 })
  }
}
