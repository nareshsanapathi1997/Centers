-- SEO Settings Table for Centers
CREATE TABLE IF NOT EXISTS center_seo_settings (
    id SERIAL PRIMARY KEY,
    center_id INTEGER REFERENCES centers(id) ON DELETE CASCADE,
    
    -- Basic Meta Tags
    meta_title VARCHAR(255),
    meta_description TEXT,
    meta_keywords TEXT,
    meta_author VARCHAR(255),
    meta_robots VARCHAR(100) DEFAULT 'index, follow',
    canonical_url TEXT,
    
    -- Open Graph Tags
    og_title VARCHAR(255),
    og_description TEXT,
    og_image TEXT,
    og_type VARCHAR(50) DEFAULT 'website',
    og_url TEXT,
    og_site_name VARCHAR(255),
    og_locale VARCHAR(10) DEFAULT 'en_US',
    
    -- Twitter Card Tags
    twitter_card VARCHAR(20) DEFAULT 'summary_large_image',
    twitter_site VARCHAR(100),
    twitter_creator VARCHAR(100),
    twitter_title VARCHAR(255),
    twitter_description TEXT,
    twitter_image TEXT,
    
    -- Schema.org Structured Data (JSON)
    schema_markup JSONB,
    
    -- Additional SEO Tags
    meta_viewport VARCHAR(100) DEFAULT 'width=device-width, initial-scale=1',
    meta_theme_color VARCHAR(7),
    meta_apple_mobile_web_app_capable VARCHAR(10) DEFAULT 'yes',
    meta_apple_mobile_web_app_status_bar_style VARCHAR(20) DEFAULT 'default',
    meta_apple_mobile_web_app_title VARCHAR(255),
    
    -- Analytics & Verification
    google_analytics_id VARCHAR(50),
    google_search_console_verification TEXT,
    bing_verification TEXT,
    facebook_pixel_id VARCHAR(50),
    
    -- Sitemap & Robots
    sitemap_enabled BOOLEAN DEFAULT true,
    robots_txt_content TEXT,
    
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    UNIQUE(center_id)
);

-- Index for faster lookups
CREATE INDEX IF NOT EXISTS idx_center_seo_center_id ON center_seo_settings(center_id);
