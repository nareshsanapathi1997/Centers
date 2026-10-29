-- Course Fee Management schema (replaces legacy enrollment tables)

CREATE TABLE IF NOT EXISTS course_base_fees (
  id SERIAL PRIMARY KEY,
  course_master_id INTEGER NOT NULL UNIQUE REFERENCES course_masters(id) ON DELETE CASCADE,
  total_amount DECIMAL(12, 2) NOT NULL DEFAULT 0,
  offer_amount DECIMAL(12, 2),
  discount_amount DECIMAL(12, 2) DEFAULT 0,
  registration_fee DECIMAL(12, 2) DEFAULT 0,
  num_installments INTEGER DEFAULT 1 CHECK (num_installments >= 1 AND num_installments <= 12),
  installment_1_amount DECIMAL(12, 2),
  installment_2_amount DECIMAL(12, 2),
  installment_3_amount DECIMAL(12, 2),
  installment_due_rules JSONB DEFAULT '[]'::jsonb,
  offer_enabled BOOLEAN DEFAULT true,
  payment_rules JSONB DEFAULT '{}'::jsonb,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS course_fee_discounts (
  id SERIAL PRIMARY KEY,
  course_master_id INTEGER NOT NULL REFERENCES course_masters(id) ON DELETE CASCADE,
  center_id INTEGER REFERENCES centers(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  discount_type VARCHAR(20) NOT NULL CHECK (discount_type IN ('percent', 'fixed')),
  discount_value DECIMAL(12, 2) NOT NULL,
  coupon_code VARCHAR(100),
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS course_center_assignments (
  id SERIAL PRIMARY KEY,
  course_master_id INTEGER NOT NULL REFERENCES course_masters(id) ON DELETE CASCADE,
  center_id INTEGER NOT NULL REFERENCES centers(id) ON DELETE CASCADE,
  allow_center_override BOOLEAN DEFAULT true,
  admin_can_customize BOOLEAN DEFAULT true,
  status VARCHAR(30) DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'pending')),
  assigned_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(course_master_id, center_id)
);

CREATE TABLE IF NOT EXISTS course_center_fees (
  id SERIAL PRIMARY KEY,
  course_master_id INTEGER NOT NULL REFERENCES course_masters(id) ON DELETE CASCADE,
  center_id INTEGER NOT NULL REFERENCES centers(id) ON DELETE CASCADE,
  total_amount DECIMAL(12, 2) NOT NULL DEFAULT 0,
  offer_amount DECIMAL(12, 2),
  discount_amount DECIMAL(12, 2) DEFAULT 0,
  registration_fee DECIMAL(12, 2) DEFAULT 0,
  num_installments INTEGER DEFAULT 1,
  installment_1_amount DECIMAL(12, 2),
  installment_2_amount DECIMAL(12, 2),
  installment_3_amount DECIMAL(12, 2),
  installment_due_rules JSONB DEFAULT '[]'::jsonb,
  additional_discounts JSONB DEFAULT '[]'::jsonb,
  configured_by VARCHAR(20) DEFAULT 'center' CHECK (configured_by IN ('admin', 'center')),
  status VARCHAR(30) DEFAULT 'draft' CHECK (status IN ('draft', 'saved', 'approved', 'rejected')),
  saved_at TIMESTAMP,
  approved_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(course_master_id, center_id)
);

CREATE TABLE IF NOT EXISTS student_fee_payments (
  id SERIAL PRIMARY KEY,
  receipt_no VARCHAR(50) UNIQUE NOT NULL,
  center_id INTEGER NOT NULL REFERENCES centers(id) ON DELETE CASCADE,
  course_master_id INTEGER NOT NULL REFERENCES course_masters(id) ON DELETE CASCADE,
  student_name VARCHAR(255) NOT NULL,
  student_email VARCHAR(255),
  student_mobile VARCHAR(50) NOT NULL,
  payment_type VARCHAR(30) DEFAULT 'lumpsum' CHECK (payment_type IN ('lumpsum', 'installment')),
  installment_no INTEGER,
  fee_snapshot JSONB NOT NULL DEFAULT '{}'::jsonb,
  amount_due DECIMAL(12, 2) NOT NULL,
  amount_paid DECIMAL(12, 2) NOT NULL,
  discount_applied DECIMAL(12, 2) DEFAULT 0,
  payment_method VARCHAR(50),
  transaction_id VARCHAR(255),
  status VARCHAR(30) DEFAULT 'completed' CHECK (status IN ('pending', 'completed', 'failed', 'refunded')),
  notes TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS student_payment_installments (
  id SERIAL PRIMARY KEY,
  payment_id INTEGER REFERENCES student_fee_payments(id) ON DELETE CASCADE,
  center_id INTEGER NOT NULL REFERENCES centers(id) ON DELETE CASCADE,
  course_master_id INTEGER NOT NULL REFERENCES course_masters(id) ON DELETE CASCADE,
  student_mobile VARCHAR(50) NOT NULL,
  installment_no INTEGER NOT NULL,
  amount DECIMAL(12, 2) NOT NULL,
  due_date DATE,
  paid_amount DECIMAL(12, 2) DEFAULT 0,
  paid_date TIMESTAMP,
  status VARCHAR(30) DEFAULT 'unpaid',
  transaction_id VARCHAR(255),
  payment_method VARCHAR(50),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_course_base_fees_course ON course_base_fees(course_master_id);
CREATE INDEX IF NOT EXISTS idx_course_fee_discounts_course ON course_fee_discounts(course_master_id);
CREATE INDEX IF NOT EXISTS idx_course_fee_discounts_center ON course_fee_discounts(center_id);
CREATE INDEX IF NOT EXISTS idx_course_center_assignments_course ON course_center_assignments(course_master_id);
CREATE INDEX IF NOT EXISTS idx_course_center_assignments_center ON course_center_assignments(center_id);
CREATE INDEX IF NOT EXISTS idx_course_center_fees_course ON course_center_fees(course_master_id);
CREATE INDEX IF NOT EXISTS idx_course_center_fees_center ON course_center_fees(center_id);
CREATE INDEX IF NOT EXISTS idx_student_fee_payments_center ON student_fee_payments(center_id);
CREATE INDEX IF NOT EXISTS idx_student_fee_payments_course ON student_fee_payments(course_master_id);
CREATE INDEX IF NOT EXISTS idx_student_fee_payments_mobile ON student_fee_payments(student_mobile);
CREATE INDEX IF NOT EXISTS idx_student_payment_installments_payment ON student_payment_installments(payment_id);

-- Batch-wise fee pricing (when course has batches in Course Masters)
CREATE TABLE IF NOT EXISTS course_batch_base_fees (
  id SERIAL PRIMARY KEY,
  batch_id INTEGER NOT NULL UNIQUE REFERENCES course_master_batches(id) ON DELETE CASCADE,
  course_master_id INTEGER NOT NULL REFERENCES course_masters(id) ON DELETE CASCADE,
  total_amount DECIMAL(12, 2) NOT NULL DEFAULT 0,
  offer_amount DECIMAL(12, 2),
  discount_amount DECIMAL(12, 2) DEFAULT 0,
  registration_fee DECIMAL(12, 2) DEFAULT 0,
  num_installments INTEGER DEFAULT 1 CHECK (num_installments >= 1 AND num_installments <= 12),
  installment_1_amount DECIMAL(12, 2),
  installment_2_amount DECIMAL(12, 2),
  installment_3_amount DECIMAL(12, 2),
  installment_due_rules JSONB DEFAULT '[]'::jsonb,
  offer_enabled BOOLEAN DEFAULT true,
  payment_rules JSONB DEFAULT '{}'::jsonb,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS course_batch_center_fees (
  id SERIAL PRIMARY KEY,
  batch_id INTEGER NOT NULL REFERENCES course_master_batches(id) ON DELETE CASCADE,
  course_master_id INTEGER NOT NULL REFERENCES course_masters(id) ON DELETE CASCADE,
  center_id INTEGER NOT NULL REFERENCES centers(id) ON DELETE CASCADE,
  total_amount DECIMAL(12, 2) NOT NULL DEFAULT 0,
  offer_amount DECIMAL(12, 2),
  discount_amount DECIMAL(12, 2) DEFAULT 0,
  registration_fee DECIMAL(12, 2) DEFAULT 0,
  num_installments INTEGER DEFAULT 1,
  installment_1_amount DECIMAL(12, 2),
  installment_2_amount DECIMAL(12, 2),
  installment_3_amount DECIMAL(12, 2),
  installment_due_rules JSONB DEFAULT '[]'::jsonb,
  additional_discounts JSONB DEFAULT '[]'::jsonb,
  configured_by VARCHAR(20) DEFAULT 'center' CHECK (configured_by IN ('admin', 'center')),
  status VARCHAR(30) DEFAULT 'draft' CHECK (status IN ('draft', 'saved', 'approved', 'rejected')),
  saved_at TIMESTAMP,
  approved_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(batch_id, center_id)
);

CREATE INDEX IF NOT EXISTS idx_course_batch_base_fees_batch ON course_batch_base_fees(batch_id);
CREATE INDEX IF NOT EXISTS idx_course_batch_base_fees_course ON course_batch_base_fees(course_master_id);
CREATE INDEX IF NOT EXISTS idx_course_batch_center_fees_batch ON course_batch_center_fees(batch_id);
CREATE INDEX IF NOT EXISTS idx_course_batch_center_fees_center ON course_batch_center_fees(center_id);
