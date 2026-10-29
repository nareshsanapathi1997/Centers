import { NextRequest, NextResponse } from 'next/server'
import pool from '@/lib/db'
import { verifySuperAdminAccess } from '@/lib/auth'

export const dynamic = 'force-dynamic'

// GET all SEO settings
export async function GET(request: NextRequest) {
  try {
    const authResult = await verifySuperAdminAccess(request)
    if (!authResult.isValid) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const centerId = searchParams.get('centerId')

    if (centerId) {
      // Get SEO settings for a specific center
      const result = await pool.query(
        'SELECT * FROM center_seo_settings WHERE center_id = $1',
        [centerId]
      )
      return NextResponse.json(result.rows[0] || null)
    } else {
      // Get all SEO settings
      const result = await pool.query(
        `SELECT css.*, c.name as center_name, c.slug as center_slug 
         FROM center_seo_settings css
         LEFT JOIN centers c ON css.center_id = c.id
         ORDER BY c.name`
      )
      return NextResponse.json(result.rows)
    }
  } catch (error: any) {
    console.error('Error fetching SEO settings:', error)
    return NextResponse.json(
      { error: 'Failed to fetch SEO settings', details: error.message },
      { status: 500 }
    )
  }
}

// POST - Create or update SEO settings
export async function POST(request: NextRequest) {
  try {
    const authResult = await verifySuperAdminAccess(request)
    if (!authResult.isValid) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const {
      center_id,
      meta_title,
      meta_description,
      meta_keywords,
      meta_author,
      meta_robots,
      canonical_url,
      og_title,
      og_description,
      og_image,
      og_type,
      og_url,
      og_site_name,
      og_locale,
      twitter_card,
      twitter_site,
      twitter_creator,
      twitter_title,
      twitter_description,
      twitter_image,
      schema_markup,
      meta_viewport,
      meta_theme_color,
      meta_apple_mobile_web_app_capable,
      meta_apple_mobile_web_app_status_bar_style,
      meta_apple_mobile_web_app_title,
      google_analytics_id,
      google_search_console_verification,
      bing_verification,
      facebook_pixel_id,
      sitemap_enabled,
      robots_txt_content,
    } = body

    if (!center_id) {
      return NextResponse.json({ error: 'center_id is required' }, { status: 400 })
    }

    // Check if SEO settings already exist
    const existing = await pool.query(
      'SELECT id FROM center_seo_settings WHERE center_id = $1',
      [center_id]
    )

    if (existing.rows.length > 0) {
      // Update existing
      const result = await pool.query(
        `UPDATE center_seo_settings SET
          meta_title = $1, meta_description = $2, meta_keywords = $3, meta_author = $4,
          meta_robots = $5, canonical_url = $6,
          og_title = $7, og_description = $8, og_image = $9, og_type = $10,
          og_url = $11, og_site_name = $12, og_locale = $13,
          twitter_card = $14, twitter_site = $15, twitter_creator = $16,
          twitter_title = $17, twitter_description = $18, twitter_image = $19,
          schema_markup = $20,
          meta_viewport = $21, meta_theme_color = $22,
          meta_apple_mobile_web_app_capable = $23,
          meta_apple_mobile_web_app_status_bar_style = $24,
          meta_apple_mobile_web_app_title = $25,
          google_analytics_id = $26, google_search_console_verification = $27,
          bing_verification = $28, facebook_pixel_id = $29,
          sitemap_enabled = $30, robots_txt_content = $31,
          updated_at = CURRENT_TIMESTAMP
         WHERE center_id = $32
         RETURNING *`,
        [
          meta_title, meta_description, meta_keywords, meta_author,
          meta_robots || 'index, follow', canonical_url,
          og_title, og_description, og_image, og_type || 'website',
          og_url, og_site_name, og_locale || 'en_US',
          twitter_card || 'summary_large_image', twitter_site, twitter_creator,
          twitter_title, twitter_description, twitter_image,
          schema_markup ? JSON.stringify(schema_markup) : null,
          meta_viewport || 'width=device-width, initial-scale=1', meta_theme_color,
          meta_apple_mobile_web_app_capable || 'yes',
          meta_apple_mobile_web_app_status_bar_style || 'default',
          meta_apple_mobile_web_app_title,
          google_analytics_id, google_search_console_verification,
          bing_verification, facebook_pixel_id,
          sitemap_enabled !== undefined ? sitemap_enabled : true,
          robots_txt_content,
          center_id,
        ]
      )
      return NextResponse.json({ message: 'SEO settings updated successfully', data: result.rows[0] })
    } else {
      // Insert new
      const result = await pool.query(
        `INSERT INTO center_seo_settings (
          center_id, meta_title, meta_description, meta_keywords, meta_author,
          meta_robots, canonical_url,
          og_title, og_description, og_image, og_type, og_url, og_site_name, og_locale,
          twitter_card, twitter_site, twitter_creator, twitter_title, twitter_description, twitter_image,
          schema_markup,
          meta_viewport, meta_theme_color,
          meta_apple_mobile_web_app_capable, meta_apple_mobile_web_app_status_bar_style,
          meta_apple_mobile_web_app_title,
          google_analytics_id, google_search_console_verification, bing_verification, facebook_pixel_id,
          sitemap_enabled, robots_txt_content
        ) VALUES (
          $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20,
          $21, $22, $23, $24, $25, $26, $27, $28, $29, $30, $31, $32
        ) RETURNING *`,
        [
          center_id, meta_title, meta_description, meta_keywords, meta_author,
          meta_robots || 'index, follow', canonical_url,
          og_title, og_description, og_image, og_type || 'website',
          og_url, og_site_name, og_locale || 'en_US',
          twitter_card || 'summary_large_image', twitter_site, twitter_creator,
          twitter_title, twitter_description, twitter_image,
          schema_markup ? JSON.stringify(schema_markup) : null,
          meta_viewport || 'width=device-width, initial-scale=1', meta_theme_color,
          meta_apple_mobile_web_app_capable || 'yes',
          meta_apple_mobile_web_app_status_bar_style || 'default',
          meta_apple_mobile_web_app_title,
          google_analytics_id, google_search_console_verification,
          bing_verification, facebook_pixel_id,
          sitemap_enabled !== undefined ? sitemap_enabled : true,
          robots_txt_content,
        ]
      )
      return NextResponse.json({ message: 'SEO settings created successfully', data: result.rows[0] })
    }
  } catch (error: any) {
    console.error('Error saving SEO settings:', error)
    return NextResponse.json(
      { error: 'Failed to save SEO settings', details: error.message },
      { status: 500 }
    )
  }
}
