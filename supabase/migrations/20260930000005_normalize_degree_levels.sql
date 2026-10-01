-- ==============================================================================
-- MIGRATION 005: Chuẩn hóa hệ đào tạo về 3 lựa chọn (Trung cấp, Ngắn hạn, Chuyên đề)
-- Dự án: Hệ thống Cộng tác viên Tuyển sinh Trường Saigontourist (STHC)
-- Mã file: /supabase/migrations/20260930000005_normalize_degree_levels.sql
-- ==============================================================================

UPDATE public.courses
SET degree_level = 'Trung cấp'
WHERE degree_level ILIKE '%Trung cấp%' OR degree_level ILIKE '%TC%';

UPDATE public.courses
SET degree_level = 'Ngắn hạn'
WHERE degree_level ILIKE '%Sơ cấp%' 
   OR degree_level ILIKE '%Ngắn hạn%' 
   OR degree_level ILIKE '%SC%'
   OR degree_level ILIKE '%Tháng%';

UPDATE public.courses
SET degree_level = 'Chuyên đề'
WHERE degree_level NOT IN ('Trung cấp', 'Ngắn hạn', 'Chuyên đề');
