-- Attendance (mirrors migrations/0014_attendance.sql)
CREATE TABLE IF NOT EXISTS attendance_records (
    id SERIAL PRIMARY KEY,
    center_id INTEGER NOT NULL REFERENCES centers(id) ON DELETE CASCADE,
    batch_id INTEGER NOT NULL REFERENCES course_batches(id) ON DELETE CASCADE,
    student_id INTEGER NOT NULL REFERENCES students(id) ON DELETE CASCADE,
    attendance_date DATE NOT NULL,
    status VARCHAR(20) NOT NULL
        CHECK (status IN ('present', 'absent', 'late', 'excused')),
    marked_by_employee_id INTEGER REFERENCES employees(id) ON DELETE SET NULL,
    notes TEXT,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    UNIQUE (batch_id, student_id, attendance_date)
);

CREATE INDEX IF NOT EXISTS idx_attendance_center_date
    ON attendance_records(center_id, attendance_date DESC);

CREATE INDEX IF NOT EXISTS idx_attendance_batch_date
    ON attendance_records(batch_id, attendance_date DESC);

CREATE INDEX IF NOT EXISTS idx_attendance_student_date
    ON attendance_records(student_id, attendance_date DESC);

CREATE INDEX IF NOT EXISTS idx_attendance_center_batch_date
    ON attendance_records(center_id, batch_id, attendance_date DESC);
