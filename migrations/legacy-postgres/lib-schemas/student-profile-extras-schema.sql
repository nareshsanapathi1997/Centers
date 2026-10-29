-- Additive student profile extras (photo + notification prefs)

ALTER TABLE students ADD COLUMN IF NOT EXISTS photo_url TEXT;
ALTER TABLE students ADD COLUMN IF NOT EXISTS notify_email BOOLEAN DEFAULT true;
ALTER TABLE students ADD COLUMN IF NOT EXISTS notify_in_app BOOLEAN DEFAULT true;

UPDATE students SET notify_email = true WHERE notify_email IS NULL;
UPDATE students SET notify_in_app = true WHERE notify_in_app IS NULL;
