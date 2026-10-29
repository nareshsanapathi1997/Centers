-- Add approval_status column to news_items table
ALTER TABLE news_items 
ADD COLUMN IF NOT EXISTS approval_status VARCHAR(20) DEFAULT 'pending' CHECK (approval_status IN ('pending', 'approved', 'rejected'));

-- Add approval_status column to alerts table
ALTER TABLE alerts 
ADD COLUMN IF NOT EXISTS approval_status VARCHAR(20) DEFAULT 'pending' CHECK (approval_status IN ('pending', 'approved', 'rejected'));

-- Add indexes for faster queries
CREATE INDEX IF NOT EXISTS idx_news_items_approval_status ON news_items(approval_status);
CREATE INDEX IF NOT EXISTS idx_alerts_approval_status ON alerts(approval_status);

-- Add approval metadata columns (optional - to track who approved/rejected and when)
ALTER TABLE news_items 
ADD COLUMN IF NOT EXISTS approved_by INTEGER REFERENCES super_admins(id),
ADD COLUMN IF NOT EXISTS approved_at TIMESTAMP,
ADD COLUMN IF NOT EXISTS rejection_reason TEXT;

ALTER TABLE alerts 
ADD COLUMN IF NOT EXISTS approved_by INTEGER REFERENCES super_admins(id),
ADD COLUMN IF NOT EXISTS approved_at TIMESTAMP,
ADD COLUMN IF NOT EXISTS rejection_reason TEXT;
