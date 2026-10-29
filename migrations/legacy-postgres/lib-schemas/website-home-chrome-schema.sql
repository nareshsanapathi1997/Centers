-- Website home chrome: separate header-top menu, main nav, footer links

CREATE TABLE IF NOT EXISTS website_header_menu_items (
    id SERIAL PRIMARY KEY,
    menu_key VARCHAR(100) NOT NULL,
    parent_id INTEGER REFERENCES website_header_menu_items(id) ON DELETE CASCADE,
    title VARCHAR(255) NOT NULL,
    icon_class VARCHAR(100),
    link_url VARCHAR(500),
    target_section VARCHAR(100),
    display_order INTEGER DEFAULT 0,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS website_main_nav_items (
    id SERIAL PRIMARY KEY,
    label VARCHAR(255) NOT NULL,
    href VARCHAR(500) NOT NULL,
    display_order INTEGER DEFAULT 0,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS website_footer_menu_items (
    id SERIAL PRIMARY KEY,
    menu_group VARCHAR(100) NOT NULL DEFAULT 'quick_links_1',
    group_title VARCHAR(255),
    title VARCHAR(255) NOT NULL,
    icon_class VARCHAR(100),
    link_url VARCHAR(500),
    target_section VARCHAR(100),
    display_order INTEGER DEFAULT 0,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_website_header_menu_parent ON website_header_menu_items(parent_id, display_order);
CREATE INDEX IF NOT EXISTS idx_website_main_nav_order ON website_main_nav_items(display_order);
CREATE INDEX IF NOT EXISTS idx_website_footer_menu_group ON website_footer_menu_items(menu_group, display_order);
