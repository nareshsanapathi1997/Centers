import pool from '@/lib/db'

/**
 * Active center slugs for `generateStaticParams` on public center routes.
 * Failures return [] so a missing DB during build does not break CI.
 */
export async function getActiveCenterStaticParams(): Promise<Array<{ slug: string }>> {
  if (process.env.NODE_ENV !== 'production') {
    return []
  }

  try {
    const result = await pool.query<{ slug: string }>(
      `SELECT slug FROM centers WHERE is_active = true AND slug IS NOT NULL AND slug <> '' ORDER BY slug`
    )
    return result.rows.map((row) => ({ slug: row.slug }))
  } catch (error) {
    console.warn('[generateStaticParams] could not load center slugs:', error)
    return []
  }
}
