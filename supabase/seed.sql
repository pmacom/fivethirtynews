-- Seed data for testing the viewer

-- Insert a sample episode
INSERT INTO episodes (id, title, description, date) VALUES
  ('4902fc1b-cf21-4f98-b696-1926393eb37f', 'Episode 001: AI & Tech Roundup', 'A curated collection of the latest in AI, code, and technology', NOW() - INTERVAL '1 day')
ON CONFLICT (id) DO NOTHING;

-- Insert sample content items
INSERT INTO content (id, content_type, content_url, content_id, thumbnail_url, submitted_by, category, categories, description) VALUES
  ('c1111111-1111-1111-1111-111111111111', 'twitter', 'https://twitter.com/user/status/123', '123', 'https://pbs.twimg.com/media/sample1.jpg', 'curator', 'AI', ARRAY['AI', 'LLM'], 'GPT-4 announcement thread'),
  ('c2222222-2222-2222-2222-222222222222', 'website', 'https://example.com/article1', NULL, 'https://example.com/thumb1.jpg', 'curator', 'Code', ARRAY['Code', 'JavaScript'], 'New JavaScript features'),
  ('c3333333-3333-3333-3333-333333333333', 'video', 'https://youtube.com/watch?v=abc123', 'abc123', 'https://img.youtube.com/vi/abc123/maxresdefault.jpg', 'curator', 'AI', ARRAY['AI', 'Robotics'], 'Robot demo video'),
  ('c4444444-4444-4444-4444-444444444444', 'twitter', 'https://twitter.com/user/status/456', '456', 'https://pbs.twimg.com/media/sample2.jpg', 'curator', 'Design', ARRAY['Design', 'UX'], 'Design system showcase'),
  ('c5555555-5555-5555-5555-555555555555', 'image', 'https://example.com/art.png', NULL, 'https://example.com/art_thumb.png', 'curator', 'Art', ARRAY['Art', 'AI'], 'AI-generated artwork'),
  ('c6666666-6666-6666-6666-666666666666', 'warpcast', 'https://warpcast.com/user/cast123', 'cast123', NULL, 'curator', 'Crypto', ARRAY['Crypto', 'Web3'], 'Farcaster update')
ON CONFLICT (id) DO NOTHING;

-- Insert content blocks (categories)
INSERT INTO content_blocks (id, episode_id, title, description, weight) VALUES
  ('b1111111-1111-1111-1111-111111111111', '4902fc1b-cf21-4f98-b696-1926393eb37f', 'Artificial Intelligence', 'Latest AI news and developments', 0),
  ('b2222222-2222-2222-2222-222222222222', '4902fc1b-cf21-4f98-b696-1926393eb37f', 'Code & Development', 'Programming and software development', 1),
  ('b3333333-3333-3333-3333-333333333333', '4902fc1b-cf21-4f98-b696-1926393eb37f', 'Design & Art', 'Creative work and design systems', 2)
ON CONFLICT (id) DO NOTHING;

-- Insert content block items (linking blocks to content)
INSERT INTO content_block_items (id, content_block_id, news_id, note, weight) VALUES
  ('11111111-1111-1111-1111-111111111111', 'b1111111-1111-1111-1111-111111111111', 'c1111111-1111-1111-1111-111111111111', 'Major GPT-4 announcement with impressive benchmarks', 0),
  ('22222222-2222-2222-2222-222222222222', 'b1111111-1111-1111-1111-111111111111', 'c3333333-3333-3333-3333-333333333333', 'Boston Dynamics new robot demonstration', 1),
  ('33333333-3333-3333-3333-333333333333', 'b2222222-2222-2222-2222-222222222222', 'c2222222-2222-2222-2222-222222222222', 'ECMAScript 2024 features you should know', 0),
  ('44444444-4444-4444-4444-444444444444', 'b3333333-3333-3333-3333-333333333333', 'c4444444-4444-4444-4444-444444444444', 'Building a cohesive design system', 0),
  ('55555555-5555-5555-5555-555555555555', 'b3333333-3333-3333-3333-333333333333', 'c5555555-5555-5555-5555-555555555555', 'Stunning AI-generated art showcase', 1)
ON CONFLICT (id) DO NOTHING;

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
