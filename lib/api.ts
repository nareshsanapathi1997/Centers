import { cache } from 'react';
import { unstable_cache } from 'next/cache';
import pool from './db';
import { buildHeaderMenuTree } from '@/lib/headerMenuTree';
import { withRedisCache, redisDel } from '@/lib/redis-cache';
import { Center, HeroSlide, NewsItem, Course, ResultImage, VideoTestimonial, TextTestimonial, Leadership, SeniorFaculty, GalleryImage, BlogPost, PublicBlogComment, SectionConfig, CustomSection, CTASlider, FAQ, Vacancy, GlobalSetting, HeaderMenuItem, FooterMenuItem } from '@/types';

/** Cross-request cache for center-scoped public reads (ISR-aligned 120s). */
function centerPublicCache<T>(
  cacheKey: string,
  centerId: number,
  tagPrefix: string,
  fetcher: () => Promise<T>,
  revalidate = 120,
) {
  return unstable_cache(fetcher, [cacheKey, String(centerId)], {
    revalidate,
    tags: [`${tagPrefix}-${centerId}`],
  })
}

async function queryCenterBySlug(slug: string): Promise<Center | null> {
  const result = await pool.query('SELECT * FROM centers WHERE slug = $1 AND is_active = true', [slug]);
  return result.rows[0] || null;
}

// Center Queries — Redis (optional) → unstable_cache → MySQL
export const getCenterBySlug = cache(async (slug: string): Promise<Center | null> => {
  return withRedisCache(`center:slug:${slug}`, 120, () =>
    unstable_cache(
      () => queryCenterBySlug(slug),
      ['center-by-slug', slug],
      { revalidate: 120, tags: [`center-slug-${slug}`] },
    )()
  )
});

/** Drop the Redis copy when a center slug is edited or deactivated. */
export async function invalidateCenterSlugRedis(slug: string): Promise<void> {
  await redisDel(`center:slug:${slug}`)
}

export const getCenterById = cache(async (id: number): Promise<Center | null> => {
  const result = await pool.query('SELECT * FROM centers WHERE id = $1 AND is_active = true', [id]);
  return result.rows[0] || null;
});

export async function getAllCenters(): Promise<Center[]> {
  return withRedisCache('centers:active', 120, async () => {
    const result = await pool.query('SELECT * FROM centers WHERE is_active = true ORDER BY name');
    return result.rows;
  })
}

export const getNearbyCenters = cache(async (centerId: number): Promise<Center[]> => {
  try {
    const result = await pool.query(
      `SELECT c.* 
       FROM centers c
       INNER JOIN nearby_centers nc ON c.id = nc.nearby_center_id
       WHERE nc.center_id = $1
       ORDER BY nc.display_order, c.name`,
      [centerId]
    );
    return result.rows;
  } catch (error: any) {
    // If table doesn't exist yet, return empty array (table will be created via migration)
    if (error.code === '42P01') {
      console.warn('nearby_centers table does not exist yet. Run: npm run db:migrate:nearby-centers');
      return [];
    }
    console.error('Error fetching nearby centers:', error);
    return [];
  }
});

// Section Config Queries
export async function getSectionConfigs(centerId: number): Promise<SectionConfig[]> {
  const result = await pool.query(
    'SELECT * FROM section_configs WHERE center_id = $1 ORDER BY display_order',
    [centerId]
  );
  return result.rows;
}

export async function isSectionEnabled(centerId: number, sectionKey: string): Promise<boolean> {
  const result = await pool.query(
    'SELECT is_enabled FROM section_configs WHERE center_id = $1 AND section_key = $2',
    [centerId, sectionKey]
  );
  return result.rows[0]?.is_enabled ?? true; // Default to enabled if not configured
}

// Optimized: Get all section enabled states in a single query (cached per request + cross-request)
async function queryAllSectionEnabledStates(centerId: number): Promise<Record<string, boolean>> {
  const result = await pool.query(
    'SELECT section_key, is_enabled FROM section_configs WHERE center_id = $1',
    [centerId]
  );

  const states: Record<string, boolean> = {};
  result.rows.forEach((row: { section_key: string; is_enabled: boolean }) => {
    states[row.section_key] = row.is_enabled;
  });

  return states;
}

export const getAllSectionEnabledStates = cache(async (centerId: number): Promise<Record<string, boolean>> => {
  return centerPublicCache(
    'section-enabled-states',
    centerId,
    'center-sections',
    () => queryAllSectionEnabledStates(centerId),
  )()
});

