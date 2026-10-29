-- Student Portal extensions: OTP, course materials

CREATE TABLE IF NOT EXISTS student_otp_codes (
  id SERIAL PRIMARY KEY,
  center_id INTEGER NOT NULL REFERENCES centers(id) ON DELETE CASCADE,
  mobile VARCHAR(50) NOT NULL,
  otp_hash VARCHAR(255) NOT NULL,
  purpose VARCHAR(30) DEFAULT 'login' CHECK (purpose IN ('login', 'register')),
  expires_at TIMESTAMP NOT NULL,
  used BOOLEAN DEFAULT false,
  attempts INTEGER DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_student_otp_center_mobile ON student_otp_codes(center_id, mobile);
CREATE INDEX IF NOT EXISTS idx_student_otp_expires ON student_otp_codes(expires_at);

CREATE TABLE IF NOT EXISTS student_course_materials (
  id SERIAL PRIMARY KEY,
  center_id INTEGER NOT NULL REFERENCES centers(id) ON DELETE CASCADE,
  course_master_id INTEGER NOT NULL REFERENCES course_masters(id) ON DELETE CASCADE,
  title VARCHAR(255) NOT NULL,
  description TEXT,
  file_url VARCHAR(1000) NOT NULL,
  file_type VARCHAR(50) DEFAULT 'pdf',
  file_size_bytes BIGINT,
  sort_order INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  created_by INTEGER,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_student_materials_center ON student_course_materials(center_id);
CREATE INDEX IF NOT EXISTS idx_student_materials_course ON student_course_materials(course_master_id);
CREATE INDEX IF NOT EXISTS idx_student_materials_active ON student_course_materials(center_id, is_active);
