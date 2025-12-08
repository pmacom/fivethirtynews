-- Migration: Allow multiple notes per user per content
-- Date: 2024-12-08
-- Description: Removes the unique constraint to allow users to post multiple notes (chat-style)

-- Drop the unique constraint on (content_id, user_id)
ALTER TABLE content_notes DROP CONSTRAINT IF EXISTS content_notes_content_id_user_id_key;

-- Update comment to reflect new behavior
COMMENT ON TABLE content_notes IS 'User notes/comments attached to content items - multiple notes per user allowed (chat-style)';
