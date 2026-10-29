export type WebsiteHomeFieldType =
  | 'text'
  | 'textarea'
  | 'url'
  | 'image'
  | 'number'
  | 'boolean'
  | 'select'
  | 'date'
  | 'slug'
  | 'string-list'
  | 'rich-text'

export type WebsiteHomeFieldDef = {
  key: string
  label: string
  type: WebsiteHomeFieldType
  required?: boolean
  options?: Array<{ value: string; label: string }>
  placeholder?: string
  helpText?: string
}

export type WebsiteHomeResourceDef = {
  slug: string
  label: string
  table: string
  sectionKey: string
  singleton?: boolean
  listColumns: string[]
  fields: WebsiteHomeFieldDef[]
  orderBy?: string
}

export const WEBSITE_HOME_RESOURCES: WebsiteHomeResourceDef[] = [
  {
    slug: 'hero',
    label: 'Hero Slider',
    table: 'website_hero_slides',
    sectionKey: 'hero',
    listColumns: ['title', 'display_order', 'is_active'],
    fields: [
      {
        key: 'title',
        label: 'Slide name (admin only)',
        type: 'text',
        required: true,
        helpText: 'For admin list only — not shown on the homepage. Set the hero badge title below.',
      },
      { key: 'slider_image_url', label: 'Banner Image', type: 'image', required: true },
      { key: 'button_link', label: 'Button Link', type: 'url' },
      { key: 'display_order', label: 'Display Order', type: 'number' },
      { key: 'is_active', label: 'Active', type: 'boolean' },
    ],
  },
  {
    slug: 'news',
    label: 'News & Notifications',
    table: 'website_news_items',
    sectionKey: 'news',
    listColumns: ['title', 'is_notification', 'is_active'],
    fields: [
      { key: 'title', label: 'Title', type: 'text', required: true },
      { key: 'content', label: 'Content', type: 'textarea' },
      { key: 'link_url', label: 'Link URL', type: 'url' },
      {
        key: 'is_notification',
        label: 'Type',
        type: 'select',
        options: [
          { value: 'false', label: 'News' },
          { value: 'true', label: 'Notification' },
        ],
      },
      { key: 'is_new', label: 'Mark as New', type: 'boolean' },
      { key: 'display_order', label: 'Display Order', type: 'number' },
      { key: 'is_active', label: 'Active', type: 'boolean' },
    ],
  },
  {
    slug: 'courses',
    label: 'Courses',
    table: 'website_courses',
    sectionKey: 'courses',
    listColumns: ['name', 'category', 'is_active'],
    fields: [
      { key: 'name', label: 'Course Name', type: 'text', required: true },
      {
        key: 'category',
        label: 'Category',
        type: 'select',
        options: [
          { value: 'college_level', label: 'College Level' },
          { value: 'school_level', label: 'School Level' },
        ],
      },
      { key: 'icon_class', label: 'Icon Class', type: 'text', placeholder: 'ri-book-open-line' },
      { key: 'link_url', label: 'Link URL', type: 'url', helpText: 'Optional link to category or program page' },
      { key: 'display_order', label: 'Display Order', type: 'number' },
      { key: 'is_active', label: 'Active', type: 'boolean' },
    ],
  },
  {
    slug: 'results',
    label: 'Results',
    table: 'website_result_images',
    sectionKey: 'results',
    orderBy: 'result_year DESC NULLS LAST, display_order, id',
    listColumns: ['title', 'entry_type', 'result_year', 'exam_category', 'is_active'],
    fields: [
      {
        key: 'entry_type',
        label: 'Entry type',
        type: 'select',
        required: true,
        options: [
          { value: 'image', label: 'Image only' },
          { value: 'text', label: 'Text only (rich text)' },
          { value: 'image_text', label: 'Image + rich text' },
        ],
        helpText: 'Choose how this result appears on /results and the homepage.',
      },
      { key: 'title', label: 'Title', type: 'text', required: true },
      {
        key: 'content_html',
        label: 'Rich text content',
        type: 'rich-text',
        helpText: 'Used for Text only and Image + text entries. Supports headings, lists, links, and inline images.',
      },
      {
        key: 'image_url',
        label: 'Result image',
        type: 'image',
        helpText: 'Required for Image only and Image + text entries.',
      },
      {
        key: 'result_year',
        label: 'Result year',
        type: 'number',
        required: true,
        placeholder: '2025',
        helpText: 'Academic/result year (e.g. 2024, 2025). Used for year filters on /results.',
      },
      {
        key: 'exam_category',
        label: 'Exam category',
        type: 'select',
        options: [
          { value: '', label: 'General / All exams' },
          { value: 'cat', label: 'CAT/MBA' },
          { value: 'bank', label: 'Bank Exams' },
          { value: 'gate', label: 'GATE' },
          { value: 'gmat', label: 'GMAT' },
          { value: 'jee', label: 'JEE/Engg' },
          { value: 'neet', label: 'NEET' },
          { value: 'clat', label: 'CLAT' },
          { value: 'ipm', label: 'IPM/BBA' },
          { value: 'icet', label: 'ICET' },
        ],
        helpText: 'Optional — filter by exam on /results (works together with year).',
      },
      { key: 'display_order', label: 'Display Order', type: 'number' },
      { key: 'is_active', label: 'Active', type: 'boolean' },
    ],
  },
  {
    slug: 'video-testimonials',
    label: 'Video Testimonials',
    table: 'website_video_testimonials',
    sectionKey: 'video_testimonials',
    listColumns: ['title', 'is_active'],
    fields: [
      { key: 'title', label: 'Title', type: 'text', required: true },
      { key: 'video_url', label: 'Video URL', type: 'url', required: true },
      { key: 'display_order', label: 'Display Order', type: 'number' },
      { key: 'is_active', label: 'Active', type: 'boolean' },
    ],
  },
  {
    slug: 'text-testimonials',
    label: 'Text Testimonials',
    table: 'website_text_testimonials',
    sectionKey: 'text_testimonials',
    listColumns: ['author_name', 'is_active'],
    fields: [
      { key: 'quote', label: 'Quote', type: 'textarea', required: true },
      { key: 'author_name', label: 'Author Name', type: 'text', required: true },
      { key: 'author_role', label: 'Author Role', type: 'text' },
      { key: 'display_order', label: 'Display Order', type: 'number' },
      { key: 'is_active', label: 'Active', type: 'boolean' },
    ],
  },
  {
    slug: 'student-stories',
    label: 'Student Stories',
    table: 'website_student_stories',
    sectionKey: 'student_stories',
    listColumns: ['student_name', 'course_name', 'is_active'],
    fields: [
      { key: 'student_name', label: 'Student Name', type: 'text', required: true },
      { key: 'student_image_url', label: 'Student Image', type: 'image' },
      { key: 'course_name', label: 'Course', type: 'text' },
      { key: 'batch_year', label: 'Batch Year', type: 'text' },
      { key: 'achievement_title', label: 'Achievement', type: 'text' },
      { key: 'story_content', label: 'Story', type: 'textarea', required: true },
      { key: 'testimonial_quote', label: 'Quote', type: 'textarea' },
      { key: 'video_url', label: 'Video URL', type: 'url' },
      { key: 'is_featured', label: 'Featured', type: 'boolean' },
      { key: 'display_order', label: 'Display Order', type: 'number' },
      { key: 'is_active', label: 'Active', type: 'boolean' },
    ],
  },
  {
    slug: 'leadership',
    label: 'Leadership',
    table: 'website_leadership',
    sectionKey: 'leadership',
    listColumns: ['name', 'role', 'is_active'],
    fields: [
      { key: 'name', label: 'Name', type: 'text', required: true },
      { key: 'role', label: 'Role', type: 'text', required: true },
      { key: 'image_url', label: 'Photo', type: 'image' },
      { key: 'message_title', label: 'Message Title', type: 'text' },
      { key: 'message_content', label: 'Message', type: 'textarea' },
      { key: 'bio', label: 'Bio', type: 'textarea' },
      { key: 'display_order', label: 'Display Order', type: 'number' },
      { key: 'is_active', label: 'Active', type: 'boolean' },
    ],
  },
  {
    slug: 'senior-faculty',
    label: 'Senior Faculty',
    table: 'website_senior_faculty',
    sectionKey: 'senior_faculty',
    listColumns: ['name', 'role', 'is_active'],
    fields: [
      { key: 'name', label: 'Name', type: 'text', required: true },
      { key: 'role', label: 'Role', type: 'text', required: true },
      { key: 'description', label: 'Description', type: 'textarea' },
      { key: 'image_url', label: 'Photo', type: 'image' },
      { key: 'display_order', label: 'Display Order', type: 'number' },
      { key: 'is_active', label: 'Active', type: 'boolean' },
    ],
  },
  {
    slug: 'gallery',
    label: 'Gallery',
    table: 'website_gallery_images',
    sectionKey: 'gallery',
    listColumns: ['title', 'gallery_type', 'is_active'],
    fields: [
      { key: 'title', label: 'Title', type: 'text', required: true },
      { key: 'image_url', label: 'Image', type: 'image', required: true },
      {
        key: 'gallery_type',
        label: 'Type',
        type: 'select',
        options: [
          { value: 'general', label: 'General' },
          { value: 'photos', label: 'Photos' },
          { value: 'videos', label: 'Videos' },
        ],
      },
      { key: 'display_order', label: 'Display Order', type: 'number' },
      { key: 'is_active', label: 'Active', type: 'boolean' },
    ],
  },
  {
    slug: 'blog',
    label: 'Blog Posts',
    table: 'website_blog_posts',
    sectionKey: 'blog',
    listColumns: ['title', 'is_published'],
    fields: [
      { key: 'title', label: 'Title', type: 'text', required: true },
      { key: 'slug', label: 'Slug', type: 'slug', required: true },
      { key: 'excerpt', label: 'Excerpt', type: 'textarea' },
      { key: 'content', label: 'Content', type: 'textarea' },
      { key: 'featured_image_url', label: 'Featured Image', type: 'image' },
      { key: 'author_name', label: 'Author', type: 'text' },
      { key: 'published_date', label: 'Published Date', type: 'date' },
      { key: 'is_published', label: 'Published', type: 'boolean' },
    ],
  },
  {
    slug: 'about',
    label: 'About Us Pages',
    table: 'website_about_sections',
    sectionKey: 'about',
    singleton: true,
    orderBy: 'id',
    listColumns: ['title', 'is_active'],
    fields: [
      {
        key: 'overview_hero_title',
        label: 'Hero title',
        type: 'text',
        helpText: 'First part of the banner heading (e.g. About)',
      },
      {
        key: 'overview_hero_highlight',
        label: 'Hero highlight',
        type: 'text',
        helpText: 'Coloured second part of the banner (e.g. Us)',
      },
      {
        key: 'overview_hero_subtitle',
        label: 'Hero subtitle',
        type: 'textarea',
        helpText: 'Short line under the banner heading on /about',
      },
      {
        key: 'title',
        label: 'Content eyebrow',
        type: 'text',
        helpText: 'Small label above the main heading (e.g. Get To Know Us)',
      },
      { key: 'heading', label: 'Main heading', type: 'text' },
      { key: 'description', label: 'Description', type: 'textarea', helpText: 'Use blank lines for multiple paragraphs' },
      { key: 'subtext', label: 'Closing subtext', type: 'text' },
      { key: 'feature_list', label: 'Feature bullets (one per line)', type: 'string-list' },
      { key: 'image_url', label: 'Main image', type: 'image' },
      {
        key: 'overview_badge_years',
        label: 'Image badge — years',
        type: 'text',
        placeholder: '30+',
        helpText: 'Shown on the photo badge overlay',
      },
      {
        key: 'overview_badge_label',
        label: 'Image badge — label',
        type: 'text',
        placeholder: 'Years Of Excellence',
      },
      {
        key: 'philosophy_hero_title',
        label: 'Hero title',
        type: 'text',
        helpText: 'Banner heading part 1 on /about/philosophy',
      },
      {
        key: 'philosophy_hero_highlight',
        label: 'Hero highlight',
        type: 'text',
        helpText: 'Banner heading part 2 (highlight colour)',
      },
      {
        key: 'philosophy_hero_subtitle',
        label: 'Hero subtitle',
        type: 'textarea',
      },
      {
        key: 'philosophy_eyebrow',
        label: 'Content eyebrow',
        type: 'text',
        helpText: 'Small label above philosophy heading (defaults to site name)',
      },
      { key: 'philosophy_heading', label: 'Main heading', type: 'text' },
      { key: 'philosophy_description', label: 'Description', type: 'textarea' },
      { key: 'philosophy_feature_list', label: 'Feature bullets (one per line)', type: 'string-list' },
      { key: 'philosophy_image_url', label: 'Main image', type: 'image' },
      {
        key: 'promoters_hero_title',
        label: 'Hero title',
        type: 'text',
        helpText: 'Banner heading part 1 on /about/promoters',
      },
      {
        key: 'promoters_hero_highlight',
        label: 'Hero highlight',
        type: 'text',
        helpText: 'Banner heading part 2 (highlight colour)',
      },
      {
        key: 'promoters_hero_subtitle',
        label: 'Hero subtitle',
        type: 'textarea',
      },
      {
        key: 'promoters_eyebrow',
        label: 'Section eyebrow',
        type: 'text',
        helpText: 'Small label above the intro block',
      },
      { key: 'promoters_section_heading', label: 'Intro heading', type: 'text' },
      { key: 'promoters_section_intro', label: 'Intro paragraph', type: 'textarea' },
      {
        key: 'promoters_message_label',
        label: 'Shared message label',
        type: 'text',
        helpText: 'Label above the quote block (from first promoter profile)',
      },
      { key: 'promoters_directors_heading', label: 'Profiles grid heading', type: 'text' },
      { key: 'promoters_directors_subtitle', label: 'Profiles grid subtitle', type: 'textarea' },
      { key: 'is_active', label: 'Published', type: 'boolean' },
    ],
  },
  {
    slug: 'faq',
    label: 'FAQ',
    table: 'website_faqs',
    sectionKey: 'faq',
    listColumns: ['question', 'is_active'],
    fields: [
      { key: 'question', label: 'Question', type: 'textarea', required: true },
      { key: 'answer', label: 'Answer', type: 'textarea', required: true },
      { key: 'display_order', label: 'Display Order', type: 'number' },
      { key: 'is_active', label: 'Active', type: 'boolean' },
    ],
  },
]

export function getWebsiteHomeResource(slug: string): WebsiteHomeResourceDef | undefined {
  return WEBSITE_HOME_RESOURCES.find((r) => r.slug === slug)
}

export const WEBSITE_HOME_RESOURCE_SLUGS = WEBSITE_HOME_RESOURCES.map((r) => r.slug)
