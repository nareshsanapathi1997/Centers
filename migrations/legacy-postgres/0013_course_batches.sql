-- Academic/ops class batches (cohorts), distinct from course_master_batches (fee/pricing timing).
CREATE TABLE IF NOT EXISTS course_batches (
    id SERIAL PRIMARY KEY,
    center_id INTEGER NOT NULL REFERENCES centers(id) ON DELETE CASCADE,
    course_master_id INTEGER NOT NULL REFERENCES course_masters(id) ON DELETE RESTRICT,
    name VARCHAR(255) NOT NULL,
    code VARCHAR(50),
    start_date DATE,
    end_date DATE,
    status VARCHAR(30) NOT NULL DEFAULT 'upcoming'
        CHECK (status IN ('upcoming', 'active', 'completed')),
    capacity INTEGER CHECK (capacity IS NULL OR capacity > 0),
    faculty_employee_id INTEGER REFERENCES employees(id) ON DELETE SET NULL,
    notes TEXT,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_course_batches_center_code
    ON course_batches(center_id, code)
    WHERE code IS NOT NULL AND code <> '';

CREATE INDEX IF NOT EXISTS idx_course_batches_center_status
    ON course_batches(center_id, status, start_date DESC NULLS LAST);

CREATE INDEX IF NOT EXISTS idx_course_batches_center_course
    ON course_batches(center_id, course_master_id);

CREATE INDEX IF NOT EXISTS idx_course_batches_faculty
    ON course_batches(faculty_employee_id)
    WHERE faculty_employee_id IS NOT NULL;

CREATE TABLE IF NOT EXISTS course_batch_enrollments (
    id SERIAL PRIMARY KEY,
    batch_id INTEGER NOT NULL REFERENCES course_batches(id) ON DELETE CASCADE,
    student_id INTEGER NOT NULL REFERENCES students(id) ON DELETE CASCADE,
    status VARCHAR(30) NOT NULL DEFAULT 'active'
        CHECK (status IN ('active', 'withdrawn', 'completed')),
    enrolled_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    notes TEXT,
    UNIQUE (batch_id, student_id)
);

CREATE INDEX IF NOT EXISTS idx_course_batch_enrollments_batch
    ON course_batch_enrollments(batch_id, status);

CREATE INDEX IF NOT EXISTS idx_course_batch_enrollments_student
    ON course_batch_enrollments(student_id);
