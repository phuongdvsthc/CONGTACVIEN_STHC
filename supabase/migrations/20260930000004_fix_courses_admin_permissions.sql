-- ==============================================================================
-- MIGRATION 004: Đảm bảo quyền quản trị bảng courses cho Backend Service Role
-- Dự án: Hệ thống Cộng tác viên Tuyển sinh Trường Saigontourist (STHC)
-- Mã file: /supabase/migrations/20260930000004_fix_courses_admin_permissions.sql
-- ==============================================================================

-- 1. Đảm bảo service_role có đầy đủ quyền thao tác DML trên bảng courses
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.courses TO service_role;

-- 2. Đảm bảo anon và authenticated chỉ có quyền SELECT (không cấp quyền ghi trực tiếp)
GRANT SELECT ON TABLE public.courses TO anon;
GRANT SELECT ON TABLE public.courses TO authenticated;

-- 3. Đảm bảo RLS được bật trên bảng courses
ALTER TABLE public.courses ENABLE ROW LEVEL SECURITY;

-- 4. Xác nhận các policy đọc công khai và admin/staff
DROP POLICY IF EXISTS "Public read active courses" ON public.courses;
CREATE POLICY "Public read active courses"
ON public.courses
FOR SELECT
TO anon, authenticated
USING (is_active = TRUE);

DROP POLICY IF EXISTS "Admin and Staff read all courses" ON public.courses;
CREATE POLICY "Admin and Staff read all courses"
ON public.courses
FOR SELECT
TO authenticated
USING (public.get_auth_role() IN ('staff', 'admin'));
