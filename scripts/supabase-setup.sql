-- ============================================
-- TenderTalks Supabase Storage Setup
-- Database: Neon PostgreSQL (separate)
-- Supabase: Auth + Storage ONLY
-- Run this in Supabase SQL Editor
-- ============================================

-- ============================================
-- 1. CREATE STORAGE BUCKETS
-- ============================================

-- Podcasts bucket (for audio/video files - PRIVATE)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'podcasts',
  'podcasts',
  false,
  524288000, -- 500MB limit
  ARRAY['audio/mpeg', 'audio/mp3', 'audio/wav', 'audio/ogg', 'audio/m4a', 'video/mp4', 'video/webm', 'video/quicktime']
)
ON CONFLICT (id) DO UPDATE SET
  file_size_limit = EXCLUDED.file_size_limit,
  allowed_mime_types = EXCLUDED.allowed_mime_types;

-- Thumbnails bucket (for podcast cover images - PUBLIC)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'thumbnails',
  'thumbnails',
  true,
  5242880, -- 5MB limit
  ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'image/svg+xml']
)
ON CONFLICT (id) DO UPDATE SET
  public = true,
  file_size_limit = EXCLUDED.file_size_limit,
  allowed_mime_types = EXCLUDED.allowed_mime_types;

-- Merch images bucket (PUBLIC)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'merch',
  'merch',
  true,
  10485760, -- 10MB limit
  ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/gif']
)
ON CONFLICT (id) DO UPDATE SET
  public = true,
  file_size_limit = EXCLUDED.file_size_limit,
  allowed_mime_types = EXCLUDED.allowed_mime_types;

-- User avatars bucket (PUBLIC)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'avatars',
  'avatars',
  true,
  2097152, -- 2MB limit
  ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/gif']
)
ON CONFLICT (id) DO UPDATE SET
  public = true,
  file_size_limit = EXCLUDED.file_size_limit,
  allowed_mime_types = EXCLUDED.allowed_mime_types;

-- ============================================
-- 2. STORAGE POLICIES - PODCASTS (Private)
-- Note: Admin check done via app logic since 
-- users table is in Neon, not Supabase
-- ============================================

-- Drop existing policies first
DROP POLICY IF EXISTS "Admins can upload podcasts" ON storage.objects;
DROP POLICY IF EXISTS "Admins can update podcasts" ON storage.objects;
DROP POLICY IF EXISTS "Admins can delete podcasts" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can view podcasts" ON storage.objects;
DROP POLICY IF EXISTS "Auth users can manage podcasts" ON storage.objects;

-- Authenticated users can upload podcast files
-- (Admin role verification happens in the API layer via Neon DB)
CREATE POLICY "Auth users can manage podcasts"
ON storage.objects FOR ALL
TO authenticated
USING (bucket_id = 'podcasts')
WITH CHECK (bucket_id = 'podcasts');

-- ============================================
-- 3. STORAGE POLICIES - THUMBNAILS (Public)
-- ============================================

DROP POLICY IF EXISTS "Anyone can view thumbnails" ON storage.objects;
DROP POLICY IF EXISTS "Admins can upload thumbnails" ON storage.objects;
DROP POLICY IF EXISTS "Admins can update thumbnails" ON storage.objects;
DROP POLICY IF EXISTS "Admins can delete thumbnails" ON storage.objects;
DROP POLICY IF EXISTS "Auth users can manage thumbnails" ON storage.objects;

-- Anyone can view thumbnails (public bucket)
CREATE POLICY "Anyone can view thumbnails"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'thumbnails');

-- Authenticated users can manage thumbnails
-- (Admin verification in API layer)
CREATE POLICY "Auth users can manage thumbnails"
ON storage.objects FOR ALL
TO authenticated
USING (bucket_id = 'thumbnails')
WITH CHECK (bucket_id = 'thumbnails');

-- ============================================
-- 4. STORAGE POLICIES - MERCH (Public)
-- ============================================

DROP POLICY IF EXISTS "Anyone can view merch images" ON storage.objects;
DROP POLICY IF EXISTS "Admins can upload merch images" ON storage.objects;
DROP POLICY IF EXISTS "Admins can update merch images" ON storage.objects;
DROP POLICY IF EXISTS "Admins can delete merch images" ON storage.objects;
DROP POLICY IF EXISTS "Auth users can manage merch" ON storage.objects;

-- Anyone can view merch images
CREATE POLICY "Anyone can view merch images"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'merch');

-- Authenticated users can manage merch images
CREATE POLICY "Auth users can manage merch"
ON storage.objects FOR ALL
TO authenticated
USING (bucket_id = 'merch')
WITH CHECK (bucket_id = 'merch');

-- ============================================
-- 5. STORAGE POLICIES - AVATARS (User-owned)
-- ============================================

DROP POLICY IF EXISTS "Anyone can view avatars" ON storage.objects;
DROP POLICY IF EXISTS "Users can upload own avatar" ON storage.objects;
DROP POLICY IF EXISTS "Users can update own avatar" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete own avatar" ON storage.objects;
DROP POLICY IF EXISTS "Users can manage own avatar" ON storage.objects;

-- Anyone can view avatars
CREATE POLICY "Anyone can view avatars"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'avatars');

-- Users can manage their own avatar (path must be user_id/filename)
CREATE POLICY "Users can manage own avatar"
ON storage.objects FOR ALL
TO authenticated
USING (
  bucket_id = 'avatars' AND
  (storage.foldername(name))[1] = auth.uid()::text
)
WITH CHECK (
  bucket_id = 'avatars' AND
  (storage.foldername(name))[1] = auth.uid()::text
);

-- ============================================
-- 6. VERIFY SETUP
-- ============================================

-- Check buckets created
SELECT id, name, public, file_size_limit, allowed_mime_types 
FROM storage.buckets 
WHERE id IN ('podcasts', 'thumbnails', 'merch', 'avatars');

-- Check policies created
SELECT policyname, permissive, roles, cmd
FROM pg_policies 
WHERE tablename = 'objects' AND schemaname = 'storage'
ORDER BY policyname;
