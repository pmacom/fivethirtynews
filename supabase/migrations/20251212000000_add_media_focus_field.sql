-- Add media_focus field to content table
-- When TRUE: the media (image/video) is the main content, text is secondary
-- When FALSE/NULL: the text caption is relevant and should be displayed prominently

ALTER TABLE content
ADD COLUMN IF NOT EXISTS media_focus BOOLEAN DEFAULT false;

-- Partial index for efficient filtering when needed
CREATE INDEX IF NOT EXISTS idx_content_media_focus ON content(media_focus)
  WHERE media_focus = true;

-- Documentation
COMMENT ON COLUMN content.media_focus IS 'When true, indicates the media (image/video) is the primary content and text/caption is secondary or irrelevant';