// Hero Slides (only approved for public display)
async function queryHeroSlides(centerId: number): Promise<HeroSlide[]> {
  const result = await pool.query(
    `SELECT * FROM hero_slides WHERE center_id = $1 AND is_active = true 
     AND (approval_status IS NULL OR approval_status = 'approved') 
     ORDER BY display_order`,
    [centerId]
  );
  return result.rows;
}

export const getHeroSlides = cache(async (centerId: number): Promise<HeroSlide[]> => {
  return centerPublicCache('hero-slides', centerId, 'center-hero', () => queryHeroSlides(centerId))()
});

// News & Notifications
const NEWS_SIDEBAR_COLUMNS =
  'id, center_id, title, created_at, is_notification, link_url, display_order, approval_status, is_active'

async function queryNewsItems(centerId: number): Promise<NewsItem[]> {
  const result = await pool.query(
    'SELECT * FROM news_items WHERE center_id = $1 AND is_active = true AND is_notification = false AND (approval_status IS NULL OR approval_status = \'approved\') ORDER BY display_order, created_at DESC',
    [centerId]
  )
  return result.rows
}

async function queryNewsSidebarItems(centerId: number, limit: number): Promise<NewsItem[]> {
  const result = await pool.query(
    `SELECT ${NEWS_SIDEBAR_COLUMNS} FROM news_items WHERE center_id = $1 AND is_active = true AND is_notification = false AND (approval_status IS NULL OR approval_status = 'approved') ORDER BY display_order, created_at DESC LIMIT $2`,
    [centerId, limit]
  )
  return result.rows
}

async function queryNotifications(centerId: number): Promise<NewsItem[]> {
  const result = await pool.query(
    'SELECT * FROM news_items WHERE center_id = $1 AND is_active = true AND is_notification = true AND (approval_status IS NULL OR approval_status = \'approved\') ORDER BY display_order, created_at DESC',
    [centerId]
  )
  return result.rows
}

async function queryNotificationSidebarItems(centerId: number, limit: number): Promise<NewsItem[]> {
  const result = await pool.query(
    `SELECT ${NEWS_SIDEBAR_COLUMNS} FROM news_items WHERE center_id = $1 AND is_active = true AND is_notification = true AND (approval_status IS NULL OR approval_status = 'approved') ORDER BY display_order, created_at DESC LIMIT $2`,
    [centerId, limit]
  )
  return result.rows
}

function newsItemsCrossRequest(centerId: number) {
  return unstable_cache(
    () => queryNewsItems(centerId),
    ['news-items', String(centerId)],
    { revalidate: 120, tags: [`center-news-${centerId}`] }
  )
}

function newsSidebarCrossRequest(centerId: number, limit: number) {
  return unstable_cache(
    () => queryNewsSidebarItems(centerId, limit),
    ['news-sidebar', String(centerId), String(limit)],
    { revalidate: 120, tags: [`center-news-${centerId}`] }
  )
}

function notificationsCrossRequest(centerId: number) {
  return unstable_cache(
    () => queryNotifications(centerId),
    ['notifications', String(centerId)],
    { revalidate: 120, tags: [`center-notifications-${centerId}`] }
  )
}

function notificationSidebarCrossRequest(centerId: number, limit: number) {
  return unstable_cache(
    () => queryNotificationSidebarItems(centerId, limit),
    ['notification-sidebar', String(centerId), String(limit)],
    { revalidate: 120, tags: [`center-notifications-${centerId}`] }
  )
}

export const getNewsItems = cache(async (centerId: number): Promise<NewsItem[]> => {
  return newsItemsCrossRequest(centerId)()
})

/** Lightweight list for news detail sidebar (avoids loading full `content` blobs). */
export const getNewsSidebarItems = cache(
  async (centerId: number, limit = 20): Promise<NewsItem[]> => {
    return newsSidebarCrossRequest(centerId, limit)()
  }
)

export const getNotifications = cache(async (centerId: number): Promise<NewsItem[]> => {
  return notificationsCrossRequest(centerId)()
})

/** Lightweight list for notification sidebar on news detail pages. */
export const getNotificationSidebarItems = cache(
  async (centerId: number, limit = 20): Promise<NewsItem[]> => {
    return notificationSidebarCrossRequest(centerId, limit)()
  }
)

