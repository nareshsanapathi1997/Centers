import DOMPurify from 'isomorphic-dompurify'

/**
 * Sanitizer for HTML authored in the CMS before it reaches
 * `dangerouslySetInnerHTML`.
 *
 * Center admins are not trusted to the level of the platform owner: on a shared
 * multi-tenant domain, a `<script>` or `onerror=` handler saved into a rich-text
 * field would run against every visitor of that center's site, and the session
 * cookie is scoped to the whole host.
 *
 * The allow-list covers what the rich-text editors and templates actually emit:
 * formatting, headings, lists, tables, links, images, and iframe embeds.
 */
const ALLOWED_TAGS = [
  'a', 'abbr', 'address', 'article', 'aside', 'b', 'blockquote', 'br', 'caption',
  'cite', 'code', 'col', 'colgroup', 'dd', 'del', 'details', 'div', 'dl', 'dt',
  'em', 'figcaption', 'figure', 'footer', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
  'header', 'hr', 'i', 'iframe', 'img', 'ins', 'kbd', 'li', 'main', 'mark', 'nav',
  'ol', 'p', 'pre', 'q', 's', 'samp', 'section', 'small', 'span', 'strong', 'sub',
  'summary', 'sup', 'table', 'tbody', 'td', 'tfoot', 'th', 'thead', 'time', 'tr',
  'u', 'ul', 'var', 'wbr',
]

const ALLOWED_ATTR = [
  'href', 'src', 'srcset', 'alt', 'title', 'width', 'height', 'target', 'rel',
  'class', 'id', 'style', 'colspan', 'rowspan', 'align', 'loading', 'datetime',
  'allow', 'allowfullscreen', 'frameborder', 'referrerpolicy', 'dir', 'lang',
]

const CONFIG = {
  ALLOWED_TAGS,
  ALLOWED_ATTR,
  // javascript: and data: URIs in href/src are the main bypass route.
  ALLOWED_URI_REGEXP: /^(?:(?:https?|mailto|tel):|[^a-z]|[a-z+.-]+(?:[^a-z+.\-:]|$))/i,
  ADD_ATTR: ['target'],
  FORBID_TAGS: ['script', 'style', 'form', 'input', 'button', 'object', 'embed', 'base', 'link'],
  FORBID_ATTR: ['srcdoc', 'formaction', 'ping'],
}

/** Sanitize rich-text/CMS HTML for rendering. Returns '' for empty input. */
export function sanitizeCmsHtml(html: string | null | undefined): string {
  if (!html) return ''
  return DOMPurify.sanitize(html, CONFIG) as string
}

/**
 * Stricter variant for short inline fields (titles, labels, table cells) where
 * block layout and embeds are never wanted.
 */
export function sanitizeInlineHtml(html: string | null | undefined): string {
  if (!html) return ''
  return DOMPurify.sanitize(html, {
    ALLOWED_TAGS: ['b', 'i', 'em', 'strong', 'u', 's', 'sub', 'sup', 'br', 'span', 'a', 'small'],
    ALLOWED_ATTR: ['href', 'title', 'target', 'rel', 'class'],
  }) as string
}
