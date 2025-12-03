-- =============================================
-- Add content aggregation window to episodes
-- This controls how far back content queries should go
-- when auto-populating episode categories
-- =============================================

-- Add content_starts_at column to episodes
-- This defines the start of the time window for content aggregation
-- When NULL, defaults to 7 days before the episode date/scheduled_at
ALTER TABLE episodes ADD COLUMN IF NOT EXISTS content_starts_at TIMESTAMPTZ;

-- Add index for efficient querying
CREATE INDEX IF NOT EXISTS idx_episodes_content_starts_at ON episodes(content_starts_at);

-- Add a comment explaining the field
COMMENT ON COLUMN episodes.content_starts_at IS 'Start date for content aggregation window. Content between this date and the episode date will be considered. Defaults to 7 days before episode when NULL.';
