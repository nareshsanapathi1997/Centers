-- Free assessments: accessible to any active registered student at the center
-- (no completed student_fee_payments required). Additive / idempotent.

ALTER TABLE assessments
  ADD COLUMN IF NOT EXISTS is_free BOOLEAN NOT NULL DEFAULT false;

CREATE INDEX IF NOT EXISTS idx_assessments_free
  ON assessments(center_id, is_free)
  WHERE is_free = true;
