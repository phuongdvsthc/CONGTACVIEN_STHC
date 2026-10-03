-- ==============================================================================
-- MIGRATION: Bổ sung trường "Link đăng ký học trên cổng tuyển sinh" (official_registration_url)
-- Mã file: /supabase/migrations/20261002000002_add_official_registration_url_to_courses.sql
-- ==============================================================================

ALTER TABLE public.courses 
ADD COLUMN IF NOT EXISTS official_registration_url TEXT DEFAULT NULL;

COMMENT ON COLUMN public.courses.official_registration_url IS 'Đường dẫn form hồ sơ đăng ký học chính thức trên cổng tuyển sinh cho từng khóa học.';
