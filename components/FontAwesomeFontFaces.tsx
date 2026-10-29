import { withBasePath } from '@/lib/with-base-path'

/**
 * Font Awesome webfonts with basePath-aware absolute URLs.
 * fontawesome-6.css uses relative ../../fonts/ paths that break when CSS is
 * resolved without the Next.js basePath prefix (e.g. /assets/fonts 404).
 */
export default function FontAwesomeFontFaces() {
  const solidWoff2 = withBasePath('/assets/fonts/fa-solid-900.woff2')
  const solidTtf = withBasePath('/assets/fonts/fa-solid-900.ttf')
  const regularWoff2 = withBasePath('/assets/fonts/fa-regular-400.woff2')
  const regularTtf = withBasePath('/assets/fonts/fa-regular-400.ttf')
  const brandsWoff2 = withBasePath('/assets/fonts/fa-brands-400.woff2')
  const brandsTtf = withBasePath('/assets/fonts/fa-brands-400.ttf')

  return (
    <style
      dangerouslySetInnerHTML={{
        __html: `
@font-face{font-family:"Font Awesome 6 Pro";font-style:normal;font-weight:900;font-display:swap;src:url("${solidWoff2}") format("woff2"),url("${solidTtf}") format("truetype")}
@font-face{font-family:"Font Awesome 6 Pro";font-style:normal;font-weight:400;font-display:swap;src:url("${regularWoff2}") format("woff2"),url("${regularTtf}") format("truetype")}
@font-face{font-family:"Font Awesome 6 Brands";font-style:normal;font-weight:400;font-display:swap;src:url("${brandsWoff2}") format("woff2"),url("${brandsTtf}") format("truetype")}
.enrollment-container .fa,.enrollment-container .fas,.enrollment-container .far,.enrollment-container .fab{font-family:"Font Awesome 6 Pro",var(--fa-style-family,"Font Awesome 6 Pro")!important;font-weight:var(--fa-style,900)}
.enrollment-container .far{font-weight:400!important}
.enrollment-container .fab{font-family:"Font Awesome 6 Brands"!important;font-weight:400!important}
`,
      }}
    />
  )
}
