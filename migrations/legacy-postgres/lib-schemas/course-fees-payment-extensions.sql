-- Payment system extensions (run after course-fees-schema.sql)

CREATE TABLE IF NOT EXISTS payment_receipt_sequences (
  center_id INTEGER NOT NULL REFERENCES centers(id) ON DELETE CASCADE,
  year INTEGER NOT NULL,
  last_seq INTEGER NOT NULL DEFAULT 0,
  PRIMARY KEY (center_id, year)
);

ALTER TABLE student_fee_payments ADD COLUMN IF NOT EXISTS batch_id INTEGER REFERENCES course_master_batches(id) ON DELETE SET NULL;
ALTER TABLE student_fee_payments ADD COLUMN IF NOT EXISTS idempotency_key VARCHAR(100);
ALTER TABLE student_fee_payments ADD COLUMN IF NOT EXISTS gateway_order_id VARCHAR(100);
ALTER TABLE student_fee_payments ADD COLUMN IF NOT EXISTS coupon_code VARCHAR(100);
ALTER TABLE student_fee_payments ADD COLUMN IF NOT EXISTS discount_id INTEGER REFERENCES course_fee_discounts(id) ON DELETE SET NULL;
ALTER TABLE student_fee_payments ADD COLUMN IF NOT EXISTS gst_amount DECIMAL(12, 2) DEFAULT 0;
ALTER TABLE student_fee_payments ADD COLUMN IF NOT EXISTS gst_rate DECIMAL(5, 2) DEFAULT 18;
ALTER TABLE student_fee_payments ADD COLUMN IF NOT EXISTS created_by VARCHAR(255);
ALTER TABLE student_fee_payments ADD COLUMN IF NOT EXISTS client_ip VARCHAR(45);
ALTER TABLE student_fee_payments ADD COLUMN IF NOT EXISTS gateway_response JSONB DEFAULT '{}'::jsonb;
ALTER TABLE student_fee_payments ADD COLUMN IF NOT EXISTS refunded_at TIMESTAMP;
ALTER TABLE student_fee_payments ADD COLUMN IF NOT EXISTS refund_transaction_id VARCHAR(255);

CREATE UNIQUE INDEX IF NOT EXISTS idx_student_fee_payments_idempotency
  ON student_fee_payments(idempotency_key) WHERE idempotency_key IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS idx_student_fee_payments_gateway_tx
  ON student_fee_payments(transaction_id) WHERE transaction_id IS NOT NULL AND transaction_id <> '';

CREATE INDEX IF NOT EXISTS idx_student_fee_payments_batch ON student_fee_payments(batch_id);
CREATE INDEX IF NOT EXISTS idx_student_fee_payments_status ON student_fee_payments(status);
CREATE INDEX IF NOT EXISTS idx_student_payment_installments_lookup
  ON student_payment_installments(center_id, course_master_id, student_mobile);

CREATE UNIQUE INDEX IF NOT EXISTS idx_student_payment_installments_unique
  ON student_payment_installments(center_id, course_master_id, student_mobile, installment_no)
  WHERE status = 'paid';
