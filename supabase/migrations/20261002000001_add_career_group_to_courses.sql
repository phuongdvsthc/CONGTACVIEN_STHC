-- ==============================================================================
-- MIGRATION: Bổ sung trường "Nhóm nghề" (career_group) vào bảng public.courses
-- Mã file: /supabase/migrations/20261002000001_add_career_group_to_courses.sql
-- ==============================================================================

ALTER TABLE public.courses 
ADD COLUMN IF NOT EXISTS career_group VARCHAR(100) DEFAULT NULL;

-- Ràng buộc kiểm tra giá trị nằm trong 5 nhóm nghề chuẩn hoặc NULL
ALTER TABLE public.courses
ADD CONSTRAINT chk_career_group_valid 
CHECK (career_group IS NULL OR career_group IN ('Làm bánh', 'Nấu ăn', 'Nhà hàng', 'Khách sạn', 'Pha chế'));
