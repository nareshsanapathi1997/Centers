-- Applies the empty-string unique-key fix to a database created before it was added to schema.sql.
DROP INDEX `idx_student_fee_payments_gateway_tx` ON `student_fee_payments`;
DROP INDEX `idx_employees_center_code` ON `employees`;
DROP INDEX `idx_employees_center_email` ON `employees`;
DROP INDEX `idx_employees_center_mobile` ON `employees`;
DROP INDEX `idx_course_batches_center_code` ON `course_batches`;
-- '' is treated like NULL (PostgreSQL partial index excluded empty strings).
ALTER TABLE `student_fee_payments` ADD COLUMN `transaction_id_key` VARCHAR(255) AS (NULLIF(`transaction_id`, '')) VIRTUAL INVISIBLE;
CREATE UNIQUE INDEX `idx_student_fee_payments_gateway_tx` ON `student_fee_payments` (`transaction_id_key`);
-- '' is treated like NULL (PostgreSQL partial index excluded empty strings).
ALTER TABLE `employees` ADD COLUMN `employee_code_key` VARCHAR(50) AS (NULLIF(`employee_code`, '')) VIRTUAL INVISIBLE;
CREATE UNIQUE INDEX `idx_employees_center_code` ON `employees` (`center_id`, `employee_code_key`);
-- '' is treated like NULL (PostgreSQL partial index excluded empty strings).
ALTER TABLE `employees` ADD COLUMN `email_key` VARCHAR(255) AS (NULLIF(`email`, '')) VIRTUAL INVISIBLE;
CREATE UNIQUE INDEX `idx_employees_center_email` ON `employees` (`center_id`, `email_key`(191));
-- '' is treated like NULL (PostgreSQL partial index excluded empty strings).
ALTER TABLE `employees` ADD COLUMN `mobile_key` VARCHAR(50) AS (NULLIF(`mobile`, '')) VIRTUAL INVISIBLE;
CREATE UNIQUE INDEX `idx_employees_center_mobile` ON `employees` (`center_id`, `mobile_key`);
-- '' is treated like NULL (PostgreSQL partial index excluded empty strings).
ALTER TABLE `course_batches` ADD COLUMN `code_key` VARCHAR(50) AS (NULLIF(`code`, '')) VIRTUAL INVISIBLE;
CREATE UNIQUE INDEX `idx_course_batches_center_code` ON `course_batches` (`center_id`, `code_key`);
