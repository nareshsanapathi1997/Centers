/**
 * Shared analytics SQL helpers for split super-admin routes.
 */
import pool from '@/lib/db'

export function parseAnalyticsDays(raw: string | null): number {
  const days = parseInt(raw || '30', 10)
  return Number.isFinite(days) && days > 0 ? Math.min(days, 365) : 30
}

export async function queryAnalyticsOverview(days: number) {
  const overall = await pool.query(
    `SELECT 
        COUNT(DISTINCT center_id) as total_centers,
        COUNT(*) as total_clicks,
        COUNT(DISTINCT DATE(created_at)) as active_days
      FROM analytics_tracking
      WHERE created_at >= NOW() - INTERVAL ${days} DAY`,
  )

  const centers = await pool.query(
    `SELECT 
        c.id,
        c.name,
        c.slug,
        COUNT(DISTINCT at.item_id) FILTER (WHERE at.item_type = 'news') as news_count,
        COUNT(DISTINCT at.item_id) FILTER (WHERE at.item_type = 'notification') as notifications_count,
        COUNT(DISTINCT at.item_id) FILTER (WHERE at.item_type = 'course') as courses_count,
        COUNT(DISTINCT at.item_id) FILTER (WHERE at.item_type = 'nearby_center') as nearby_centers_count,
        COUNT(DISTINCT at.item_id) FILTER (WHERE at.item_type = 'hero_slide') as hero_slides_count,
        COUNT(*) FILTER (WHERE at.item_type = 'news' AND at.action_type = 'click') as news_clicks,
        COUNT(*) FILTER (WHERE at.item_type = 'notification' AND at.action_type = 'click') as notification_clicks,
        COUNT(*) FILTER (WHERE at.item_type = 'course' AND at.action_type = 'click') as course_clicks,
        COUNT(*) FILTER (WHERE at.item_type = 'nearby_center' AND at.action_type = 'click') as nearby_center_clicks,
        COUNT(*) FILTER (WHERE at.item_type = 'hero_slide' AND (at.action_type = 'click' OR at.action_type = 'video_click')) as hero_slide_clicks,
        COUNT(*) as total_clicks
      FROM centers c
      LEFT JOIN analytics_tracking at ON c.id = at.center_id 
        AND at.created_at >= NOW() - INTERVAL ${days} DAY
      GROUP BY c.id, c.name, c.slug
      ORDER BY total_clicks DESC, c.name`,
  )

  return { overall: overall.rows[0], centers: centers.rows }
}

export async function queryCenterSpecificCounts(centerId: number) {
  const [newsCount, notificationsCount, coursesCount, nearbyCentersCount] = await Promise.all([
    pool.query(
      'SELECT COUNT(*) as count FROM news_items WHERE center_id = $1 AND is_notification = false AND is_active = true',
      [centerId],
    ),
    pool.query(
      'SELECT COUNT(*) as count FROM news_items WHERE center_id = $1 AND is_notification = true AND is_active = true',
      [centerId],
    ),
    pool.query('SELECT COUNT(*) as count FROM courses WHERE center_id = $1 AND is_active = true', [centerId]),
    pool.query('SELECT COUNT(*) as count FROM nearby_centers WHERE center_id = $1', [centerId]),
  ])

  return {
    newsCount: parseInt(newsCount.rows[0].count, 10),
    notificationsCount: parseInt(notificationsCount.rows[0].count, 10),
    coursesCount: parseInt(coursesCount.rows[0].count, 10),
    nearbyCentersCount: parseInt(nearbyCentersCount.rows[0].count, 10),
  }
}

