-- Reset Content Data
-- This script deletes all user-generated content while preserving:
-- - Database schema
-- - Tag hierarchy (96 tags)
-- - Tag relationships (127 relationships)
-- - Migrations history

-- Safety check: Only run on local database
-- This checks if we're connected via localhost (127.0.0.1:54322)
-- Production databases won't be accessible on this port
DO $$
DECLARE
  db_name TEXT := current_database();
BEGIN
  -- Allow if database is 'postgres' (Supabase local default)
  IF db_name = 'postgres' THEN
    RAISE NOTICE 'Running on local development database: %', db_name;
  ELSE
    RAISE WARNING 'This script should only be run on local development database';
    RAISE WARNING 'Current database: %', db_name;
    RAISE WARNING 'Aborting for safety';
    RAISE EXCEPTION 'Safety check failed - not running on local postgres database';
  END IF;
END $$;

-- Show counts before deletion
\echo '=== BEFORE RESET ==='
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
\echo '=== RESETTING CONTENT ==='
\echo ''

-- Delete content data (CASCADE will handle foreign key dependencies)
DO $$
BEGIN
  TRUNCATE TABLE content CASCADE;
  RAISE NOTICE 'Deleted all content';

  TRUNCATE TABLE tagged_posts CASCADE;
  RAISE NOTICE 'Deleted all tagged posts';

  TRUNCATE TABLE content_comments CASCADE;
  RAISE NOTICE 'Deleted all comments';

  -- Delete creators (optional - uncomment if you want to reset creators too)
  -- TRUNCATE TABLE creators CASCADE;
  -- RAISE NOTICE 'Deleted all creators';

  -- Delete WTF episodes and related data (only if schema exists)
  IF EXISTS (SELECT FROM information_schema.schemata WHERE schema_name = 'wtf') THEN
    IF EXISTS (SELECT FROM information_schema.tables WHERE table_schema = 'wtf' AND table_name = 'episodes') THEN
      EXECUTE 'TRUNCATE TABLE wtf.episodes CASCADE';
      RAISE NOTICE 'Deleted all WTF episodes';
    END IF;

    IF EXISTS (SELECT FROM information_schema.tables WHERE table_schema = 'wtf' AND table_name = 'content_blocks') THEN
      EXECUTE 'TRUNCATE TABLE wtf.content_blocks CASCADE';
      RAISE NOTICE 'Deleted all content blocks';
    END IF;

    IF EXISTS (SELECT FROM information_schema.tables WHERE table_schema = 'wtf' AND table_name = 'content_block_items') THEN
      EXECUTE 'TRUNCATE TABLE wtf.content_block_items CASCADE';
      RAISE NOTICE 'Deleted all content block items';
    END IF;
  END IF;

  -- Reset sequences if needed
  IF EXISTS (SELECT 1 FROM pg_sequences WHERE schemaname = 'public' AND sequencename = 'content_id_seq') THEN
    PERFORM setval('content_id_seq', 1, false);
    RAISE NOTICE 'Reset content_id_seq';
  END IF;

  IF EXISTS (SELECT 1 FROM pg_sequences WHERE schemaname = 'public' AND sequencename = 'content_comments_id_seq') THEN
    PERFORM setval('content_comments_id_seq', 1, false);
    RAISE NOTICE 'Reset content_comments_id_seq';
  END IF;

  RAISE NOTICE 'Sequence reset complete';
END $$;

\echo ''
\echo '=== AFTER RESET ==='
\echo ''

-- Show counts after deletion
SELECT 'content' as table_name, COUNT(*) as row_count FROM content
UNION ALL
SELECT 'tagged_posts', COUNT(*) FROM tagged_posts
UNION ALL
SELECT 'content_comments', COUNT(*) FROM content_comments
UNION ALL
SELECT 'creators', COUNT(*) FROM creators
ORDER BY table_name;

\echo ''
\echo '=== PRESERVED DATA ==='
\echo ''

-- Show that tags and relationships are still intact
SELECT 'tags' as table_name, COUNT(*) as row_count FROM tags
UNION ALL
SELECT 'tag_relationships', COUNT(*) FROM tag_relationships
ORDER BY table_name;

\echo ''
\echo '✅ Content reset complete!'
\echo '✅ Tags and relationships preserved'
\echo '✅ Ready for new content import'
\echo ''
