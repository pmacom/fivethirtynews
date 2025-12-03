-- =============================================
-- Add tags column to content_blocks
-- Allows custom categories without templates
-- =============================================

-- Add tags array column to content_blocks
ALTER TABLE content_blocks ADD COLUMN IF NOT EXISTS tags TEXT[] DEFAULT '{}';

-- Add GIN index for efficient array operations
CREATE INDEX IF NOT EXISTS idx_content_blocks_tags ON content_blocks USING GIN(tags);

-- Add comment explaining the column
COMMENT ON COLUMN content_blocks.tags IS 'Custom tags for blocks without templates or for overriding template tags. Used to query matching content.';
