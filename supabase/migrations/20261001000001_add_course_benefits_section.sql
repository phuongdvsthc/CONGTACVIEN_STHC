-- ==============================================================================
-- Migration: Add customizable benefits section to courses table (A2.3 adjustment)
-- Module: Quản lý khóa học
-- Description: Cho phép quản trị viên tùy biến tiêu đề và nội dung section quyền lợi / đặc quyền sinh viên theo từng khóa học
-- ==============================================================================

ALTER TABLE public.courses
ADD COLUMN IF NOT EXISTS benefits_title VARCHAR(255) DEFAULT NULL;

ALTER TABLE public.courses
ADD COLUMN IF NOT EXISTS benefits_content TEXT DEFAULT NULL;

COMMENT ON COLUMN public.courses.benefits_title IS 'Tiêu đề section đặc quyền sinh viên (VD: Đặc quyền sinh viên Trường Saigontourist)';
COMMENT ON COLUMN public.courses.benefits_content IS 'Nội dung chi tiết section đặc quyền sinh viên (văn bản nhiều dòng hoặc HTML cơ bản)';
