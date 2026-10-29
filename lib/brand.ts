/**
 * Product identity. Every built-in default name, email, sender ID and store link
 * comes from here; site-specific values are still editable in Super Admin → Settings.
 * To rebrand, change this file and the images in public/assets/img/.
 */
export const BRAND = {
  /** Full organisation name: page titles, emails, SEO defaults. */
  name: 'EduSphere Academy',
  /** Short name used in running text, e.g. "EduSphere Chennai". */
  shortName: 'EduSphere',
  /** Name of the admin product. */
  productName: 'EduSphere CenterHub',
  tagline: 'Coaching for CAT, GATE, Banking and Government exams',
  /** Placeholder domain (RFC 2606) — replace with the real one before go-live. */
  domain: 'edusphere.example.com',
  supportEmail: 'info@edusphere.example.com',
  /** 6-letter DLT sender ID for transactional SMS. */
  smsSenderId: 'EDUSPH',
  careersLabel: 'Careers@EduSphere',
  /** Store links stay empty until the company publishes its own app. */
  playStoreUrl: '',
  appStoreUrl: '',
} as const

/** Default mailbox for a centre, e.g. `chennai@edusphere.example.com`. */
export function centerEmail(slug: string): string {
  return `${slug}@${BRAND.domain}`
}
