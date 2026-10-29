/**
 * Map center URL slug (e.g. `chennai` from `/chennai`) to MSSQL `vCore_City.sName`
 * for `/api/public/mssql/subcourse-report?city=…`.
 *
 * Override per center: set env `CENTER_MSSQL_CITY_{SLUG_UPPER}` e.g. `CENTER_MSSQL_CITY_CHENNAI=Madras`
 * (optional; slug-based default is usually correct).
 */
export function mssqlCityFromCenterSlug(slug: string): string {
  const s = slug.trim()
  if (!s) return 'Chennai'

  const envKey = `CENTER_MSSQL_CITY_${s.replace(/[^a-z0-9]+/gi, '_').toUpperCase()}`
  const fromEnv = process.env[envKey]?.trim()
  if (fromEnv) return fromEnv

  return s
    .split(/[-_]+/)
    .filter(Boolean)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
    .join(' ')
}

/**
 * Primary TEEMS / enrollment city for compound slugs (e.g. `chennai-central` → `Chennai`).
 * Branch slugs map to the parent city used in MSSQL and classroom/online-live APIs.
 */
export function teemsCityFromCenterSlug(slug: string): string {
  const s = slug.trim()
  if (!s) return 'Chennai'

  const envKey = `CENTER_MSSQL_CITY_${s.replace(/[^a-z0-9]+/gi, '_').toUpperCase()}`
  const fromEnv = process.env[envKey]?.trim()
  if (fromEnv) return fromEnv

  const segments = s.split(/[-_]+/).filter(Boolean)
  if (segments.length === 0) return 'Chennai'

  const primary = segments[0]
  return primary.charAt(0).toUpperCase() + primary.slice(1).toLowerCase()
}
