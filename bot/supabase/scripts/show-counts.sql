-- Show Table Counts
-- Quick utility to display row counts for all tables

\echo '=== CONTENT TABLES ==='
\echo ''

SELECT 'content' as table_name, COUNT(*) as row_count FROM content
UNION ALL
SELECT 'tagged_posts', COUNT(*) FROM tagged_posts
UNION ALL
SELECT 'content_comments', COUNT(*) FROM content_comments
UNION ALL
SELECT 'creators', COUNT(*) FROM creators
ORDER BY table_name;

\echo ''
\echo '=== WTF SCHEMA ==='
\echo ''

DO $$
BEGIN
  IF EXISTS (SELECT FROM information_schema.tables WHERE table_schema = 'wtf' AND table_name = 'episodes') THEN
    RAISE NOTICE 'WTF schema tables exist';
    PERFORM COUNT(*) FROM wtf.episodes;
    PERFORM COUNT(*) FROM wtf.content_blocks;
    PERFORM COUNT(*) FROM wtf.content_block_items;
  ELSE
    RAISE NOTICE 'WTF schema tables not yet created';
  END IF;
END $$;

\echo ''
\echo '=== TAG SYSTEM ==='
\echo ''

SELECT 'tags' as table_name, COUNT(*) as row_count FROM tags
UNION ALL
SELECT 'tag_relationships', COUNT(*) FROM tag_relationships
ORDER BY table_name;

\echo ''
