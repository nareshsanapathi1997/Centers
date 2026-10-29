-- Additive migration: enrollment features (promos, seats, waitlist, approvals,
-- scholarships, referrals, reminders queue, partial refunds, batch transfers,
-- admin-editable checkout settings). Safe to re-run (MariaDB IF NOT EXISTS).

ALTER TABLE `course_fee_discounts` ADD COLUMN IF NOT EXISTS `starts_at` DATETIME NULL;
ALTER TABLE `course_fee_discounts` ADD COLUMN IF NOT EXISTS `ends_at` DATETIME NULL;
ALTER TABLE `course_fee_discounts` ADD COLUMN IF NOT EXISTS `usage_limit` INT NULL;
ALTER TABLE `course_fee_discounts` ADD COLUMN IF NOT EXISTS `per_mobile_limit` INT NULL;
ALTER TABLE `course_fee_discounts` ADD COLUMN IF NOT EXISTS `min_amount` DECIMAL(12,2) NULL;
ALTER TABLE `course_fee_discounts` ADD COLUMN IF NOT EXISTS `created_by` VARCHAR(120) NULL;

ALTER TABLE `student_fee_payments` ADD COLUMN IF NOT EXISTS `approval_status` VARCHAR(20) NULL;
ALTER TABLE `student_fee_payments` ADD COLUMN IF NOT EXISTS `approved_by` VARCHAR(120) NULL;
ALTER TABLE `student_fee_payments` ADD COLUMN IF NOT EXISTS `approved_at` DATETIME NULL;
ALTER TABLE `student_fee_payments` ADD COLUMN IF NOT EXISTS `approval_note` VARCHAR(500) NULL;
ALTER TABLE `student_fee_payments` ADD COLUMN IF NOT EXISTS `refunded_amount` DECIMAL(12,2) NOT NULL DEFAULT 0;
ALTER TABLE `student_fee_payments` ADD COLUMN IF NOT EXISTS `referral_code` VARCHAR(40) NULL;
ALTER TABLE `student_fee_payments` ADD COLUMN IF NOT EXISTS `referral_discount` DECIMAL(12,2) NOT NULL DEFAULT 0;
ALTER TABLE `student_fee_payments` ADD COLUMN IF NOT EXISTS `scholarship_discount` DECIMAL(12,2) NOT NULL DEFAULT 0;
ALTER TABLE `student_fee_payments` ADD COLUMN IF NOT EXISTS `scholarship_tier_id` INT NULL;
ALTER TABLE `student_fee_payments` ADD COLUMN IF NOT EXISTS `form_data` LONGTEXT NULL;
ALTER TABLE `student_fee_payments` ADD COLUMN IF NOT EXISTS `terms_accepted_at` DATETIME NULL;

