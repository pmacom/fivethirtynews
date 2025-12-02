-- Migration script to move existing Twitter data from tagged_posts to unified content table
-- Run this AFTER creating the content table

-- Insert Twitter data from tagged_posts into content table
INSERT INTO content (
  id,
  platform,
  platform_content_id,
  url,
  description,
  content,
  author_name,
  thumbnail_url,
  tags,
  user_id,
  content_created_at,
  created_at
)
SELECT
  'twitter:' || tweet_id as id,
  'twitter' as platform,
  tweet_id as platform_content_id,
  url,
  tweet_text as description,
  tweet_text as content,
  author as author_name,
  thumbnail_url,
  tags,
  user_id,
  timestamp as content_created_at,
  created_at
FROM tagged_posts
ON CONFLICT (platform, platform_content_id) DO UPDATE SET
  url = EXCLUDED.url,
  description = EXCLUDED.description,
  content = EXCLUDED.content,
  author_name = EXCLUDED.author_name,
  thumbnail_url = EXCLUDED.thumbnail_url,
  tags = EXCLUDED.tags,
  user_id = EXCLUDED.user_id,
  updated_at = NOW();

-- Add comment about migration
COMMENT ON TABLE tagged_posts IS 'DEPRECATED: Legacy Twitter-only table. Use content table instead. This table will be removed in a future migration.';
