import type { AdminFieldRules } from '@/lib/admin-form-validation'

export const ADMIN_CONTENT_FORM_RULES = {
  news: {
    title: [{ type: 'required', message: 'Title is required.' }],
    link_url: [{ type: 'url', optional: true, message: 'Enter a valid URL (http or https).' }],
  } satisfies AdminFieldRules,

  blog: {
    title: [{ type: 'required', message: 'Title is required.' }],
    slug: [
      { type: 'required', message: 'Slug is required.' },
      { type: 'slug', message: 'Use lowercase letters, numbers, and hyphens only.' },
    ],
  } satisfies AdminFieldRules,

  results: {
    title: [{ type: 'required', message: 'Title is required.' }],
    image_url: [{ type: 'required', message: 'Result image is required.' }],
  } satisfies AdminFieldRules,

  gallery: {
    title: [{ type: 'required', message: 'Title is required.' }],
    image_url: [{ type: 'required', message: 'Gallery image is required.' }],
  } satisfies AdminFieldRules,

  testimonialsText: {
    quote: [{ type: 'required', message: 'Quote is required.' }],
    author_name: [{ type: 'required', message: 'Author name is required.' }],
  } satisfies AdminFieldRules,

  testimonialsVideo: {
    title: [{ type: 'required', message: 'Video title is required.' }],
    video_url: [
      { type: 'required', message: 'Video URL is required.' },
      { type: 'url', message: 'Enter a valid YouTube URL (http or https).' },
    ],
  } satisfies AdminFieldRules,

  leadership: {
    name: [{ type: 'required', message: 'Name is required.' }],
    role: [{ type: 'required', message: 'Role is required.' }],
  } satisfies AdminFieldRules,

  seniorFaculty: {
    name: [{ type: 'required', message: 'Name is required.' }],
    role: [{ type: 'required', message: 'Role is required.' }],
  } satisfies AdminFieldRules,

  centers: {
    name: [{ type: 'required', message: 'Center name is required.' }],
    email: [{ type: 'email', optional: true, message: 'Enter a valid email address.' }],
    google_rating_url: [{ type: 'url', optional: true, message: 'Enter a valid URL (http or https).' }],
    map_embed_url: [{ type: 'url', optional: true, message: 'Enter a valid URL (http or https).' }],
  } satisfies AdminFieldRules,

  faq: {
    question: [{ type: 'required', message: 'Question is required.' }],
    answer: [{ type: 'required', message: 'Answer is required.' }],
  } satisfies AdminFieldRules,

  vacancies: {
    title: [{ type: 'required', message: 'Title is required.' }],
  } satisfies AdminFieldRules,

  customSections: {
    section_type: [{ type: 'required', message: 'Section type is required.' }],
  } satisfies AdminFieldRules,

  ctaSliders: {
    text: [{ type: 'required', message: 'Text is required.' }],
    link_url: [{ type: 'url', optional: true, message: 'Enter a valid URL (http or https).' }],
  } satisfies AdminFieldRules,

  studentStories: {
    student_name: [{ type: 'required', message: 'Story title is required.' }],
    video_url: [
      { type: 'required', message: 'Video URL is required.' },
      { type: 'url', message: 'Enter a valid YouTube URL (http or https).' },
    ],
  } satisfies AdminFieldRules,

  courses: {
    name: [{ type: 'required', message: 'Please select a course.' }],
  } satisfies AdminFieldRules,

  hero: {
    title: [{ type: 'required', message: 'Title is required.' }],
    slider_image_url: [{ type: 'required', message: 'Banner image is required.' }],
    button_link: [{ type: 'url', optional: true, message: 'Enter a valid URL (http or https).' }],
  } satisfies AdminFieldRules,
} as const
