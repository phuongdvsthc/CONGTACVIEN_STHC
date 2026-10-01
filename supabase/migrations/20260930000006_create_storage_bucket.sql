-- ==============================================================================
-- MIGRATION 006: Tạo Storage Bucket cho Ảnh Khóa học (course-thumbnails)
-- Dự án: Hệ thống Cộng tác viên Tuyển sinh Trường Saigontourist (STHC)
-- Mã file: /supabase/migrations/20260930000006_create_storage_bucket.sql
-- ==============================================================================

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
    'course-thumbnails',
    'course-thumbnails',
    TRUE,
    5242880, -- 5 MB limit
    ARRAY['image/jpeg', 'image/png', 'image/webp']
)
ON CONFLICT (id) DO UPDATE
SET public = TRUE,
    file_size_limit = 5242880,
    allowed_mime_types = ARRAY['image/jpeg', 'image/png', 'image/webp'];

-- Storage policy: Public read access
DROP POLICY IF EXISTS "Public Access Course Thumbnails" ON storage.objects;
CREATE POLICY "Public Access Course Thumbnails"
ON storage.objects FOR SELECT
USING (bucket_id = 'course-thumbnails');

-- Storage policy: Admin/Service role write access
DROP POLICY IF EXISTS "Admin Insert Course Thumbnails" ON storage.objects;
CREATE POLICY "Admin Insert Course Thumbnails"
ON storage.objects FOR INSERT
TO service_role, authenticated
WITH CHECK (bucket_id = 'course-thumbnails');

DROP POLICY IF EXISTS "Admin Update Course Thumbnails" ON storage.objects;
CREATE POLICY "Admin Update Course Thumbnails"
ON storage.objects FOR UPDATE
TO service_role, authenticated
USING (bucket_id = 'course-thumbnails');

DROP POLICY IF EXISTS "Admin Delete Course Thumbnails" ON storage.objects;
CREATE POLICY "Admin Delete Course Thumbnails"
ON storage.objects FOR DELETE
TO service_role, authenticated
USING (bucket_id = 'course-thumbnails');
