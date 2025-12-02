-- Demo Content for 530 Project
-- This script seeds sample content to demonstrate the platform
-- Run this after reset-content.sql to populate the database with test data

\echo '=== SEEDING DEMO CONTENT ==='
\echo ''

-- Insert sample Twitter/X posts into tagged_posts (for backward compatibility)
INSERT INTO tagged_posts (id, tweet_id, tweet_text, author, url, timestamp, user_id, category, tags, thumbnail_url) VALUES
(
  gen_random_uuid(),
  '1979698664366129402',
  'If you saw how people actually use coding agents, you would realize Andrej''s point is very true.

People who keep them on a tight leash, using short threads, reading and reviewing all the code, can get a lot of value out of coding agents. People who go nuts have a quick high but then quickly realize they''re getting negative value.

For a coding agent, getting the basics right (e.g., agents being able to reliably and minimally build/test your code, and a great interface for code review and human-agent collab) >>> WhateverBench and "hours of autonomy" for agent harnesses and 10 parallel subagents with spec slop',
  'Quinn Slack',
  'https://x.com/sqs/status/1979698664366129402',
  NOW() - INTERVAL '2 hours',
  'demo-user',
  'uncategorized',
  '["ai", "code", "llm"]'::jsonb,
  'https://pbs.twimg.com/profile_images/1234567890/avatar.jpg'
),
(
  gen_random_uuid(),
  '1979600000000000001',
  'Just released a new Gaussian Splatting demo! The real-time performance is incredible - 60fps on a mid-range GPU. This is the future of 3D graphics.',
  'Alex Chen',
  'https://x.com/alexchen/status/1979600000000000001',
  NOW() - INTERVAL '5 hours',
  'demo-user',
  'uncategorized',
  '["3d-development", "gaussian-splatting", "webgl"]'::jsonb,
  'https://pbs.twimg.com/media/example_3d_splat.jpg'
),
(
  gen_random_uuid(),
  '1979500000000000002',
  'React 19 + Next.js 15 is an absolute game changer. Server Components are finally clicking for me. The mental model shift is real but so worth it.',
  'Sarah Martinez',
  'https://x.com/sarahmartinez/status/1979500000000000002',
  NOW() - INTERVAL '8 hours',
  'demo-user',
  'uncategorized',
  '["web-development", "react", "nextjs"]'::jsonb,
  'https://pbs.twimg.com/media/react_nextjs_screenshot.png'
),
(
  gen_random_uuid(),
  '1979400000000000003',
  'Spent the weekend building a VR experience in Unity. The new XR Interaction Toolkit 3.0 makes hand tracking so much easier to implement. Metaverse development is getting more accessible every day.',
  'Jordan Lee',
  'https://x.com/jordanlee/status/1979400000000000003',
  NOW() - INTERVAL '12 hours',
  'demo-user',
  'uncategorized',
  '["metaverse", "unity", "virtual-reality", "xr"]'::jsonb,
  'https://pbs.twimg.com/media/vr_unity_screenshot.jpg'
),
(
  gen_random_uuid(),
  '1979300000000000004',
  'GPT-4''s vision capabilities combined with Claude''s reasoning = perfect combo for building AI agents. Using them together in my workflow and it''s transformative.',
  'Maya Patel',
  'https://x.com/mayapatel/status/1979300000000000004',
  NOW() - INTERVAL '18 hours',
  'demo-user',
  'uncategorized',
  '["ai", "llm", "gpt-4", "claude", "ai-workflows"]'::jsonb,
  'https://pbs.twimg.com/media/ai_workflow_diagram.png'
),
(
  gen_random_uuid(),
  '1979200000000000005',
  'Blender 4.2 + AI texture generation is mind-blowing. What used to take hours now takes minutes. The future of 3D art is here.',
  'Marcus Johnson',
  'https://x.com/marcusj/status/1979200000000000005',
  NOW() - INTERVAL '1 day',
  'demo-user',
  'uncategorized',
  '["3d-development", "blender", "ai-3d-models", "generative-design"]'::jsonb,
  'https://pbs.twimg.com/media/blender_ai_texture.jpg'
),
(
  gen_random_uuid(),
  '1979100000000000006',
  'Web3 + Metaverse integration is finally making sense. Building a decentralized virtual world on Polygon - the gas fees are negligible compared to Ethereum mainnet.',
  'Elena Rodriguez',
  'https://x.com/elenarodriguez/status/1979100000000000006',
  NOW() - INTERVAL '1 day',
  'demo-user',
  'uncategorized',
  '["metaverse", "web3", "blockchain", "ethereum"]'::jsonb,
  'https://pbs.twimg.com/media/web3_metaverse.png'
),
(
  gen_random_uuid(),
  '1979000000000000007',
  'Computer Vision + AR = the perfect match. Our new object detection model runs at 30fps on mobile devices. Real-time augmented reality is no longer a dream.',
  'Yuki Tanaka',
  'https://x.com/yukitanaka/status/1979000000000000007',
  NOW() - INTERVAL '2 days',
  'demo-user',
  'uncategorized',
  '["computer-vision", "augmented-reality", "machine-learning", "ai"]'::jsonb,
  'https://pbs.twimg.com/media/ar_cv_demo.jpg'
),
(
  gen_random_uuid(),
  '1978900000000000008',
  'Supabase + Next.js = the perfect stack for indie hackers. Built and deployed a full SaaS in 2 weeks. The DX is incredible.',
  'Chris Anderson',
  'https://x.com/chrisanderson/status/1978900000000000008',
  NOW() - INTERVAL '3 days',
  'demo-user',
  'uncategorized',
  '["web-development", "databases", "nextjs", "supabase"]'::jsonb,
  'https://pbs.twimg.com/media/supabase_nextjs.png'
),
(
  gen_random_uuid(),
  '1978800000000000009',
  'Ethics in AI is not optional anymore. We need to build responsible AI systems from the ground up. Happy to see more companies adopting AI governance frameworks.',
  'Dr. Priya Sharma',
  'https://x.com/drpriyasharma/status/1978800000000000009',
  NOW() - INTERVAL '4 days',
  'demo-user',
  'uncategorized',
  '["ai", "ethics-society", "ai-governance", "responsible-ai"]'::jsonb,
  'https://pbs.twimg.com/media/ai_ethics.jpg'
)
ON CONFLICT DO NOTHING;

