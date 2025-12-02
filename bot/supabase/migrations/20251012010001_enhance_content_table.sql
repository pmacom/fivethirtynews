-- Enhance content table with creator linking and metadata quality tracking

-- Add author_id column to link to creators table
ALTER TABLE content
ADD COLUMN author_id TEXT REFERENCES creators(id);

-- Add metadata quality tracking
ALTER TABLE content
ADD COLUMN metadata_quality JSONB DEFAULT '{}'::jsonb;

-- Create index for author_id lookups
CREATE INDEX idx_content_author_id ON content(author_id);

-- Create index for metadata quality queries
CREATE INDEX idx_content_metadata_quality ON content USING GIN(metadata_quality);

-- Trigger to update creator stats when content changes
CREATE TRIGGER content_creator_stats_trigger
  AFTER INSERT OR UPDATE OR DELETE ON content
  FOR EACH ROW
  EXECUTE FUNCTION update_creator_stats();

-- Add comments
COMMENT ON COLUMN content.author_id IS 'Foreign key to creators table (format: platform:username)';
COMMENT ON COLUMN content.metadata_quality IS 'Metadata validation results: {score, completeness, confidence, issues, sources}';
