-- ==============================================================================
-- MIGRATION 004 (P4): Tạo Storage Bucket cho Avatar cá nhân (avatars)
-- Dự án: Hệ thống Cộng tác viên Tuyển sinh Trường Saigontourist (STHC)
-- Mã file: /supabase/migrations/20261001000004_create_avatars_bucket.sql
-- ==============================================================================

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
    'avatars',
    'avatars',
    TRUE,
    5242880, -- 5 MB limit
    ARRAY['image/jpeg', 'image/png', 'image/webp']
)
ON CONFLICT (id) DO UPDATE
SET public = TRUE,
    file_size_limit = 5242880,
    allowed_mime_types = ARRAY['image/jpeg', 'image/png', 'image/webp'];

-- Storage policy: Public read access
DROP POLICY IF EXISTS "Public Access Avatars" ON storage.objects;
CREATE POLICY "Public Access Avatars"
ON storage.objects FOR SELECT
USING (bucket_id = 'avatars');

-- Storage policy: Authenticated insert / update / delete access
DROP POLICY IF EXISTS "Authenticated Insert Avatars" ON storage.objects;
CREATE POLICY "Authenticated Insert Avatars"
ON storage.objects FOR INSERT
TO service_role, authenticated
WITH CHECK (bucket_id = 'avatars');

DROP POLICY IF EXISTS "Authenticated Update Avatars" ON storage.objects;
CREATE POLICY "Authenticated Update Avatars"
ON storage.objects FOR UPDATE
TO service_role, authenticated
USING (bucket_id = 'avatars');

DROP POLICY IF EXISTS "Authenticated Delete Avatars" ON storage.objects;
CREATE POLICY "Authenticated Delete Avatars"
ON storage.objects FOR DELETE
TO service_role, authenticated
USING (bucket_id = 'avatars');