-- Migrate the seeded data to the content table
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
WHERE user_id = 'demo-user'
ON CONFLICT (platform, platform_content_id) DO UPDATE SET
  url = EXCLUDED.url,
  description = EXCLUDED.description,
  content = EXCLUDED.content,
  author_name = EXCLUDED.author_name,
  thumbnail_url = EXCLUDED.thumbnail_url,
  tags = EXCLUDED.tags,
  user_id = EXCLUDED.user_id,
  updated_at = NOW();

-- Add YouTube content directly to content table
INSERT INTO content (
  id,
  platform,
  platform_content_id,
  url,
  title,
  description,
  content,
  author_name,
  thumbnail_url,
  tags,
  user_id,
  content_created_at,
  media_assets,
  metadata
) VALUES
(
  'youtube:dQw4w9WgXcQ',
  'youtube',
  'dQw4w9WgXcQ',
  'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
  'Building a 3D Gaussian Splatting Scene from Scratch',
  'In this tutorial, I walk through creating a real-time 3D Gaussian Splatting scene using Three.js and WebGL. We cover camera movement, splat rendering, and optimization techniques.',
  'Complete tutorial on implementing Gaussian Splatting in the browser. Learn how to render millions of 3D Gaussians at 60fps.',
  'TechVision3D',
  'https://i.ytimg.com/vi/dQw4w9WgXcQ/hqdefault.jpg',
  '["3d-development", "gaussian-splatting", "webgl", "threejs", "tutorial"]'::jsonb,
  'demo-user',
  NOW() - INTERVAL '3 hours',
  '[{"type": "video", "url": "https://www.youtube.com/watch?v=dQw4w9WgXcQ", "duration": 847}]'::jsonb,
  '{"views": 125000, "likes": 8500, "channel": "TechVision3D"}'::jsonb
),
(
  'youtube:jNQXAC9IVRw',
  'youtube',
  'jNQXAC9IVRw',
  'https://www.youtube.com/watch?v=jNQXAC9IVRw',
  'Me at the zoo',
  'The first video uploaded to YouTube. A classic piece of internet history.',
  'Historic first YouTube video',
  'jawed',
  'https://i.ytimg.com/vi/jNQXAC9IVRw/hqdefault.jpg',
  '["general", "internet-history"]'::jsonb,
  'demo-user',
  NOW() - INTERVAL '6 hours',
  '[{"type": "video", "url": "https://www.youtube.com/watch?v=jNQXAC9IVRw", "duration": 19}]'::jsonb,
  '{"views": 200000000, "likes": 5000000, "channel": "jawed"}'::jsonb
),
(
  'youtube:kJQP7kiw5Fk',
  'youtube',
  'kJQP7kiw5Fk',
  'https://www.youtube.com/watch?v=kJQP7kiw5Fk',
  'Building AI Agents with GPT-4 and LangChain',
  'Deep dive into creating autonomous AI agents using GPT-4, Claude, and LangChain. We build a research agent that can browse the web and compile reports.',
  'Learn how to build powerful AI agents that can autonomously complete complex tasks.',
  'AI Engineering',
  'https://i.ytimg.com/vi/kJQP7kiw5Fk/hqdefault.jpg',
  '["ai", "llm", "gpt-4", "langchain", "ai-agents"]'::jsonb,
  'demo-user',
  NOW() - INTERVAL '10 hours',
  '[{"type": "video", "url": "https://www.youtube.com/watch?v=kJQP7kiw5Fk", "duration": 1823}]'::jsonb,
  '{"views": 89000, "likes": 6200, "channel": "AI Engineering"}'::jsonb
),
(
  'youtube:ZoqgAy3h4OM',
  'youtube',
  'ZoqgAy3h4OM',
  'https://www.youtube.com/watch?v=ZoqgAy3h4OM',
  'Unity XR Toolkit 3.0 - Complete VR Tutorial',
  'Build your first VR application using Unity''s new XR Interaction Toolkit 3.0. Covers hand tracking, grab interactions, and locomotion.',
  'Complete beginner-friendly VR development tutorial for Unity 2023.',
  'VR Dev Academy',
  'https://i.ytimg.com/vi/ZoqgAy3h4OM/hqdefault.jpg',
  '["metaverse", "unity", "virtual-reality", "xr", "tutorial"]'::jsonb,
  'demo-user',
  NOW() - INTERVAL '15 hours',
  '[{"type": "video", "url": "https://www.youtube.com/watch?v=ZoqgAy3h4OM", "duration": 2156}]'::jsonb,
  '{"views": 45000, "likes": 3800, "channel": "VR Dev Academy"}'::jsonb
),
(
  'youtube:9bZkp7q19f0',
  'youtube',
  '9bZkp7q19f0',
  'https://www.youtube.com/watch?v=9bZkp7q19f0',
  'Next.js 15 - What''s New and How to Migrate',
  'Comprehensive overview of Next.js 15 features including Server Components, Turbopack, and the new App Router improvements.',
  'Everything you need to know about upgrading to Next.js 15.',
  'Web Dev Simplified',
  'https://i.ytimg.com/vi/9bZkp7q19f0/hqdefault.jpg',
  '["web-development", "nextjs", "react", "frontend-frameworks"]'::jsonb,
  'demo-user',
  NOW() - INTERVAL '1 day',
  '[{"type": "video", "url": "https://www.youtube.com/watch?v=9bZkp7q19f0", "duration": 1456}]'::jsonb,
  '{"views": 156000, "likes": 12000, "channel": "Web Dev Simplified"}'::jsonb
)
ON CONFLICT (platform, platform_content_id) DO NOTHING;

