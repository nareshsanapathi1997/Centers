-- Student Portal schema

CREATE TABLE IF NOT EXISTS students (
  id SERIAL PRIMARY KEY,
  center_id INTEGER NOT NULL REFERENCES centers(id) ON DELETE CASCADE,
  regno VARCHAR(50),
  full_name VARCHAR(255) NOT NULL,
  email VARCHAR(255),
  mobile VARCHAR(50) NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  father_name VARCHAR(255),
  address TEXT,
  state VARCHAR(100),
  city VARCHAR(100),
  pincode VARCHAR(20),
  date_of_birth DATE,
  is_active BOOLEAN DEFAULT true,
  email_verified BOOLEAN DEFAULT false,
  last_login_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(center_id, mobile),
  UNIQUE(center_id, email)
);

CREATE INDEX IF NOT EXISTS idx_students_center ON students(center_id);
CREATE INDEX IF NOT EXISTS idx_students_mobile ON students(mobile);
CREATE INDEX IF NOT EXISTS idx_students_email ON students(email);
CREATE INDEX IF NOT EXISTS idx_students_regno ON students(regno);

-- Link fee payments to portal accounts
ALTER TABLE student_fee_payments ADD COLUMN IF NOT EXISTS student_id INTEGER REFERENCES students(id) ON DELETE SET NULL;
CREATE INDEX IF NOT EXISTS idx_student_fee_payments_student ON student_fee_payments(student_id);
