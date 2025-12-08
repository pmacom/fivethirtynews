-- Make legacy content columns nullable to allow deprecation
-- New columns (platform, platform_content_id, url) are now the authoritative source

-- Make legacy columns nullable
ALTER TABLE content ALTER COLUMN content_type DROP NOT NULL;
ALTER TABLE content ALTER COLUMN content_url DROP NOT NULL;

-- Add defaults to legacy columns for any new inserts that don't provide them
ALTER TABLE content ALTER COLUMN content_type SET DEFAULT 'unknown';
ALTER TABLE content ALTER COLUMN content_url SET DEFAULT '';

-- Add comment documenting the deprecation
COMMENT ON COLUMN content.content_type IS 'DEPRECATED: Use "platform" column instead';
COMMENT ON COLUMN content.content_url IS 'DEPRECATED: Use "url" column instead';
COMMENT ON COLUMN content.content_id IS 'DEPRECATED: Use "platform_content_id" column instead';
