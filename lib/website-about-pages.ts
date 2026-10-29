export type WebsiteAboutSectionRow = {
  id?: number
  title?: string | null
  heading?: string | null
  description?: string | null
  subtext?: string | null
  feature_list?: string[] | null
  image_url?: string | null
  is_active?: boolean
  overview_hero_title?: string | null
  overview_hero_highlight?: string | null
  overview_hero_subtitle?: string | null
  overview_badge_years?: string | null
  overview_badge_label?: string | null
  philosophy_heading?: string | null
  philosophy_description?: string | null
  philosophy_image_url?: string | null
  philosophy_feature_list?: string[] | null
  philosophy_hero_title?: string | null
  philosophy_hero_highlight?: string | null
  philosophy_hero_subtitle?: string | null
  philosophy_eyebrow?: string | null
  promoters_hero_title?: string | null
  promoters_hero_highlight?: string | null
  promoters_hero_subtitle?: string | null
  promoters_eyebrow?: string | null
  promoters_section_heading?: string | null
  promoters_section_intro?: string | null
  promoters_directors_heading?: string | null
  promoters_directors_subtitle?: string | null
  promoters_message_label?: string | null
}

export const ABOUT_SUB_PAGES = [
  {
    key: 'overview',
    label: 'Overview',
    href: '/about',
    icon: 'ri-file-list-line',
  },
  {
    key: 'philosophy',
    label: 'Our Philosophy',
    href: '/about/philosophy',
    icon: 'ri-lightbulb-line',
  },
  {
    key: 'promoters',
    label: 'Meet the Promoters',
    href: '/about/promoters',
    icon: 'ri-team-line',
  },
] as const

export type AboutSubPageKey = (typeof ABOUT_SUB_PAGES)[number]['key']

const DEFAULT_OVERVIEW = {
  title: 'Get To Know Us',
  heading: 'Empowering Students with Quality Education',
  description:
    'We are committed to academic excellence, building strong fundamentals, and helping students achieve their goals in competitive exams and beyond. Our experienced faculty, proven pedagogy, and result-oriented approach have made us a trusted name in test preparation and career-focused education.',
  subtext: 'Committed to excellence, student success, and long-term career growth.',
  features: [
    'Structured curriculum designed for competitive exams',
    'Experienced faculty with industry expertise',
    'Regular assessments and performance tracking',
    'Personalized attention and doubt-resolution support',
    'Proven track record of top ranks and selections',
  ],
  imageUrl: '/assets/img/about-img.jpg',
  heroTitle: 'About',
  heroHighlight: 'Us',
  heroSubtitle: 'Our mission, values, and commitment to your success',
  badgeYears: '30+',
  badgeLabel: 'Years Of Excellence',
}

const DEFAULT_PHILOSOPHY = {
  heading: 'Our Philosophy',
  description:
    'We believe in building strong fundamentals, disciplined preparation, and personalised mentoring. Our approach combines expert faculty, structured study plans, and continuous assessment to help every student reach their potential in competitive exams and beyond.',
  features: [
    'Student-first coaching with measurable outcomes',
    'Concept clarity before shortcuts and tricks',
    'Faculty mentorship beyond classroom hours',
    'Ethical, transparent guidance for every learner',
  ],
  imageUrl: '/assets/img/about-img.jpg',
  heroTitle: 'Our',
  heroHighlight: 'Philosophy',
  heroSubtitle: '',
  eyebrow: '',
}

const DEFAULT_PROMOTERS = {
  heroTitle: 'Meet the',
  heroHighlight: 'Promoters',
  heroSubtitle: '',
  eyebrow: 'Meet the Promoters',
  sectionHeading: '',
  sectionIntro:
    'Our promoters built EduSphere on a commitment to quality education, ethical coaching, and measurable student outcomes across India.',
  directorsHeading: 'Our Promoters',
  directorsSubtitle: "Experienced leaders guiding EduSphere's national test-prep mission.",
  messageLabel: 'Message from Our Promoters',
}

function splitParagraphs(text: string): string[] {
  return text.split('\n').filter((p) => p.trim().length > 0)
}

function pickString(value: string | null | undefined, fallback: string): string {
  const trimmed = value?.trim()
  return trimmed || fallback
}

