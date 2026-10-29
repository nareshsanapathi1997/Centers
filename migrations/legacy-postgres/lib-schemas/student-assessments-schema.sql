-- Student Assessments: practice quizzes, mock tests, scheduled live exams

CREATE TABLE IF NOT EXISTS assessments (
  id SERIAL PRIMARY KEY,
  center_id INTEGER NOT NULL REFERENCES centers(id) ON DELETE CASCADE,
  course_master_id INTEGER NOT NULL REFERENCES course_masters(id) ON DELETE CASCADE,
  batch_id INTEGER,
  mode VARCHAR(20) NOT NULL CHECK (mode IN ('practice', 'mock', 'live')),
  title VARCHAR(255) NOT NULL,
  description TEXT,
  directions TEXT,
  duration_minutes INTEGER NOT NULL DEFAULT 60,
  max_attempts INTEGER NOT NULL DEFAULT 1,
  starts_at TIMESTAMP,
  ends_at TIMESTAMP,
  shuffle_questions BOOLEAN NOT NULL DEFAULT false,
  shuffle_options BOOLEAN NOT NULL DEFAULT false,
  show_results VARCHAR(20) NOT NULL DEFAULT 'immediate'
    CHECK (show_results IN ('immediate', 'after_end', 'never')),
  is_published BOOLEAN NOT NULL DEFAULT false,
  is_free BOOLEAN NOT NULL DEFAULT false,
  marks_correct NUMERIC(8, 2) NOT NULL DEFAULT 1,
  marks_incorrect NUMERIC(8, 2) NOT NULL DEFAULT 0,
  created_by INTEGER,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_assessments_center ON assessments(center_id);
CREATE INDEX IF NOT EXISTS idx_assessments_course ON assessments(course_master_id);
CREATE INDEX IF NOT EXISTS idx_assessments_mode ON assessments(mode);
CREATE INDEX IF NOT EXISTS idx_assessments_published ON assessments(center_id, is_published);
CREATE INDEX IF NOT EXISTS idx_assessments_free
  ON assessments(center_id, is_free)
  WHERE is_free = true;

CREATE TABLE IF NOT EXISTS assessment_sections (
  id SERIAL PRIMARY KEY,
  assessment_id INTEGER NOT NULL REFERENCES assessments(id) ON DELETE CASCADE,
  title VARCHAR(255) NOT NULL,
  directions TEXT,
  sort_order INTEGER NOT NULL DEFAULT 0,
  duration_minutes INTEGER,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_assessment_sections_assessment ON assessment_sections(assessment_id);

CREATE TABLE IF NOT EXISTS assessment_passages (
  id SERIAL PRIMARY KEY,
  assessment_id INTEGER NOT NULL REFERENCES assessments(id) ON DELETE CASCADE,
  section_id INTEGER REFERENCES assessment_sections(id) ON DELETE SET NULL,
  title VARCHAR(255),
  content TEXT NOT NULL DEFAULT '',
  media_urls JSONB NOT NULL DEFAULT '[]'::jsonb,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_assessment_passages_assessment ON assessment_passages(assessment_id);
CREATE INDEX IF NOT EXISTS idx_assessment_passages_section ON assessment_passages(section_id);

CREATE TABLE IF NOT EXISTS assessment_questions (
  id SERIAL PRIMARY KEY,
  assessment_id INTEGER NOT NULL REFERENCES assessments(id) ON DELETE CASCADE,
  section_id INTEGER REFERENCES assessment_sections(id) ON DELETE SET NULL,
  passage_id INTEGER REFERENCES assessment_passages(id) ON DELETE SET NULL,
  question_type VARCHAR(32) NOT NULL DEFAULT 'single_choice',
  prompt TEXT NOT NULL,
  options JSONB NOT NULL DEFAULT '[]'::jsonb,
  correct_option_id VARCHAR(64),
  correct_option_ids JSONB,
  correct_numeric NUMERIC(18, 6),
  media_urls JSONB NOT NULL DEFAULT '[]'::jsonb,
  marks NUMERIC(8, 2),
  explanation TEXT,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_assessment_questions_assessment ON assessment_questions(assessment_id);
CREATE INDEX IF NOT EXISTS idx_assessment_questions_section ON assessment_questions(section_id);
CREATE INDEX IF NOT EXISTS idx_assessment_questions_passage ON assessment_questions(passage_id);
CREATE INDEX IF NOT EXISTS idx_assessment_questions_type ON assessment_questions(question_type);

CREATE TABLE IF NOT EXISTS assessment_attempts (
  id SERIAL PRIMARY KEY,
  assessment_id INTEGER NOT NULL REFERENCES assessments(id) ON DELETE CASCADE,
  student_id INTEGER NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  center_id INTEGER NOT NULL REFERENCES centers(id) ON DELETE CASCADE,
  status VARCHAR(20) NOT NULL DEFAULT 'in_progress'
    CHECK (status IN ('in_progress', 'submitted', 'expired')),
  started_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  ends_at TIMESTAMP NOT NULL,
  submitted_at TIMESTAMP,
  score NUMERIC(10, 2),
  max_score NUMERIC(10, 2),
  rank INTEGER,
  question_order JSONB NOT NULL DEFAULT '[]'::jsonb,
  option_orders JSONB NOT NULL DEFAULT '{}'::jsonb,
  proctor_event_count INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_assessment_attempts_assessment ON assessment_attempts(assessment_id);
CREATE INDEX IF NOT EXISTS idx_assessment_attempts_student ON assessment_attempts(student_id);
CREATE INDEX IF NOT EXISTS idx_assessment_attempts_center ON assessment_attempts(center_id);
CREATE INDEX IF NOT EXISTS idx_assessment_attempts_status ON assessment_attempts(assessment_id, status);

CREATE UNIQUE INDEX IF NOT EXISTS idx_assessment_attempts_one_in_progress
  ON assessment_attempts(assessment_id, student_id)
  WHERE status = 'in_progress';

CREATE TABLE IF NOT EXISTS assessment_answers (
  id SERIAL PRIMARY KEY,
  attempt_id INTEGER NOT NULL REFERENCES assessment_attempts(id) ON DELETE CASCADE,
  question_id INTEGER NOT NULL REFERENCES assessment_questions(id) ON DELETE CASCADE,
  selected_option_id VARCHAR(64),
  selected_option_ids JSONB,
  numeric_answer NUMERIC(18, 6),
  is_correct BOOLEAN,
  marks_awarded NUMERIC(8, 2),
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(attempt_id, question_id)
);

CREATE INDEX IF NOT EXISTS idx_assessment_answers_attempt ON assessment_answers(attempt_id);

CREATE TABLE IF NOT EXISTS assessment_proctor_events (
  id SERIAL PRIMARY KEY,
  attempt_id INTEGER NOT NULL REFERENCES assessment_attempts(id) ON DELETE CASCADE,
  event_type VARCHAR(64) NOT NULL,
  meta JSONB,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_assessment_proctor_events_attempt ON assessment_proctor_events(attempt_id);