/** Get a single news/notification item for public display (must be approved and active, and belong to center). */
export const getNewsItemForDisplay = cache(async (id: number, centerId: number): Promise<NewsItem | null> => {
  const result = await pool.query(
    'SELECT * FROM news_items WHERE id = $1 AND center_id = $2 AND is_active = true AND (approval_status IS NULL OR approval_status = \'approved\')',
    [id, centerId]
  );
  return result.rows[0] || null;
});

// Courses (cached per centerId + optional category)
async function queryCourses(centerId: number, category?: string): Promise<Course[]> {
  let query = 'SELECT * FROM courses WHERE center_id = $1 AND is_active = true'
  const params: unknown[] = [centerId]

  if (category) {
    query += ' AND category = $2'
    params.push(category)
  }

  query += ' ORDER BY display_order, name'
  const result = await pool.query(query, params)
  return result.rows
}

function coursesCrossRequest(centerId: number, category: string) {
  return unstable_cache(
    () => queryCourses(centerId, category || undefined),
    ['courses-by-center', String(centerId), category],
    { revalidate: 120, tags: [`center-courses-${centerId}`] }
  )
}

export const getCourses = cache(async (centerId: number, category?: string): Promise<Course[]> => {
  return coursesCrossRequest(centerId, category ?? '')()
})

// Results
async function queryResultImages(centerId: number): Promise<ResultImage[]> {
  const result = await pool.query(
    'SELECT * FROM result_images WHERE center_id = $1 AND is_active = true ORDER BY display_order',
    [centerId]
  );
  return result.rows;
}

export const getResultImages = cache(async (centerId: number): Promise<ResultImage[]> => {
  return centerPublicCache('result-images', centerId, 'center-results', () => queryResultImages(centerId))()
});

// Video Testimonials
async function queryVideoTestimonials(centerId: number): Promise<VideoTestimonial[]> {
  const result = await pool.query(
    'SELECT * FROM video_testimonials WHERE center_id = $1 AND is_active = true ORDER BY display_order',
    [centerId]
  );
  return result.rows;
}

export const getVideoTestimonials = cache(async (centerId: number): Promise<VideoTestimonial[]> => {
  return centerPublicCache('video-testimonials', centerId, 'center-testimonials', () => queryVideoTestimonials(centerId))()
});

// Text Testimonials
async function queryTextTestimonials(centerId: number): Promise<TextTestimonial[]> {
  const result = await pool.query(
    'SELECT * FROM text_testimonials WHERE center_id = $1 AND is_active = true ORDER BY display_order',
    [centerId]
  );
  return result.rows;
}

export const getTextTestimonials = cache(async (centerId: number): Promise<TextTestimonial[]> => {
  return centerPublicCache('text-testimonials', centerId, 'center-testimonials', () => queryTextTestimonials(centerId))()
});

// Student Stories
async function queryStudentStories(centerId: number, featuredOnly: boolean): Promise<any[]> {
  let query = 'SELECT * FROM student_stories WHERE center_id = $1 AND is_active = true';
  const params: any[] = [centerId];
  
  if (featuredOnly) {
    query += ' AND is_featured = true';
  }
  
  query += ' ORDER BY display_order, created_at DESC';
  
  const result = await pool.query(query, params);
  return result.rows;
}

export const getStudentStories = cache(
  async (centerId: number, featuredOnly: boolean = false): Promise<any[]> => {
    return centerPublicCache(
      `student-stories-${featuredOnly ? 'featured' : 'all'}`,
      centerId,
      'center-student-stories',
      () => queryStudentStories(centerId, featuredOnly),
    )()
  }
);

// Leadership (multiple center directors per center)
async function queryLeadership(centerId: number): Promise<Leadership[]> {
  try {
    const result = await pool.query(
      'SELECT * FROM leadership WHERE center_id = $1 AND is_active = true ORDER BY display_order, created_at',
      [centerId]
    );
    return result.rows;
  } catch (error: any) {
    if (error.code === '42703') {
      const fallback = await pool.query(
        'SELECT * FROM leadership WHERE center_id = $1 ORDER BY created_at',
        [centerId]
      );
      return fallback.rows;
    }
    throw error;
  }
}

export const getLeadership = cache(async (centerId: number): Promise<Leadership[]> => {
  return centerPublicCache('leadership', centerId, 'center-leadership', () => queryLeadership(centerId))()
});

