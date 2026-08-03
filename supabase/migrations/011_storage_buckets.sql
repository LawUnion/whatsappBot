-- Migration 007: Storage Buckets with Auto-Expiry
-- Creates storage buckets for file uploads with lifecycle policies

-- =====================================================
-- CREATE STORAGE BUCKETS
-- =====================================================

-- Bucket for temporary uploads (auto-delete after 3 days)
-- This is for daily notes, broadcasts, etc.
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'temp-uploads',
  'temp-uploads',
  true,
  10485760, -- 10MB limit
  ARRAY['application/pdf', 'image/jpeg', 'image/png', 'image/gif', 'image/webp']
) ON CONFLICT (id) DO UPDATE SET
  public = true,
  file_size_limit = 10485760,
  allowed_mime_types = ARRAY['application/pdf', 'image/jpeg', 'image/png', 'image/gif', 'image/webp'];

-- Bucket for permanent uploads (study materials, notices - no auto-delete)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'permanent-uploads',
  'permanent-uploads',
  true,
  52428800, -- 50MB limit for larger study materials
  ARRAY['application/pdf', 'image/jpeg', 'image/png', 'image/gif', 'image/webp', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document']
) ON CONFLICT (id) DO UPDATE SET
  public = true,
  file_size_limit = 52428800,
  allowed_mime_types = ARRAY['application/pdf', 'image/jpeg', 'image/png', 'image/gif', 'image/webp', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'];

-- =====================================================
-- RLS POLICIES FOR STORAGE
-- =====================================================

-- Allow authenticated users to upload to temp-uploads
CREATE POLICY "temp_uploads_insert" ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'temp-uploads' AND auth.role() = 'authenticated');

-- Allow public read access to temp-uploads
CREATE POLICY "temp_uploads_select" ON storage.objects FOR SELECT
  USING (bucket_id = 'temp-uploads');

-- Allow authenticated users to delete their own uploads
CREATE POLICY "temp_uploads_delete" ON storage.objects FOR DELETE
  USING (bucket_id = 'temp-uploads' AND auth.uid()::text = (storage.foldername(name))[1]);

-- Allow authenticated users to upload to permanent-uploads
CREATE POLICY "permanent_uploads_insert" ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'permanent-uploads' AND auth.role() = 'authenticated');

-- Allow public read access to permanent-uploads
CREATE POLICY "permanent_uploads_select" ON storage.objects FOR SELECT
  USING (bucket_id = 'permanent-uploads');

-- Allow authenticated users to delete from permanent-uploads
CREATE POLICY "permanent_uploads_delete" ON storage.objects FOR DELETE
  USING (bucket_id = 'permanent-uploads' AND auth.role() = 'authenticated');

-- =====================================================
-- AUTO-CLEANUP FUNCTION FOR TEMP UPLOADS
-- This function deletes files older than 3 days
-- Should be called by a cron job (pg_cron or external)
-- =====================================================

CREATE OR REPLACE FUNCTION cleanup_expired_temp_uploads()
RETURNS INTEGER AS $$
DECLARE
  deleted_count INTEGER := 0;
  expired_file RECORD;
BEGIN
  -- Find and delete files older than 3 days in temp-uploads bucket
  FOR expired_file IN
    SELECT name
    FROM storage.objects
    WHERE bucket_id = 'temp-uploads'
      AND created_at < NOW() - INTERVAL '3 days'
  LOOP
    -- Delete from storage
    DELETE FROM storage.objects
    WHERE bucket_id = 'temp-uploads' AND name = expired_file.name;

    deleted_count := deleted_count + 1;
  END LOOP;

  RETURN deleted_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- CRON JOB FOR AUTO-CLEANUP (if pg_cron is available)
-- Run daily at 3 AM to clean up expired temp files
-- =====================================================

-- Uncomment if pg_cron extension is enabled:
-- SELECT cron.schedule(
--   'cleanup-temp-uploads',
--   '0 3 * * *',
--   'SELECT cleanup_expired_temp_uploads();'
-- );

-- =====================================================
-- HELPER FUNCTION: Get file expiry status
-- =====================================================

CREATE OR REPLACE FUNCTION get_file_expiry_info(file_path TEXT)
RETURNS TABLE (
  created_at TIMESTAMPTZ,
  expires_at TIMESTAMPTZ,
  is_expired BOOLEAN,
  hours_remaining INTEGER
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    o.created_at,
    o.created_at + INTERVAL '3 days' AS expires_at,
    NOW() > (o.created_at + INTERVAL '3 days') AS is_expired,
    GREATEST(0, EXTRACT(EPOCH FROM ((o.created_at + INTERVAL '3 days') - NOW())) / 3600)::INTEGER AS hours_remaining
  FROM storage.objects o
  WHERE o.name = file_path AND o.bucket_id = 'temp-uploads';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
