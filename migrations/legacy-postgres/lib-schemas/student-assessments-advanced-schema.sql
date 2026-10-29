-- Advanced competitive-exam assessments: passages, directions, rich question types
-- Additive / idempotent migration (safe to re-run)

ALTER TABLE assessments
  ADD COLUMN IF NOT EXISTS directions TEXT;

ALTER TABLE assessment_sections
  ADD COLUMN IF NOT EXISTS directions TEXT;

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

CREATE INDEX IF NOT EXISTS idx_assessment_passages_assessment
  ON assessment_passages(assessment_id);
CREATE INDEX IF NOT EXISTS idx_assessment_passages_section
  ON assessment_passages(section_id);

ALTER TABLE assessment_questions
  ADD COLUMN IF NOT EXISTS question_type VARCHAR(32) NOT NULL DEFAULT 'single_choice';

ALTER TABLE assessment_questions
  ADD COLUMN IF NOT EXISTS passage_id INTEGER REFERENCES assessment_passages(id) ON DELETE SET NULL;

ALTER TABLE assessment_questions
  ADD COLUMN IF NOT EXISTS correct_option_ids JSONB;

ALTER TABLE assessment_questions
  ADD COLUMN IF NOT EXISTS correct_numeric NUMERIC(18, 6);

ALTER TABLE assessment_questions
  ADD COLUMN IF NOT EXISTS media_urls JSONB NOT NULL DEFAULT '[]'::jsonb;

-- Numeric / multi-select may not use a single correct_option_id
DO $$
BEGIN
  ALTER TABLE assessment_questions ALTER COLUMN correct_option_id DROP NOT NULL;
EXCEPTION
  WHEN others THEN NULL;
END $$;

ALTER TABLE assessment_questions
  ALTER COLUMN correct_option_id SET DEFAULT '';

UPDATE assessment_questions
SET question_type = 'single_choice'
WHERE question_type IS NULL OR TRIM(question_type) = '';

UPDATE assessment_questions
SET correct_option_id = COALESCE(correct_option_id, '')
WHERE correct_option_id IS NULL
  AND COALESCE(question_type, 'single_choice') IN ('single_choice', 'true_false');

ALTER TABLE assessment_answers
  ADD COLUMN IF NOT EXISTS selected_option_ids JSONB;

ALTER TABLE assessment_answers
  ADD COLUMN IF NOT EXISTS numeric_answer NUMERIC(18, 6);

CREATE INDEX IF NOT EXISTS idx_assessment_questions_passage
  ON assessment_questions(passage_id);
CREATE INDEX IF NOT EXISTS idx_assessment_questions_type
  ON assessment_questions(question_type);
