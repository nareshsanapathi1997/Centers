import { CRITICAL_TEMPLATE_STYLESHEETS } from '@/lib/template-styles'
import { withBasePath } from '@/lib/with-base-path'

/**
 * Icon font only. Layout, color, and components come from Tailwind.
 */
export default function TemplateStylesheetLinks() {
  return (
    <>
      <link
        rel="preload"
        href={withBasePath('/assets/fonts/remixicon117c.woff2')}
        as="font"
        type="font/woff2"
        crossOrigin="anonymous"
      />
      {CRITICAL_TEMPLATE_STYLESHEETS.map((href) => (
        <link key={href} rel="stylesheet" href={withBasePath(href)} />
      ))}
    </>
  )
}
