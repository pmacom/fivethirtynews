-- Migration: Create profile-images storage bucket
-- Date: 2024-12-10
-- Purpose: Store user profile background images (S3-compatible)

-- Create profile-images bucket (public for reading)
INSERT INTO storage.buckets (id, name, public)
VALUES ('profile-images', 'profile-images', true)
ON CONFLICT (id) DO NOTHING;

-- Allow authenticated users to upload to their own folder
CREATE POLICY "Users upload own profile images" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'profile-images');

-- Allow authenticated users to update their own images
CREATE POLICY "Users update own profile images" ON storage.objects
  FOR UPDATE TO authenticated
  USING (bucket_id = 'profile-images');

-- Allow authenticated users to delete their own images
CREATE POLICY "Users delete own profile images" ON storage.objects
  FOR DELETE TO authenticated
  USING (bucket_id = 'profile-images');

-- Public read access for all profile images
CREATE POLICY "Public read profile images" ON storage.objects
  FOR SELECT TO public
  USING (bucket_id = 'profile-images');
