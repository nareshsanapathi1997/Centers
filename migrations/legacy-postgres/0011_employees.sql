-- Employees: center-scoped HR foundation for Phase B ERP (Expenses / Attendance later)
CREATE TABLE IF NOT EXISTS employees (
    id SERIAL PRIMARY KEY,
    center_id INTEGER NOT NULL REFERENCES centers(id) ON DELETE CASCADE,
    employee_code VARCHAR(50),
    full_name VARCHAR(255) NOT NULL,
    email VARCHAR(255),
    mobile VARCHAR(50),
    alternate_mobile VARCHAR(50),
    job_title VARCHAR(150),
    department VARCHAR(150),
    employment_type VARCHAR(50) NOT NULL DEFAULT 'full_time'
        CHECK (employment_type IN ('full_time', 'part_time', 'contract', 'intern', 'consultant')),
    status VARCHAR(30) NOT NULL DEFAULT 'active'
        CHECK (status IN ('active', 'inactive', 'on_leave', 'terminated')),
    join_date DATE,
    end_date DATE,
    date_of_birth DATE,
    gender VARCHAR(20),
    address TEXT,
    city VARCHAR(100),
    state VARCHAR(100),
    pincode VARCHAR(20),
    emergency_contact_name VARCHAR(255),
    emergency_contact_phone VARCHAR(50),
    -- Optional link to an existing center admin login (not required for every employee)
    admin_user_id INTEGER REFERENCES center_admins(id) ON DELETE SET NULL,
    -- Lightweight document metadata: [{ name, url, uploadedAt }]
    documents JSONB NOT NULL DEFAULT '[]'::jsonb,
    notes TEXT,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_employees_center_code
    ON employees(center_id, employee_code)
    WHERE employee_code IS NOT NULL AND employee_code <> '';

CREATE UNIQUE INDEX IF NOT EXISTS idx_employees_center_email
    ON employees(center_id, lower(email))
    WHERE email IS NOT NULL AND email <> '';

CREATE UNIQUE INDEX IF NOT EXISTS idx_employees_center_mobile
    ON employees(center_id, mobile)
    WHERE mobile IS NOT NULL AND mobile <> '';

CREATE INDEX IF NOT EXISTS idx_employees_center_status
    ON employees(center_id, status, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_employees_center_name
    ON employees(center_id, full_name);

CREATE INDEX IF NOT EXISTS idx_employees_admin_user
    ON employees(admin_user_id)
    WHERE admin_user_id IS NOT NULL;
