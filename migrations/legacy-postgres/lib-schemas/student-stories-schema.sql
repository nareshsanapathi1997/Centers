-- Student Stories Table
CREATE TABLE IF NOT EXISTS student_stories (
    id SERIAL PRIMARY KEY,
    center_id INTEGER REFERENCES centers(id) ON DELETE CASCADE,
    student_name VARCHAR(255) NOT NULL,
    student_image_url TEXT,
    course_name VARCHAR(255),
    batch_year VARCHAR(50),
    achievement_title VARCHAR(255),
    story_content TEXT NOT NULL,
    testimonial_quote TEXT,
    video_url TEXT, -- Optional video testimonial
    display_order INTEGER DEFAULT 0,
    is_featured BOOLEAN DEFAULT false,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS idx_student_stories_center_id ON student_stories(center_id);
CREATE INDEX IF NOT EXISTS idx_student_stories_is_active ON student_stories(is_active);
CREATE INDEX IF NOT EXISTS idx_student_stories_display_order ON student_stories(display_order);
