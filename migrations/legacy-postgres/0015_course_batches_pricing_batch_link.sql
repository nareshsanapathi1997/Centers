-- Optional link from academic/ops class batches to fee/pricing batches.
-- course_master_batches may be replaced by Course Masters save (delete+insert),
-- so use ON DELETE SET NULL to avoid breaking pricing workflows.

ALTER TABLE course_batches
  ADD COLUMN IF NOT EXISTS course_master_batch_id INTEGER
    REFERENCES course_master_batches(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_course_batches_pricing_batch
  ON course_batches(course_master_batch_id)
  WHERE course_master_batch_id IS NOT NULL;

COMMENT ON COLUMN course_batches.course_master_batch_id IS
  'Optional link to a Course Master pricing/timing batch (course_master_batches). Distinct from this class/ops batch.';
