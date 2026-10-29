-- Performance indexes for common center-manager query patterns.
-- Safe to run multiple times (IF NOT EXISTS).

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
