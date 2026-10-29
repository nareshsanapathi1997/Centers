/**
 * Public pages use Tailwind (`app/globals.css` + `app/public-site.css`).
 * Only icon fonts remain as static sheets.
 */
export const CRITICAL_TEMPLATE_STYLESHEETS = [
  '/assets/css/remixicon.css',
] as const

/** Kept for enrollment / rare icon usage — not loaded on public home. */
export const DEFERRED_TEMPLATE_STYLESHEETS = [
  '/assets/css/flaticon.css',
] as const

/** Loaded only on news detail pages — kept separate so home pages skip it. */
export const NEWS_DETAIL_STYLESHEETS = [
  '/assets/css/news-detail-sidebar.css?v=2',
] as const

/** Font Awesome — enrollment flows only (not loaded on public center pages). */
export const ENROLLMENT_STYLESHEETS = [
  '/assets/css/plugins/fontawesome-6.css',
] as const

/** Loaded on content pages (about, contact, vacancies, blog, etc.) — not on home. */
export const CONTENT_PAGES_STYLESHEETS = [
  '/assets/css/content-pages.css',
] as const

/** All public template sheets. */
export const CENTER_TEMPLATE_STYLESHEETS = [
  ...CRITICAL_TEMPLATE_STYLESHEETS,
  ...NEWS_DETAIL_STYLESHEETS,
  ...CONTENT_PAGES_STYLESHEETS,
] as const

export const TEMPLATE_CSS_HREF_PREFIX = '/assets/css/'
