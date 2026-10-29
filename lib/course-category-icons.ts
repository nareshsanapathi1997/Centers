const DEFAULT_COURSE_ICON = 'ri-book-open-line'

/** Ordered rules — more specific patterns first. */
const CATEGORY_ICON_RULES: { pattern: RegExp; icon: string }[] = [
  { pattern: /\bmah[\s/-]*mba\b/i, icon: 'ri-briefcase-line' },
  { pattern: /\bbank\b/i, icon: 'ri-bank-line' },
  { pattern: /\bcat\b|\bmba\b/i, icon: 'ri-graduation-cap-line' },
  { pattern: /\bcmat\b/i, icon: 'ri-file-paper-line' },
  { pattern: /\bcrt\b/i, icon: 'ri-edit-box-line' },
  { pattern: /\bgate\b/i, icon: 'ri-building-line' },
  { pattern: /\bgmat\b/i, icon: 'ri-bar-chart-line' },
  { pattern: /\bgre\b/i, icon: 'ri-global-line' },
  { pattern: /\bmat\b/i, icon: 'ri-calculator-line' },
  { pattern: /\bssc\b/i, icon: 'ri-government-line' },
  { pattern: /\bclat\b/i, icon: 'ri-scales-3-line' },
  { pattern: /\bipm\b/i, icon: 'ri-lightbulb-line' },
  { pattern: /\btancet\b/i, icon: 'ri-file-list-line' },
  { pattern: /\biift\b/i, icon: 'ri-briefcase-4-line' },
  { pattern: /\bsnap\b/i, icon: 'ri-award-line' },
  { pattern: /\bxat\b/i, icon: 'ri-pie-chart-line' },
  { pattern: /\b(neet|medical)\b/i, icon: 'ri-heart-pulse-line' },
  { pattern: /\b(jee|iit)\b/i, icon: 'ri-flask-line' },
  { pattern: /\bcuet\b/i, icon: 'ri-book-marked-line' },
  { pattern: /\bnda\b|\bdefence\b|\bdefense\b/i, icon: 'ri-shield-star-line' },
  { pattern: /\bca\b|\bchartered\b/i, icon: 'ri-money-rupee-circle-line' },
  { pattern: /\bfoundation\b/i, icon: 'ri-seedling-line' },
  { pattern: /\bboard\b|\bclass\s*\d/i, icon: 'ri-school-line' },
]

export function getCourseCategoryIconClass(
  name?: string | null,
  iconClass?: string | null
): string {
  if (iconClass && iconClass !== DEFAULT_COURSE_ICON) return iconClass
  if (!name?.trim()) return DEFAULT_COURSE_ICON

  for (const rule of CATEGORY_ICON_RULES) {
    if (rule.pattern.test(name)) return rule.icon
  }

  return DEFAULT_COURSE_ICON
}
