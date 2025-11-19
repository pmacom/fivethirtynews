-- Seed data for testing the viewer

-- Insert a sample episode
INSERT INTO episodes (id, title, description, date) VALUES
  ('4902fc1b-cf21-4f98-b696-1926393eb37f', 'Episode 001: AI & Tech Roundup', 'A curated collection of the latest in AI, code, and technology', NOW() - INTERVAL '1 day')
ON CONFLICT (id) DO NOTHING;

-- Mock sample content items removed - use real data from your content management system
-- If you need seed data for testing, add real URLs instead of fake ones

-- Insert content blocks (categories)
INSERT INTO content_blocks (id, episode_id, title, description, weight) VALUES
  ('b1111111-1111-1111-1111-111111111111', '4902fc1b-cf21-4f98-b696-1926393eb37f', 'Artificial Intelligence', 'Latest AI news and developments', 0),
  ('b2222222-2222-2222-2222-222222222222', '4902fc1b-cf21-4f98-b696-1926393eb37f', 'Code & Development', 'Programming and software development', 1),
  ('b3333333-3333-3333-3333-333333333333', '4902fc1b-cf21-4f98-b696-1926393eb37f', 'Design & Art', 'Creative work and design systems', 2)
ON CONFLICT (id) DO NOTHING;

-- Mock content block items removed along with mock content
-- Add real content block items that reference your actual content

-- Insert sample tweet data (for the tweet cache)
INSERT INTO tweets (id, data) VALUES
  ('123', '{
    "id": "123",
    "text": "Just announced: GPT-4 is here! 🚀 Major improvements in reasoning, creativity, and context handling. Thread below 👇",
    "user": {
      "name": "OpenAI",
      "username": "OpenAI",
      "profile_image_url": "https://pbs.twimg.com/profile_images/1234/openai.jpg"
    },
    "created_at": "2024-03-14T10:00:00.000Z",
    "media": []
  }'),
  ('456', '{
    "id": "456",
    "text": "New design system launched! Clean, accessible, and built for scale. Check it out →",
    "user": {
      "name": "Design Studio",
      "username": "designstudio",
      "profile_image_url": "https://pbs.twimg.com/profile_images/5678/studio.jpg"
    },
    "created_at": "2024-03-15T14:30:00.000Z",
    "media": [
      {
        "type": "photo",
        "url": "https://pbs.twimg.com/media/sample2.jpg"
      }
    ]
  }')
ON CONFLICT (id) DO NOTHING;

-- Prepare tweets table for full dataset import
ALTER TABLE tweets
ADD COLUMN IF NOT EXISTS text TEXT,
ADD COLUMN IF NOT EXISTS screen_name TEXT,
ADD COLUMN IF NOT EXISTS profile_image TEXT,
ADD COLUMN IF NOT EXISTS thumbnail TEXT;

-- Change data column to TEXT to handle escaped JSON from tweets_rows.sql
ALTER TABLE tweets ALTER COLUMN data TYPE TEXT;

-- Import full tweet dataset
\i tweets_rows.sql
