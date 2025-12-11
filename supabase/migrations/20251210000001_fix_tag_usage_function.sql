-- Migration: Fix get_tag_usage_counts function for JSONB tags column
-- Date: 2024-12-10
-- Problem: Original function used unnest() which works for TEXT[] but tags is JSONB

-- Drop and recreate the function with correct JSONB handling
CREATE OR REPLACE FUNCTION get_tag_usage_counts()
RETURNS TABLE(tag_slug TEXT, usage_count BIGINT) AS $$
BEGIN
  RETURN QUERY
  SELECT
    jsonb_array_elements_text(tags) as tag_slug,
    COUNT(*)::BIGINT as usage_count
  FROM content
  WHERE jsonb_array_length(tags) > 0
  GROUP BY jsonb_array_elements_text(tags)
  ORDER BY usage_count DESC;
END;
$$ LANGUAGE plpgsql;
