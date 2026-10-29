import { withBasePath } from '@/lib/with-base-path'
import type { Center } from '@/types'

type SeoSettings = {
  schema_markup?: string | Record<string, unknown>
} | null

interface SEOSchemaProps {
  center: Center
  seoSettings: SeoSettings
}

function getSchemaMarkup(center: Center, seoSettings: SeoSettings) {
  if (seoSettings?.schema_markup) {
    try {
      return typeof seoSettings.schema_markup === 'string'
        ? JSON.parse(seoSettings.schema_markup)
        : seoSettings.schema_markup
    } catch {
      return null
    }
  }

  const baseUrl = (
    process.env.NEXT_PUBLIC_BASE_URL ||
    process.env.NEXT_PUBLIC_APP_URL ||
    ''
  ).replace(/\/+$/, '')

  return {
    '@context': 'https://schema.org',
    '@type': 'EducationalOrganization',
    name: center.name,
    description: center.description || `${center.name} - EduSphere Academy`,
    url: baseUrl ? `${baseUrl}${withBasePath(`/${center.slug}`)}` : withBasePath(`/${center.slug}`),
    logo: center.logo_url,
    address: center.address
      ? {
          '@type': 'PostalAddress',
          streetAddress: center.address,
        }
      : undefined,
    contactPoint:
      center.email || center.phone
        ? {
            '@type': 'ContactPoint',
            email: center.email,
            telephone: Array.isArray(center.phone) ? center.phone[0] : center.phone,
          }
        : undefined,
  }
}

/** Server-rendered JSON-LD (no client hydration). */
export default function SEOSchema({ center, seoSettings }: SEOSchemaProps) {
  const schemaMarkup = getSchemaMarkup(center, seoSettings)
  if (!schemaMarkup) return null

  return (
    <script
      id="schema-markup"
      type="application/ld+json"
      dangerouslySetInnerHTML={{
        // Escaping `<` prevents a stray "</script>" inside CMS-authored SEO
        // text (title, description) from closing this tag early and injecting
        // markup. \u003c is still valid JSON to the parser.
        __html: JSON.stringify(schemaMarkup).replace(/</g, '\\u003c'),
      }}
    />
  )
}
