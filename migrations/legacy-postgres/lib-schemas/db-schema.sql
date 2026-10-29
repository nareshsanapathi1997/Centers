-- Database Schema for Center Manager System

-- Centers Table
CREATE TABLE IF NOT EXISTS centers (
    id SERIAL PRIMARY KEY,
    slug VARCHAR(255) UNIQUE NOT NULL,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    phone VARCHAR(50)[],
    email VARCHAR(255),
    address TEXT,
    google_rating DECIMAL(3,1),
    google_rating_url TEXT,
    map_embed_url TEXT,
    center_image_url TEXT,
    logo_url TEXT,
    logo_dark_url TEXT,
    favicon_url TEXT,
    social_facebook TEXT,
    social_twitter TEXT,
    social_instagram TEXT,
    social_linkedin TEXT,
    social_whatsapp TEXT,
    social_telegram TEXT,
    working_hours TEXT,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Nearby Centers Table (for managing which centers are shown in "Our Centers" section)
CREATE TABLE IF NOT EXISTS nearby_centers (
    id SERIAL PRIMARY KEY,
    center_id INTEGER REFERENCES centers(id) ON DELETE CASCADE,
    nearby_center_id INTEGER REFERENCES centers(id) ON DELETE CASCADE,
    display_order INTEGER DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(center_id, nearby_center_id),
    CHECK (center_id != nearby_center_id)
);

-- Super Admins Table
CREATE TABLE IF NOT EXISTS super_admins (
    id SERIAL PRIMARY KEY,
    username VARCHAR(255) UNIQUE NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    full_name VARCHAR(255),
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Center Admins Table
CREATE TABLE IF NOT EXISTS center_admins (
    id SERIAL PRIMARY KEY,
    center_id INTEGER REFERENCES centers(id) ON DELETE CASCADE,
    username VARCHAR(255) UNIQUE NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    full_name VARCHAR(255),
    is_active BOOLEAN DEFAULT true,
    -- Owners bypass RBAC. Every other admin is denied until a role is assigned.
    is_owner BOOLEAN NOT NULL DEFAULT false,
    must_change_password BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Section Configuration Table (for enabling/disabling sections)
CREATE TABLE IF NOT EXISTS section_configs (
    id SERIAL PRIMARY KEY,
    center_id INTEGER REFERENCES centers(id) ON DELETE CASCADE,
    section_key VARCHAR(100) NOT NULL, -- hero, news, courses, results, testimonials, leadership, gallery, blog, etc.
    is_enabled BOOLEAN DEFAULT true,
    display_order INTEGER DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(center_id, section_key)
);

-- Hero Slider Table
CREATE TABLE IF NOT EXISTS hero_slides (
    id SERIAL PRIMARY KEY,
    center_id INTEGER REFERENCES centers(id) ON DELETE CASCADE,
    title VARCHAR(255) NOT NULL,
    subtitle VARCHAR(255),
    description TEXT,
    button_text VARCHAR(100),
    button_link VARCHAR(255),
    video_link VARCHAR(255),
    background_image_url TEXT,
    slider_image_url TEXT, -- Main slider image displayed in the content area
    show_content BOOLEAN DEFAULT false, -- Whether to show title/description/buttons
    display_order INTEGER DEFAULT 0,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- News & Notifications Table
CREATE TABLE IF NOT EXISTS news_items (
    id SERIAL PRIMARY KEY,
    center_id INTEGER REFERENCES centers(id) ON DELETE CASCADE,
    title VARCHAR(255) NOT NULL,
    content TEXT,
    link_url VARCHAR(255),
    is_new BOOLEAN DEFAULT false,
    is_notification BOOLEAN DEFAULT false, -- true for notifications, false for news
    display_order INTEGER DEFAULT 0,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Important Alerts Table
CREATE TABLE IF NOT EXISTS alerts (
    id SERIAL PRIMARY KEY,
    center_id INTEGER REFERENCES centers(id) ON DELETE CASCADE,
    title VARCHAR(255) NOT NULL,
    message TEXT NOT NULL,
    alert_type VARCHAR(50) DEFAULT 'info', -- info, warning, success, danger
    is_active BOOLEAN DEFAULT true,
    display_order INTEGER DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Courses Table
CREATE TABLE IF NOT EXISTS courses (
    id SERIAL PRIMARY KEY,
    center_id INTEGER REFERENCES centers(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    category VARCHAR(100), -- college_level, school_level
    icon_class VARCHAR(100) DEFAULT 'ri-book-open-line', -- Remix icon class
    display_order INTEGER DEFAULT 0,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Results/Images Table
CREATE TABLE IF NOT EXISTS result_images (
    id SERIAL PRIMARY KEY,
    center_id INTEGER REFERENCES centers(id) ON DELETE CASCADE,
    title VARCHAR(255) NOT NULL,
    image_url TEXT NOT NULL,
    display_order INTEGER DEFAULT 0,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Video Testimonials Table
CREATE TABLE IF NOT EXISTS video_testimonials (
    id SERIAL PRIMARY KEY,
    center_id INTEGER REFERENCES centers(id) ON DELETE CASCADE,
    title VARCHAR(255) NOT NULL,
    video_url TEXT NOT NULL, -- YouTube embed URL
    display_order INTEGER DEFAULT 0,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Text Testimonials Table
CREATE TABLE IF NOT EXISTS text_testimonials (
    id SERIAL PRIMARY KEY,
    center_id INTEGER REFERENCES centers(id) ON DELETE CASCADE,
    quote TEXT NOT NULL,
    author_name VARCHAR(255) NOT NULL,
    author_role VARCHAR(255),
    display_order INTEGER DEFAULT 0,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Center Manager/Leadership Table (multiple directors per center)
CREATE TABLE IF NOT EXISTS leadership (
    id SERIAL PRIMARY KEY,
    center_id INTEGER REFERENCES centers(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    role VARCHAR(255) NOT NULL,
    image_url TEXT,
    message_title VARCHAR(255),
    message_content TEXT,
    bio TEXT,
    display_order INTEGER DEFAULT 0,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Senior Faculty Table
CREATE TABLE IF NOT EXISTS senior_faculty (
    id SERIAL PRIMARY KEY,
    center_id INTEGER REFERENCES centers(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    role VARCHAR(255) NOT NULL,
    description TEXT,
    image_url TEXT,
    display_order INTEGER DEFAULT 0,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- FAQs Table
CREATE TABLE IF NOT EXISTS faqs (
    id SERIAL PRIMARY KEY,
    center_id INTEGER REFERENCES centers(id) ON DELETE CASCADE,
    question TEXT NOT NULL,
    answer TEXT NOT NULL,
    display_order INTEGER DEFAULT 0,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- About Section Table (Get To Know Us)
CREATE TABLE IF NOT EXISTS about_sections (
    id SERIAL PRIMARY KEY,
    center_id INTEGER REFERENCES centers(id) ON DELETE CASCADE,
    title VARCHAR(255) DEFAULT 'Get To Know Us',
    heading VARCHAR(500),
    description TEXT,
    subtext VARCHAR(500),
    feature_list TEXT[], -- Array of feature items
    image_url TEXT,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(center_id)
);

-- Gallery Images Table
CREATE TABLE IF NOT EXISTS gallery_images (
    id SERIAL PRIMARY KEY,
    center_id INTEGER REFERENCES centers(id) ON DELETE CASCADE,
    title VARCHAR(255) NOT NULL,
    image_url TEXT NOT NULL,
    gallery_type VARCHAR(50) DEFAULT 'general', -- general, photos, videos
    display_order INTEGER DEFAULT 0,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Blog Posts Table
CREATE TABLE IF NOT EXISTS blog_posts (
    id SERIAL PRIMARY KEY,
    center_id INTEGER REFERENCES centers(id) ON DELETE CASCADE,
    title VARCHAR(255) NOT NULL,
    slug VARCHAR(255) NOT NULL,
    excerpt TEXT,
    content TEXT,
    featured_image_url TEXT,
    author_name VARCHAR(255),
    published_date DATE,
    is_published BOOLEAN DEFAULT false,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(center_id, slug)
);

-- Custom Sections Table (for custom section builder)
CREATE TABLE IF NOT EXISTS custom_sections (
    id SERIAL PRIMARY KEY,
    center_id INTEGER REFERENCES centers(id) ON DELETE CASCADE,
    section_type VARCHAR(50) NOT NULL, -- image_slider, content_block, cta_banner, etc.
    title VARCHAR(255),
    content TEXT,
    config JSONB, -- Flexible JSON for section-specific configuration
    display_order INTEGER DEFAULT 0,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Moving Heading/CTA Slider Table
CREATE TABLE IF NOT EXISTS cta_sliders (
    id SERIAL PRIMARY KEY,
    center_id INTEGER REFERENCES centers(id) ON DELETE CASCADE,
    text VARCHAR(255) NOT NULL,
    link_url VARCHAR(255),
    display_order INTEGER DEFAULT 0,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Contact Form Submissions Table
CREATE TABLE IF NOT EXISTS contact_submissions (
    id SERIAL PRIMARY KEY,
    center_id INTEGER REFERENCES centers(id) ON DELETE CASCADE,
    full_name VARCHAR(255) NOT NULL,
    email VARCHAR(255) NOT NULL,
    phone VARCHAR(50),
    course_name VARCHAR(255),
    message TEXT,
    is_read BOOLEAN DEFAULT false,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Global Settings Table (Super Admin controlled settings)
CREATE TABLE IF NOT EXISTS global_settings (
    id SERIAL PRIMARY KEY,
    setting_key VARCHAR(100) UNIQUE NOT NULL,
    setting_value TEXT,
    setting_type VARCHAR(50) DEFAULT 'string', -- string, boolean, json, number
    description TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Insert default global settings
INSERT INTO global_settings (setting_key, setting_value, setting_type, description) VALUES
    ('header_dropdown_enabled', 'false', 'boolean', 'Show About Us / Our Results quick links in the top bar'),
    ('header_top_nav_enabled', 'false', 'boolean', 'Show the thin top bar above the logo'),
    ('hero_common_background_image', '/assets/img/hero/hero-slider-1.jpg', 'string', 'Common background image URL for all hero slides'),
    ('mobile_app_store_url', 'https://apps.apple.com/in/app/time4education/id6756058344', 'string', 'App Store download URL for iOS devices'),
    ('mobile_play_store_url', 'https://play.google.com/store/apps/details?id=com.time4education.timeforeducation', 'string', 'Google Play Store download URL for Android devices'),
    ('mobile_app_title', 'Download Our Mobile App', 'string', 'Title text for mobile app download section'),
    ('mobile_app_description', 'Get access to study materials, practice tests, and expert guidance on the go. Download our app for iOS and Android devices.', 'string', 'Description text for mobile app download section'),
    ('footer_copyright_text', 'Advanced Educational Activities Pvt. Ltd', 'string', 'Copyright text displayed in footer')
ON CONFLICT (setting_key) DO NOTHING;

-- Header Menu Items Table (Super Admin controlled menu items for dropdown)
CREATE TABLE IF NOT EXISTS header_menu_items (
    id SERIAL PRIMARY KEY,
    menu_key VARCHAR(100) NOT NULL, -- about_us, results, quick_links
    parent_id INTEGER REFERENCES header_menu_items(id) ON DELETE CASCADE,
    title VARCHAR(255) NOT NULL,
    icon_class VARCHAR(100),
    link_url VARCHAR(255),
    target_section VARCHAR(100), -- #about, #results, #centers, etc.
    display_order INTEGER DEFAULT 0,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Insert default header menu items
INSERT INTO header_menu_items (menu_key, parent_id, title, icon_class, link_url, target_section, display_order, is_active) VALUES
    -- About Us dropdown
    ('about_us', NULL, 'About Us', 'ri-information-line', NULL, NULL, 1, true),
    ('about_us_overview', 1, 'Overview', 'ri-file-list-line', NULL, '#about', 1, true),
    ('about_us_philosophy', 1, 'Our Philosophy', 'ri-lightbulb-line', NULL, '#about', 2, true),
    ('about_us_promoters', 1, 'Meet the Promoters', 'ri-team-line', NULL, '#leadership', 3, true),
    -- Results dropdown
    ('results', NULL, 'Our Results', 'ri-trophy-line', NULL, NULL, 2, true),
    ('results_cat', 5, 'CAT/MBA', 'ri-graduation-cap-line', NULL, '#results', 1, true),
    ('results_bank', 5, 'Bank Exams', 'ri-bank-line', NULL, '#results', 2, true),
    ('results_gate', 5, 'GATE', 'ri-book-open-line', NULL, '#results', 3, true),
    ('results_gmat', 5, 'GMAT', 'ri-file-paper-line', NULL, '#results', 4, true),
    ('results_jee', 5, 'JEE/Engg', 'ri-calculator-line', NULL, '#results', 5, true),
    ('results_neet', 5, 'NEET', 'ri-heart-pulse-line', NULL, '#results', 6, true),
    ('results_clat', 5, 'CLAT', 'ri-scales-line', NULL, '#results', 7, true),
    ('results_ipm', 5, 'IPM/BBA', 'ri-building-line', NULL, '#results', 8, true),
    ('results_icet', 5, 'ICET', 'ri-file-list-3-line', NULL, '#results', 9, true),
    -- Quick Links (top level items)
    ('centers', NULL, 'Our Centres', 'ri-map-pin-line', NULL, '#centers', 3, true),
    ('courses', NULL, 'Courses', 'ri-book-open-line', NULL, NULL, 4, true),
    ('jobs', NULL, 'Jobs@T.I.M.E.', 'ri-briefcase-line', NULL, '#contact', 5, true)
ON CONFLICT DO NOTHING;

-- Courses dropdown: School Level + College Level sections (parent id resolved by menu_key)
INSERT INTO header_menu_items (menu_key, parent_id, title, icon_class, link_url, target_section, display_order, is_active)
SELECT 'courses_school_level', p.id, 'School Level Courses', NULL, NULL, NULL, 1, true
FROM header_menu_items p
WHERE p.menu_key = 'courses' AND p.parent_id IS NULL
  AND NOT EXISTS (SELECT 1 FROM header_menu_items WHERE menu_key = 'courses_school_level');

INSERT INTO header_menu_items (menu_key, parent_id, title, icon_class, link_url, target_section, display_order, is_active)
SELECT 'courses_college_level', p.id, 'College Level Courses', NULL, NULL, NULL, 2, true
FROM header_menu_items p
WHERE p.menu_key = 'courses' AND p.parent_id IS NULL
  AND NOT EXISTS (SELECT 1 FROM header_menu_items WHERE menu_key = 'courses_college_level');

INSERT INTO header_menu_items (menu_key, parent_id, title, icon_class, link_url, target_section, display_order, is_active)
SELECT v.menu_key, g.id, v.title, v.icon_class, NULL, v.target_section, v.display_order, true
FROM header_menu_items g
CROSS JOIN (VALUES
    ('courses_jee', 'JEE/Engg', 'ri-calculator-line', '#department', 1),
    ('courses_neet', 'NEET', 'ri-heart-pulse-line', '#department', 2),
    ('courses_clat', 'CLAT', 'ri-scales-line', '#department', 3),
    ('courses_ipm', 'IPM/BBA', 'ri-building-line', '#department', 4)
) AS v(menu_key, title, icon_class, target_section, display_order)
WHERE g.menu_key = 'courses_school_level'
  AND NOT EXISTS (SELECT 1 FROM header_menu_items existing WHERE existing.menu_key = v.menu_key);

INSERT INTO header_menu_items (menu_key, parent_id, title, icon_class, link_url, target_section, display_order, is_active)
SELECT v.menu_key, g.id, v.title, v.icon_class, NULL, v.target_section, v.display_order, true
FROM header_menu_items g
CROSS JOIN (VALUES
    ('courses_cat', 'CAT/MBA', 'ri-graduation-cap-line', '#department', 1),
    ('courses_bank', 'Bank Exams', 'ri-bank-line', '#department', 2),
    ('courses_gate', 'GATE', 'ri-book-open-line', '#department', 3),
    ('courses_gmat', 'GMAT', 'ri-file-paper-line', '#department', 4),
    ('courses_icet', 'ICET', 'ri-file-list-3-line', '#department', 5)
) AS v(menu_key, title, icon_class, target_section, display_order)
WHERE g.menu_key = 'courses_college_level'
  AND NOT EXISTS (SELECT 1 FROM header_menu_items existing WHERE existing.menu_key = v.menu_key);

-- Footer Menu Items Table (Super Admin controlled footer links)
CREATE TABLE IF NOT EXISTS footer_menu_items (
    id SERIAL PRIMARY KEY,
    menu_group VARCHAR(100) NOT NULL, -- quick_links_1, quick_links_2, etc.
    title VARCHAR(255) NOT NULL,
    icon_class VARCHAR(100),
    link_url VARCHAR(255),
    target_section VARCHAR(100), -- #about, #results, #centers, etc.
    display_order INTEGER DEFAULT 0,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Insert default footer menu items
INSERT INTO footer_menu_items (menu_group, title, icon_class, link_url, target_section, display_order, is_active) VALUES
    -- Quick Links Group 1
    ('quick_links_1', 'Home', 'ri-arrow-right-s-line', NULL, '#hero', 1, true),
    ('quick_links_1', 'About', 'ri-arrow-right-s-line', NULL, '#about', 2, true),
    ('quick_links_1', 'Centers', 'ri-arrow-right-s-line', NULL, '#centers', 3, true),
    ('quick_links_1', 'Courses', 'ri-arrow-right-s-line', NULL, '#department', 4, true),
    -- Quick Links Group 2
    ('quick_links_2', 'Leadership', 'ri-arrow-right-s-line', NULL, '#leadership', 1, true),
    ('quick_links_2', 'Results', 'ri-arrow-right-s-line', NULL, '#results', 2, true),
    ('quick_links_2', 'Gallery', 'ri-arrow-right-s-line', NULL, '#gallery', 3, true),
    ('quick_links_2', 'Contact', 'ri-arrow-right-s-line', NULL, '#centers', 4, true)
ON CONFLICT DO NOTHING;

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_centers_slug ON centers(slug);
CREATE INDEX IF NOT EXISTS idx_centers_active ON centers(is_active);
CREATE INDEX IF NOT EXISTS idx_super_admins_username ON super_admins(username);
CREATE INDEX IF NOT EXISTS idx_super_admins_email ON super_admins(email);
CREATE INDEX IF NOT EXISTS idx_center_admins_center_id ON center_admins(center_id);
CREATE INDEX IF NOT EXISTS idx_section_configs_center_id ON section_configs(center_id);
CREATE INDEX IF NOT EXISTS idx_hero_slides_center_id ON hero_slides(center_id);
CREATE INDEX IF NOT EXISTS idx_news_items_center_id ON news_items(center_id);
CREATE INDEX IF NOT EXISTS idx_blog_posts_center_id ON blog_posts(center_id);
CREATE INDEX IF NOT EXISTS idx_blog_posts_slug ON blog_posts(slug);

-- Composite indexes for hot list queries
CREATE INDEX IF NOT EXISTS idx_centers_slug_active ON centers(slug, is_active);
CREATE UNIQUE INDEX IF NOT EXISTS idx_section_configs_center_key ON section_configs(center_id, section_key);
CREATE INDEX IF NOT EXISTS idx_courses_center_active ON courses(center_id, is_active, display_order);
CREATE INDEX IF NOT EXISTS idx_gallery_center_active ON gallery_images(center_id, is_active, display_order);
CREATE INDEX IF NOT EXISTS idx_results_center_active ON result_images(center_id, is_active, display_order);
CREATE INDEX IF NOT EXISTS idx_leadership_center_active ON leadership(center_id, is_active, display_order);
CREATE INDEX IF NOT EXISTS idx_senior_faculty_center_active ON senior_faculty(center_id, is_active, display_order);
CREATE INDEX IF NOT EXISTS idx_faqs_center_active ON faqs(center_id, is_active, display_order);
CREATE INDEX IF NOT EXISTS idx_testimonials_video_center ON video_testimonials(center_id, is_active, display_order);
CREATE INDEX IF NOT EXISTS idx_testimonials_text_center ON text_testimonials(center_id, is_active, display_order);
CREATE INDEX IF NOT EXISTS idx_news_center_active_notif ON news_items(center_id, is_active, is_notification, display_order);
CREATE INDEX IF NOT EXISTS idx_blog_center_published ON blog_posts(center_id, is_published, published_date DESC);
CREATE UNIQUE INDEX IF NOT EXISTS idx_global_settings_key ON global_settings(setting_key);
CREATE INDEX IF NOT EXISTS idx_center_seo_center_id ON center_seo_settings(center_id);
CREATE INDEX IF NOT EXISTS idx_nearby_centers_center ON nearby_centers(center_id, display_order);

-- Course master catalog (hierarchical: main_course → sub_variant → course → sub_sub_variant → leaf_course)
CREATE TABLE IF NOT EXISTS course_masters (
  id SERIAL PRIMARY KEY,
  parent_id INTEGER REFERENCES course_masters(id) ON DELETE CASCADE,
  level_type VARCHAR(30) NOT NULL CHECK (
    level_type IN ('main_course', 'sub_variant', 'course', 'sub_sub_variant', 'leaf_course')
  ),
  title VARCHAR(500) NOT NULL,
  slug VARCHAR(255) NOT NULL UNIQUE,
  short_description TEXT,
  detailed_description TEXT,
  image_url TEXT,
  brochure_url TEXT,
  syllabus_html TEXT,
  syllabus_pdf_url TEXT,
  demo_class_link TEXT,
  highlights JSONB DEFAULT '[]'::jsonb,
  features JSONB DEFAULT '[]'::jsonb,
  learning_outcomes JSONB DEFAULT '[]'::jsonb,
  eligibility_criteria JSONB DEFAULT '[]'::jsonb,
  duration VARCHAR(100),
  mode VARCHAR(20) CHECK (mode IS NULL OR mode IN ('online', 'offline', 'hybrid')),
  price DECIMAL(12, 2),
  discount_percent DECIMAL(5, 2),
  discount_amount DECIMAL(12, 2),
  coupon_code VARCHAR(100),
  coupon_enabled BOOLEAN DEFAULT false,
  installment_config JSONB DEFAULT '[]'::jsonb,
  enrollment_validity_days INTEGER,
  meta_title VARCHAR(255),
  meta_description TEXT,
  display_order INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS course_master_batches (
  id SERIAL PRIMARY KEY,
  course_master_id INTEGER NOT NULL REFERENCES course_masters(id) ON DELETE CASCADE,
  batch_name VARCHAR(255),
  batch_timing VARCHAR(255),
  schedule_days VARCHAR(255),
  start_date DATE NOT NULL,
  end_date DATE,
  enrollment_deadline DATE,
  capacity INTEGER,
  price DECIMAL(12, 2),
  discount_percent DECIMAL(5, 2),
  discount_amount DECIMAL(12, 2),
  coupon_code VARCHAR(100),
  coupon_enabled BOOLEAN DEFAULT false,
  installment_config JSONB DEFAULT '[]'::jsonb,
  notes TEXT,
  is_active BOOLEAN DEFAULT true,
  display_order INTEGER DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS course_master_faqs (
  id SERIAL PRIMARY KEY,
  course_master_id INTEGER NOT NULL REFERENCES course_masters(id) ON DELETE CASCADE,
  question TEXT NOT NULL,
  answer TEXT NOT NULL,
  display_order INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS course_master_faculty (
  id SERIAL PRIMARY KEY,
  course_master_id INTEGER NOT NULL REFERENCES course_masters(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  role VARCHAR(255),
  bio TEXT,
  image_url TEXT,
  display_order INTEGER DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_course_masters_parent ON course_masters(parent_id);
CREATE INDEX IF NOT EXISTS idx_course_masters_level ON course_masters(level_type);
CREATE INDEX IF NOT EXISTS idx_course_masters_active ON course_masters(is_active);
CREATE INDEX IF NOT EXISTS idx_course_master_batches_course ON course_master_batches(course_master_id);
CREATE INDEX IF NOT EXISTS idx_course_master_faqs_course ON course_master_faqs(course_master_id);
CREATE INDEX IF NOT EXISTS idx_course_master_faculty_course ON course_master_faculty(course_master_id);

-- Student Enrollments (legacy — removed; see course-fees-schema.sql)

-- Course Fee Management: see lib/course-fees-schema.sql for table definitions.



-- Blog comments: public submission shown immediately; admin can hide individual comments
CREATE TABLE IF NOT EXISTS blog_comments (
    id SERIAL PRIMARY KEY,
    center_id INTEGER NOT NULL REFERENCES centers(id) ON DELETE CASCADE,
    blog_post_id INTEGER NOT NULL REFERENCES blog_posts(id) ON DELETE CASCADE,
    author_name VARCHAR(120) NOT NULL,
    author_email VARCHAR(255) NOT NULL,
    body TEXT NOT NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'visible' CHECK (status IN ('visible', 'hidden')),
    is_read BOOLEAN NOT NULL DEFAULT false,
    reviewed_at TIMESTAMP,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_blog_comments_post_status ON blog_comments(blog_post_id, status, created_at);
CREATE INDEX IF NOT EXISTS idx_blog_comments_center_status ON blog_comments(center_id, status, created_at DESC);