export async function queryAnalyticsTops(days: number) {
  const [topNews, topNotifications, topCourses, topHeroSlides] = await Promise.all([
    pool.query(
      `SELECT at.center_id, c.name as center_name, ni.title, COUNT(*) as click_count
       FROM analytics_tracking at
       JOIN centers c ON at.center_id = c.id
       JOIN news_items ni ON at.item_id = ni.id AND at.item_type = 'news'
       WHERE at.action_type = 'click' AND at.created_at >= NOW() - INTERVAL ${days} DAY
       GROUP BY at.center_id, c.name, ni.title, at.item_id
       ORDER BY click_count DESC LIMIT 5`,
    ),
    pool.query(
      `SELECT at.center_id, c.name as center_name, ni.title, COUNT(*) as click_count
       FROM analytics_tracking at
       JOIN centers c ON at.center_id = c.id
       JOIN news_items ni ON at.item_id = ni.id AND at.item_type = 'notification'
       WHERE at.action_type = 'click' AND at.created_at >= NOW() - INTERVAL ${days} DAY
       GROUP BY at.center_id, c.name, ni.title, at.item_id
       ORDER BY click_count DESC LIMIT 5`,
    ),
    pool.query(
      `SELECT at.center_id, c.name as center_name, co.name as course_name, COUNT(*) as click_count
       FROM analytics_tracking at
       JOIN centers c ON at.center_id = c.id
       JOIN courses co ON at.item_id = co.id AND at.item_type = 'course'
       WHERE at.action_type = 'click' AND at.created_at >= NOW() - INTERVAL ${days} DAY
       GROUP BY at.center_id, c.name, co.name, at.item_id
       ORDER BY click_count DESC LIMIT 5`,
    ),
    pool.query(
      `SELECT at.center_id, c.name as center_name, hs.title, COUNT(*) as click_count
       FROM analytics_tracking at
       JOIN centers c ON at.center_id = c.id
       JOIN hero_slides hs ON at.item_id = hs.id AND at.item_type = 'hero_slide'
       WHERE (at.action_type = 'click' OR at.action_type = 'video_click')
         AND at.created_at >= NOW() - INTERVAL ${days} DAY
       GROUP BY at.center_id, c.name, hs.title, at.item_id
       ORDER BY click_count DESC LIMIT 5`,
    ),
  ])

  return {
    topNews: topNews.rows,
    topNotifications: topNotifications.rows,
    topCourses: topCourses.rows,
    topHeroSlides: topHeroSlides.rows,
  }
}

export async function queryAnalyticsTrends(days: number) {
  const dailyTrends = await pool.query(
    `SELECT 
        DATE(created_at) as date,
        COUNT(*) FILTER (WHERE item_type = 'news' AND action_type = 'click') as news_clicks,
        COUNT(*) FILTER (WHERE item_type = 'notification' AND action_type = 'click') as notification_clicks,
        COUNT(*) FILTER (WHERE item_type = 'course' AND action_type = 'click') as course_clicks,
        COUNT(*) FILTER (WHERE item_type = 'hero_slide' AND (action_type = 'click' OR action_type = 'video_click')) as hero_slide_clicks,
        COUNT(*) FILTER (WHERE action_type = 'click' OR action_type = 'video_click') as total_clicks
      FROM analytics_tracking
      WHERE created_at >= NOW() - INTERVAL ${days} DAY
        AND (action_type = 'click' OR action_type = 'video_click')
      GROUP BY DATE(created_at)
      ORDER BY date DESC`,
  )
  return dailyTrends.rows
}

export async function queryAnalyticsBreakdown(days: number, centerId?: number) {
  const centerFilter = centerId ? `AND c.id = ${centerId}` : ''
  const result = await pool.query(
    `SELECT 
        c.id as center_id,
        c.name as center_name,
        at.item_type,
        at.item_id,
        CASE 
          WHEN at.item_type = 'news' THEN ni.title
          WHEN at.item_type = 'notification' THEN ni2.title
          WHEN at.item_type = 'course' THEN co.name
          WHEN at.item_type = 'hero_slide' THEN hs.title
          WHEN at.item_type = 'nearby_center' THEN c2.name
          ELSE 'Unknown'
        END as item_title,
        COUNT(*) as click_count
      FROM centers c
      INNER JOIN analytics_tracking at ON c.id = at.center_id 
        AND at.created_at >= NOW() - INTERVAL ${days} DAY
        AND (at.action_type = 'click' OR at.action_type = 'video_click')
      LEFT JOIN news_items ni ON at.item_type = 'news' AND at.item_id = ni.id
      LEFT JOIN news_items ni2 ON at.item_type = 'notification' AND at.item_id = ni2.id
      LEFT JOIN courses co ON at.item_type = 'course' AND at.item_id = co.id
      LEFT JOIN hero_slides hs ON at.item_type = 'hero_slide' AND at.item_id = hs.id
      LEFT JOIN centers c2 ON at.item_type = 'nearby_center' AND at.item_id = c2.id
      WHERE at.item_id IS NOT NULL ${centerFilter}
      GROUP BY c.id, c.name, at.item_type, at.item_id, 
               ni.title, ni2.title, co.name, hs.title, c2.name
      ORDER BY c.name, at.item_type, click_count DESC`,
  )
  return result.rows
}