// Senior Faculty
async function querySeniorFaculty(centerId: number): Promise<SeniorFaculty[]> {
  try {
    const result = await pool.query(
      'SELECT * FROM senior_faculty WHERE center_id = $1 AND is_active = true ORDER BY display_order, created_at',
      [centerId]
    );
    return result.rows;
  } catch (error: any) {
    if (error.code === '42P01') {
      console.warn('senior_faculty table does not exist. Run: npm run db:migrate:senior-faculty');
      return [];
    }
    throw error;
  }
}

export const getSeniorFaculty = cache(async (centerId: number): Promise<SeniorFaculty[]> => {
  return centerPublicCache('senior-faculty', centerId, 'center-senior-faculty', () => querySeniorFaculty(centerId))()
});

// Gallery
async function queryGalleryImages(centerId: number, galleryType?: string): Promise<GalleryImage[]> {
  let query = 'SELECT * FROM gallery_images WHERE center_id = $1 AND is_active = true';
  const params: any[] = [centerId];

  if (galleryType) {
    query += ' AND gallery_type = $2';
    params.push(galleryType);
  }

  query += ' ORDER BY display_order';
  const result = await pool.query(query, params);
  return result.rows;
}

export const getGalleryImages = cache(async (centerId: number, galleryType?: string): Promise<GalleryImage[]> => {
  return centerPublicCache(
    `gallery-images-${galleryType ?? 'all'}`,
    centerId,
    'center-gallery',
    () => queryGalleryImages(centerId, galleryType),
  )()
});

// Blog Posts
async function queryBlogPosts(centerId: number, limit?: number): Promise<BlogPost[]> {
  let query =
    'SELECT id, center_id, title, slug, excerpt, featured_image_url, author_name, published_date, is_published, created_at, updated_at FROM blog_posts WHERE center_id = $1 AND is_published = true ORDER BY published_date DESC, created_at DESC'
  const params: unknown[] = [centerId]

  if (limit) {
    query += ' LIMIT $2'
    params.push(limit)
  }

  const result = await pool.query(query, params)
  return result.rows
}

function blogPostsCrossRequest(centerId: number, limit: number | 'all') {
  return unstable_cache(
    () => queryBlogPosts(centerId, limit === 'all' ? undefined : limit),
    ['blog-posts', String(centerId), String(limit)],
    { revalidate: 120, tags: [`center-blog-${centerId}`] }
  )
}

export const getBlogPosts = cache(async (centerId: number, limit?: number): Promise<BlogPost[]> => {
  return blogPostsCrossRequest(centerId, limit ?? 'all')()
})

async function queryBlogPostBySlug(centerId: number, slug: string): Promise<BlogPost | null> {
  const result = await pool.query(
    'SELECT * FROM blog_posts WHERE center_id = $1 AND slug = $2 AND is_published = true',
    [centerId, slug]
  )
  return result.rows[0] || null
}

export const getBlogPostBySlug = cache(async (centerId: number, slug: string): Promise<BlogPost | null> => {
  return unstable_cache(
    () => queryBlogPostBySlug(centerId, slug),
    ['blog-post-by-slug', String(centerId), slug],
    { revalidate: 120, tags: [`center-blog-${centerId}`] }
  )()
})

async function queryVisibleBlogComments(centerId: number, blogPostId: number): Promise<PublicBlogComment[]> {
  try {
    const result = await pool.query(
      `SELECT id, author_name, body, created_at
       FROM blog_comments
       WHERE center_id = $1 AND blog_post_id = $2 AND status = 'visible'
       ORDER BY created_at ASC`,
      [centerId, blogPostId],
    )
    return result.rows
  } catch (error: any) {
    // Table may not exist until migration 0010_blog_comments runs
    if (error?.code === '42P01') return []
    throw error
  }
}

export const getVisibleBlogComments = cache(
  async (centerId: number, blogPostId: number): Promise<PublicBlogComment[]> => {
    return unstable_cache(
      () => queryVisibleBlogComments(centerId, blogPostId),
      ['blog-comments-visible', String(centerId), String(blogPostId)],
      { revalidate: 120, tags: [`center-blog-${centerId}`, `blog-comments-${blogPostId}`] },
    )()
  },
)

/** @deprecated Use getVisibleBlogComments */
export const getApprovedBlogComments = getVisibleBlogComments

