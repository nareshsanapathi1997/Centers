/** Base URL for external prelogin/catalog API (course features, catalog data). */
export const PRELOGIN_API_BASE_URL =
  process.env.NEXT_PUBLIC_PRELOGIN_API_URL?.replace(/\/$/, '') || ''