function pickFeatures(value: string[] | null | undefined, fallback: string[]): string[] {
  return Array.isArray(value) && value.length > 0 ? value : fallback
}

export function resolveAboutOverviewPage(row: WebsiteAboutSectionRow | null, siteName: string) {
  const heroSubtitle =
    row?.overview_hero_subtitle?.trim() ||
    DEFAULT_OVERVIEW.heroSubtitle

  const heading =
    row?.heading?.trim() ||
    `${DEFAULT_OVERVIEW.heading} at ${siteName}`

  const description =
    row?.description?.trim() ||
    DEFAULT_OVERVIEW.description.replace('We are', `${siteName} is`)

  return {
    title: pickString(row?.title, DEFAULT_OVERVIEW.title),
    heading,
    description,
    descriptionParagraphs: splitParagraphs(description),
    subtext: pickString(row?.subtext, DEFAULT_OVERVIEW.subtext),
    featureList: pickFeatures(row?.feature_list, DEFAULT_OVERVIEW.features),
    imageUrl: pickString(row?.image_url, DEFAULT_OVERVIEW.imageUrl),
    heroTitle: pickString(row?.overview_hero_title, DEFAULT_OVERVIEW.heroTitle),
    heroHighlight: pickString(row?.overview_hero_highlight, DEFAULT_OVERVIEW.heroHighlight),
    heroSubtitle,
    badgeYears: pickString(row?.overview_badge_years, DEFAULT_OVERVIEW.badgeYears),
    badgeLabel: pickString(row?.overview_badge_label, DEFAULT_OVERVIEW.badgeLabel),
  }
}

export function resolveAboutPhilosophyPage(row: WebsiteAboutSectionRow | null, siteName: string) {
  const heading = pickString(row?.philosophy_heading, DEFAULT_PHILOSOPHY.heading)
  const description = pickString(row?.philosophy_description, DEFAULT_PHILOSOPHY.description)
  const heroSubtitle =
    row?.philosophy_hero_subtitle?.trim() ||
    DEFAULT_PHILOSOPHY.heroSubtitle ||
    `How ${siteName} approaches learning, mentoring, and student success`

  return {
    heading,
    description,
    paragraphs: splitParagraphs(description),
    featureList: pickFeatures(row?.philosophy_feature_list, DEFAULT_PHILOSOPHY.features),
    imageUrl:
      row?.philosophy_image_url?.trim() ||
      row?.image_url?.trim() ||
      DEFAULT_PHILOSOPHY.imageUrl,
    heroTitle: pickString(row?.philosophy_hero_title, DEFAULT_PHILOSOPHY.heroTitle),
    heroHighlight: pickString(row?.philosophy_hero_highlight, DEFAULT_PHILOSOPHY.heroHighlight),
    heroSubtitle,
    eyebrow: pickString(row?.philosophy_eyebrow, siteName),
  }
}

export function resolveAboutPromotersPage(row: WebsiteAboutSectionRow | null, siteName: string) {
  const heroSubtitle =
    row?.promoters_hero_subtitle?.trim() ||
    DEFAULT_PROMOTERS.heroSubtitle ||
    `The leadership and vision behind ${siteName}`

  const sectionHeading =
    row?.promoters_section_heading?.trim() ||
    DEFAULT_PROMOTERS.sectionHeading ||
    `The Vision Behind ${siteName}`

  return {
    heroTitle: pickString(row?.promoters_hero_title, DEFAULT_PROMOTERS.heroTitle),
    heroHighlight: pickString(row?.promoters_hero_highlight, DEFAULT_PROMOTERS.heroHighlight),
    heroSubtitle,
    eyebrow: pickString(row?.promoters_eyebrow, DEFAULT_PROMOTERS.eyebrow),
    sectionHeading,
    sectionIntro: pickString(row?.promoters_section_intro, DEFAULT_PROMOTERS.sectionIntro),
    directorsHeading: pickString(
      row?.promoters_directors_heading,
      DEFAULT_PROMOTERS.directorsHeading
    ),
    directorsSubtitle: pickString(
      row?.promoters_directors_subtitle,
      DEFAULT_PROMOTERS.directorsSubtitle
    ),
    messageLabel: pickString(row?.promoters_message_label, DEFAULT_PROMOTERS.messageLabel),
  }
}
