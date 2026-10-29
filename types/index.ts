export interface Center {
  id: number;
  slug: string;
  name: string;
  description?: string;
  phone?: string[];
  email?: string;
  address?: string;
  google_rating?: number;
  google_rating_url?: string;
  map_embed_url?: string;
  center_image_url?: string;
  logo_url?: string;
  logo_dark_url?: string;
  favicon_url?: string;
  social_facebook?: string;
  social_twitter?: string;
  social_instagram?: string;
  social_linkedin?: string;
  social_whatsapp?: string;
  social_telegram?: string;
  working_hours?: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface HeroSlide {
  id: number;
  center_id: number;
  title: string;
  subtitle?: string;
  description?: string;
  button_text?: string;
  button_link?: string;
  video_link?: string;
  background_image_url?: string;
  slider_image_url?: string;
  show_content?: boolean;
  display_order: number;
  is_active: boolean;
}

export interface NewsItem {
  id: number;
  center_id: number;
  title: string;
  content?: string;
  link_url?: string;
  is_new: boolean;
  is_notification: boolean;
  display_order: number;
  is_active: boolean;
  created_at?: string;
}

export interface Course {
  id: number;
  center_id: number;
  name: string;
  description?: string;
  category?: string;
  icon_class?: string;
  display_order: number;
  is_active: boolean;
}

export interface ResultImage {
  id: number;
  center_id: number;
  title: string;
  image_url: string;
  display_order: number;
  is_active: boolean;
  content_html?: string | null;
  entry_type?: 'image' | 'text' | 'image_text' | string | null;
  exam_category?: string | null;
  result_year?: number | null;
}

export interface VideoTestimonial {
  id: number;
  center_id: number;
  title: string;
  video_url: string;
  display_order: number;
  is_active: boolean;
}

export interface TextTestimonial {
  id: number;
  center_id: number;
  quote: string;
  author_name: string;
  author_role?: string;
  display_order: number;
  is_active: boolean;
}

export interface Leadership {
  id: number;
  center_id: number;
  name: string;
  role: string;
  image_url?: string;
  message_title?: string;
  message_content?: string;
  bio?: string;
  display_order: number;
  is_active: boolean;
  created_at?: string;
  updated_at?: string;
}

export interface SeniorFaculty {
  id: number;
  center_id: number;
  name: string;
  role: string;
  description?: string;
  image_url?: string;
  display_order: number;
  is_active: boolean;
  created_at?: string;
  updated_at?: string;
}

export interface GalleryImage {
  id: number;
  center_id: number;
  title: string;
  image_url: string;
  gallery_type: 'general' | 'photos' | 'videos';
  display_order: number;
  is_active: boolean;
}

export interface BlogPost {
  id: number;
  center_id: number;
  title: string;
  slug: string;
  excerpt?: string;
  content?: string;
  featured_image_url?: string;
  author_name?: string;
  published_date?: string;
  is_published: boolean;
  created_at: string;
  updated_at: string;
}

export type BlogCommentStatus = 'visible' | 'hidden';

export interface BlogComment {
  id: number;
  center_id: number;
  blog_post_id: number;
  author_name: string;
  author_email: string;
  body: string;
  status: BlogCommentStatus;
  is_read: boolean;
  reviewed_at?: string | null;
  created_at: string;
  updated_at: string;
  blog_post_title?: string;
  blog_post_slug?: string;
  center_slug?: string;
}

export interface PublicBlogComment {
  id: number;
  author_name: string;
  body: string;
  created_at: string;
}

export interface SectionConfig {
  id: number;
  center_id: number;
  section_key: string;
  is_enabled: boolean;
  display_order: number;
}

export interface CustomSection {
  id: number;
  center_id: number;
  section_type: string;
  title?: string;
  content?: string;
  config?: Record<string, any>;
  display_order: number;
  is_active: boolean;
}

export interface CTASlider {
  id: number;
  center_id: number;
  text: string;
  link_url?: string;
  display_order: number;
  is_active: boolean;
}

export interface Vacancy {
  id: number;
  center_id: number;
  title: string;
  description?: string;
  experience?: string;
  ctc?: string;
  nature?: string;
  contact_phone?: string;
  display_order: number;
  is_active: boolean;
  created_at?: string;
  updated_at?: string;
}

export interface FAQ {
  id: number;
  center_id: number;
  question: string;
  answer: string;
  display_order: number;
  is_active: boolean;
  created_at?: string;
  updated_at?: string;
}

export interface AboutSection {
  id: number;
  center_id: number;
  title: string;
  heading: string;
  description: string;
  subtext: string;
  feature_list: string[];
  image_url?: string;
  is_active: boolean;
  created_at?: string;
  updated_at?: string;
}

export interface GlobalSetting {
  id: number;
  setting_key: string;
  setting_value: string;
  setting_type: 'string' | 'boolean' | 'json' | 'number';
  description?: string;
  created_at?: string;
  updated_at?: string;
}

export interface HeaderMenuItem {
  id: number;
  menu_key: string;
  parent_id?: number;
  title: string;
  icon_class?: string;
  link_url?: string;
  target_section?: string;
  display_order: number;
  is_active: boolean;
  children?: HeaderMenuItem[];
  created_at?: string;
  updated_at?: string;
}

export interface FooterMenuItem {
  id: number;
  menu_group: string;
  title: string;
  icon_class?: string;
  link_url?: string;
  target_section?: string;
  display_order: number;
  is_active: boolean;
  created_at?: string;
  updated_at?: string;
}