// CTA Sliders
async function queryCTASliders(centerId: number): Promise<CTASlider[]> {
  const result = await pool.query(
    'SELECT * FROM cta_sliders WHERE center_id = $1 AND is_active = true ORDER BY display_order',
    [centerId]
  );
  return result.rows;
}

export const getCTASliders = cache(async (centerId: number): Promise<CTASlider[]> => {
  return centerPublicCache('cta-sliders', centerId, 'center-cta', () => queryCTASliders(centerId))()
});

// Custom Sections
async function queryCustomSections(centerId: number): Promise<CustomSection[]> {
  const result = await pool.query(
    'SELECT * FROM custom_sections WHERE center_id = $1 AND is_active = true ORDER BY display_order',
    [centerId]
  );
  return result.rows;
}

export const getCustomSections = cache(async (centerId: number): Promise<CustomSection[]> => {
  return centerPublicCache('custom-sections', centerId, 'center-custom-sections', () => queryCustomSections(centerId))()
});

// Alerts Queries
async function queryAlerts(centerId: number): Promise<any[]> {
  try {
    const result = await pool.query(
      'SELECT * FROM alerts WHERE center_id = $1 AND is_active = true AND (approval_status IS NULL OR approval_status = \'approved\') ORDER BY display_order, created_at DESC',
      [centerId]
    );
    return result.rows;
  } catch (error) {
    // If table doesn't exist, return empty array
    return [];
  }
}

export const getAlerts = cache(async (centerId: number): Promise<any[]> => {
  return centerPublicCache('alerts', centerId, 'center-alerts', () => queryAlerts(centerId))()
});

// FAQ Queries
async function queryFAQs(centerId: number): Promise<FAQ[]> {
  try {
    const result = await pool.query(
      'SELECT * FROM faqs WHERE center_id = $1 AND is_active = true ORDER BY display_order',
      [centerId]
    );
    return result.rows;
  } catch {
    return [];
  }
}

export const getFAQs = cache(async (centerId: number): Promise<FAQ[]> => {
  return centerPublicCache('faqs', centerId, 'center-faq', () => queryFAQs(centerId))()
});

export const getVacancies = cache(async (centerId: number): Promise<Vacancy[]> => {
  return unstable_cache(
    async () => {
      try {
        const result = await pool.query(
          'SELECT * FROM vacancies WHERE center_id = $1 AND is_active = true ORDER BY display_order, created_at',
          [centerId]
        )
        return result.rows
      } catch {
        return []
      }
    },
    ['vacancies-by-center', String(centerId)],
    { revalidate: 120, tags: [`center-vacancies-${centerId}`] }
  )()
})

// About Section Queries
async function queryAboutSection(centerId: number): Promise<any | null> {
  try {
    const result = await pool.query(
      'SELECT * FROM about_sections WHERE center_id = $1 AND is_active = true',
      [centerId]
    );
    return result.rows[0] || null;
  } catch {
    return null;
  }
}

export const getAboutSection = cache(async (centerId: number): Promise<any | null> => {
  return centerPublicCache('about-section', centerId, 'center-about', () => queryAboutSection(centerId))()
});

// Contact Page Content (editable from admin)
export const getContactPageContent = cache(async (centerId: number): Promise<{ heading: string; intro_text: string | null } | null> => {
  try {
    const result = await pool.query(
      'SELECT heading, intro_text FROM contact_page_content WHERE center_id = $1',
      [centerId]
    );
    return result.rows[0] || null;
  } catch (error) {
    return null;
  }
});

// Global Settings Queries (Super Admin controlled)
export const getGlobalSetting = cache(async (key: string): Promise<GlobalSetting | null> => {
  try {
    const result = await pool.query(
      'SELECT * FROM global_settings WHERE setting_key = $1',
      [key]
    );
    return result.rows[0] || null;
  } catch (error) {
    return null;
  }
});

/** Keys used by public Header + Footer chrome (single query per request). */
const PUBLIC_CHROME_SETTING_KEYS = [
  'global_logo_light',
  'global_logo_dark',
  'global_logo_footer',
  'header_dropdown_enabled',
  'header_top_nav_enabled',
  'mobile_app_title',
  'mobile_app_description',
  'mobile_app_store_url',
  'mobile_play_store_url',
  'footer_copyright_text',
] as const

/** One DB round-trip for Header + Footer settings (React `cache` dedupes per request). */
export const getPublicChromeSettings = cache(
  async (): Promise<Record<string, GlobalSetting | null>> => {
    return getGlobalSettingsByKeys([...PUBLIC_CHROME_SETTING_KEYS])
  },
)