CREATE TABLE IF NOT EXISTS `enrollment_settings` (
  `id` INT NOT NULL AUTO_INCREMENT,
  `center_key` INT NOT NULL,
  `settings` LONGTEXT NOT NULL,
  `updated_by` VARCHAR(120) NULL,
  `updated_at` DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_enrollment_settings_center` (`center_key`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `batch_seat_limits` (
  `id` INT NOT NULL AUTO_INCREMENT,
  `center_id` INT NOT NULL,
  `batch_id` INT NOT NULL,
  `capacity` INT NULL,
  `updated_at` DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_batch_seat_center_batch` (`center_id`, `batch_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `enrollment_waitlist` (
  `id` INT NOT NULL AUTO_INCREMENT,
  `center_id` INT NOT NULL,
  `course_master_id` INT NOT NULL,
  `batch_id` INT NULL,
  `student_name` VARCHAR(255) NOT NULL,
  `student_mobile` VARCHAR(20) NOT NULL,
  `student_email` VARCHAR(255) NULL,
  `status` VARCHAR(20) NOT NULL DEFAULT 'waiting',
  `note` VARCHAR(500) NULL,
  `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP,
  `updated_at` DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_waitlist_entry` (`center_id`, `course_master_id`, `batch_id`, `student_mobile`),
  KEY `idx_waitlist_center` (`center_id`, `status`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `scholarship_tiers` (
  `id` INT NOT NULL AUTO_INCREMENT,
  `center_key` INT NOT NULL DEFAULT 0,
  `course_master_id` INT NULL,
  `name` VARCHAR(160) NOT NULL,
  `min_score` DECIMAL(6,2) NOT NULL DEFAULT 0,
  `max_score` DECIMAL(6,2) NOT NULL DEFAULT 100,
  `discount_type` VARCHAR(10) NOT NULL DEFAULT 'percent',
  `discount_value` DECIMAL(12,2) NOT NULL DEFAULT 0,
  `is_active` TINYINT(1) NOT NULL DEFAULT 1,
  `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_sch_tiers_center` (`center_key`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `scholarship_results` (
  `id` INT NOT NULL AUTO_INCREMENT,
  `center_id` INT NOT NULL,
  `student_mobile` VARCHAR(20) NOT NULL,
  `student_name` VARCHAR(255) NULL,
  `test_name` VARCHAR(160) NULL,
  `score` DECIMAL(8,2) NOT NULL,
  `max_score` DECIMAL(8,2) NOT NULL DEFAULT 100,
  `valid_until` DATE NULL,
  `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_sch_results_mobile` (`center_id`, `student_mobile`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `referral_codes` (
  `id` INT NOT NULL AUTO_INCREMENT,
  `center_id` INT NOT NULL,
  `code` VARCHAR(40) NOT NULL,
  `owner_name` VARCHAR(255) NULL,
  `owner_mobile` VARCHAR(20) NULL,
  `discount_type` VARCHAR(10) NOT NULL DEFAULT 'fixed',
  `discount_value` DECIMAL(12,2) NOT NULL DEFAULT 0,
  `usage_limit` INT NULL,
  `expires_at` DATE NULL,
  `is_active` TINYINT(1) NOT NULL DEFAULT 1,
  `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_referral_code` (`code`),
  KEY `idx_referral_center` (`center_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `payment_refunds` (
  `id` INT NOT NULL AUTO_INCREMENT,
  `payment_id` INT NOT NULL,
  `center_id` INT NOT NULL,
  `amount` DECIMAL(12,2) NOT NULL,
  `reason` VARCHAR(500) NULL,
  `method` VARCHAR(50) NULL,
  `reference` VARCHAR(255) NULL,
  `created_by` VARCHAR(120) NULL,
  `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_refunds_payment` (`payment_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `batch_transfers` (
  `id` INT NOT NULL AUTO_INCREMENT,
  `center_id` INT NOT NULL,
  `course_master_id` INT NOT NULL,
  `student_mobile` VARCHAR(20) NOT NULL,
  `student_name` VARCHAR(255) NULL,
  `from_batch_id` INT NULL,
  `to_batch_id` INT NOT NULL,
  `reason` VARCHAR(500) NULL,
  `created_by` VARCHAR(120) NULL,
  `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_transfers_center` (`center_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `notification_queue` (
  `id` INT NOT NULL AUTO_INCREMENT,
  `center_id` INT NULL,
  `channel` VARCHAR(20) NOT NULL,
  `recipient` VARCHAR(255) NOT NULL,
  `subject` VARCHAR(255) NULL,
  `body` TEXT NOT NULL,
  `kind` VARCHAR(40) NOT NULL DEFAULT 'general',
  `dedupe_key` VARCHAR(191) NULL,
  `status` VARCHAR(20) NOT NULL DEFAULT 'queued',
  `attempts` INT NOT NULL DEFAULT 0,
  `last_error` VARCHAR(500) NULL,
  `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP,
  `sent_at` DATETIME NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_notification_dedupe` (`dedupe_key`),
  KEY `idx_notification_status` (`status`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `app_migrations` (
  `name` VARCHAR(191) NOT NULL,
  `applied_at` DATETIME DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`name`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