-- Add Reddit content
INSERT INTO content (
  id,
  platform,
  platform_content_id,
  url,
  title,
  description,
  content,
  author_name,
  thumbnail_url,
  tags,
  user_id,
  content_created_at,
  metadata
) VALUES
(
  'reddit:18xyz123',
  'reddit',
  '18xyz123',
  'https://reddit.com/r/MachineLearning/comments/18xyz123/d_new_breakthrough_in_computer_vision/',
  '[D] New breakthrough in computer vision for real-time AR',
  'Researchers at MIT have developed a new architecture that can run object detection at 120fps on mobile GPUs. Game changer for AR applications.',
  'Discussion about breakthrough computer vision model optimized for mobile AR. 250+ comments discussing implementation details and potential applications.',
  'u/ML_Researcher',
  'https://external-preview.redd.it/placeholder.jpg',
  '["computer-vision", "augmented-reality", "machine-learning", "research"]'::jsonb,
  'demo-user',
  NOW() - INTERVAL '20 hours',
  '{"subreddit": "r/MachineLearning", "upvotes": 4200, "comments": 256}'::jsonb
),
(
  'reddit:18abc456',
  'reddit',
  '18abc456',
  'https://reddit.com/r/webdev/comments/18abc456/show_supabase_nextjs_starter_with_auth/',
  '[Show] Supabase + Next.js starter template with authentication',
  'Built a production-ready starter template with Supabase auth, RLS policies, and Next.js 15. Includes email verification, password reset, and social login.',
  'Open source Next.js + Supabase template with complete authentication flow. Over 500 stars on GitHub!',
  'u/IndieHacker',
  'https://external-preview.redd.it/placeholder2.jpg',
  '["web-development", "nextjs", "supabase", "databases", "authentication"]'::jsonb,
  'demo-user',
  NOW() - INTERVAL '2 days',
  '{"subreddit": "r/webdev", "upvotes": 3100, "comments": 142}'::jsonb
)
ON CONFLICT (platform, platform_content_id) DO NOTHING;

\echo ''
\echo '✅ Demo content seeded successfully!'
\echo ''

-- Show what was added
SELECT 'content' as table_name, COUNT(*) as items_added FROM content WHERE user_id = 'demo-user'
UNION ALL
SELECT 'tagged_posts', COUNT(*) FROM tagged_posts WHERE user_id = 'demo-user';

\echo ''