/** Fetch multiple global settings in one query (Header/Footer). */
export const getGlobalSettingsByKeys = cache(
  async (keys: string[]): Promise<Record<string, GlobalSetting | null>> => {
    const sortedKey = [...keys].sort().join('\u0001')
    return unstable_cache(
      async () => {
        const map: Record<string, GlobalSetting | null> = {}
        if (keys.length === 0) return map
        keys.forEach((key) => {
          map[key] = null
        })
        try {
          const result = await pool.query(
            'SELECT * FROM global_settings WHERE setting_key = ANY($1::text[])',
            [keys],
          )
          result.rows.forEach((row: GlobalSetting) => {
            map[row.setting_key] = row
          })
        } catch {
          /* ignore */
        }
        return map
      },
      ['global-settings-keys', sortedKey],
      { revalidate: 300, tags: ['global-settings'] }
    )()
  },
)

export function globalSettingValue(
  settings: Record<string, GlobalSetting | null>,
  key: string,
  defaultValue = '',
): string {
  return settings[key]?.setting_value ?? defaultValue
}

export function globalSettingEnabled(
  settings: Record<string, GlobalSetting | null>,
  key: string,
  defaultValue = true,
): boolean {
  const setting = settings[key]
  if (!setting) return defaultValue
  return setting.setting_value === 'true'
}

export async function getGlobalSettings(): Promise<GlobalSetting[]> {
  try {
    const result = await pool.query(
      'SELECT * FROM global_settings ORDER BY setting_key'
    );
    return result.rows;
  } catch (error) {
    return [];
  }
}

export async function getGlobalSettingValue(key: string, defaultValue: string = ''): Promise<string> {
  const setting = await getGlobalSetting(key);
  return setting?.setting_value ?? defaultValue;
}

export async function isGlobalSettingEnabled(key: string, defaultValue: boolean = true): Promise<boolean> {
  const setting = await getGlobalSetting(key);
  if (!setting) return defaultValue;
  return setting.setting_value === 'true';
}

// Header Menu Items Queries (Super Admin controlled)
export const getHeaderMenuItems = cache(async (): Promise<HeaderMenuItem[]> => {
  return unstable_cache(
    async () => {
      try {
        const result = await pool.query(
          'SELECT * FROM header_menu_items WHERE is_active = true ORDER BY display_order'
        )
        return buildHeaderMenuTree(result.rows as HeaderMenuItem[])
      } catch {
        return []
      }
    },
    ['header-menu-items-v1'],
    { revalidate: 300, tags: ['header-menu'] }
  )()
})

// Footer Menu Items Queries (Super Admin controlled)
export const getFooterMenuItems = cache(async (): Promise<FooterMenuItem[]> => {
  try {
    const result = await pool.query(
      'SELECT * FROM footer_menu_items WHERE is_active = true ORDER BY menu_group, display_order'
    );
    return result.rows;
  } catch (error: any) {
    if (error.code === '42P01') {
      console.warn('footer_menu_items table does not exist yet.');
      return [];
    }
    return [];
  }
});

export const getFooterMenuItemsByGroup = cache(async (): Promise<Record<string, FooterMenuItem[]>> => {
  try {
    const items = await getFooterMenuItems();
    const grouped: Record<string, FooterMenuItem[]> = {};
    
    items.forEach(item => {
      if (!grouped[item.menu_group]) {
        grouped[item.menu_group] = [];
      }
      grouped[item.menu_group].push(item);
    });
    
    return grouped;
  } catch (error) {
    return {};
  }
});

// SEO Settings Queries (cached per request — shared by layout + generateMetadata)
export const getCenterSEOSettings = cache(async (centerId: number): Promise<any | null> => {
  return unstable_cache(
    async () => {
      try {
        const result = await pool.query(
          'SELECT * FROM center_seo_settings WHERE center_id = $1',
          [centerId]
        )
        return result.rows[0] || null
      } catch (error: unknown) {
        const code = (error as { code?: string })?.code
        if (code === '42P01') {
          console.warn('center_seo_settings table does not exist yet. Run the SEO schema migration.')
          return null
        }
        console.error('Error fetching SEO settings:', error)
        return null
      }
    },
    ['center-seo-settings', String(centerId)],
    { revalidate: 300, tags: [`center-seo-${centerId}`] }
  )()
})
