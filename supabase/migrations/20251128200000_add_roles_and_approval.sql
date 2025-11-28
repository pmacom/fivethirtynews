-- Add is_admin column to users table
ALTER TABLE users ADD COLUMN IF NOT EXISTS is_admin BOOLEAN DEFAULT false;

-- Add approval workflow columns to content table
ALTER TABLE content
  ADD COLUMN IF NOT EXISTS approval_status VARCHAR(20) DEFAULT 'approved'
    CHECK (approval_status IN ('pending', 'approved', 'rejected')),
  ADD COLUMN IF NOT EXISTS submitted_by_user_id UUID REFERENCES users(id),
  ADD COLUMN IF NOT EXISTS approved_by UUID REFERENCES users(id),
  ADD COLUMN IF NOT EXISTS approved_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS approval_reason TEXT;

-- Index for efficient queries on approval status
CREATE INDEX IF NOT EXISTS idx_content_approval_status ON content(approval_status);

-- Note: Existing content defaults to 'approved' to maintain backwards compatibility
