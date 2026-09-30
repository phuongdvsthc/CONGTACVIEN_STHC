-- ==============================================================================
-- BƯỚC DB-A1: MIGRATION 002 (BẢN RÀ SOÁT HOÀN CHỈNH CUỐI CÙNG)
-- Dự án: Hệ thống Cộng tác viên Tuyển sinh Trường Saigontourist (STHC)
-- Mã file: /supabase/migrations/20260929000002_permissions_and_rls.sql
-- Mục đích: Thiết lập phân quyền SQL chi tiết và Row Level Security (RLS) an toàn tối đa:
--   1. HÀM get_auth_role():
--      - Owner: postgres (Bypass RLS khi truy vấn profiles nội bộ -> Không đệ quy).
--      - Cố định search_path = public, pg_temp (Chống tấn công search_path).
--      - REVOKE EXECUTE FROM PUBLIC, chỉ GRANT EXECUTE cho authenticated và service_role.
--   2. LOẠI BỎ CHÍNH SÁCH FOR ALL TRÊN CÁC BẢNG NGHIỆP VỤ:
--      - Toàn bộ thao tác ghi (INSERT, UPDATE, DELETE) bắt buộc đi qua Backend API (service_role).
--      - Staff/Admin chỉ có quyền SELECT trực tiếp để tra cứu dữ liệu.
--   3. BẢO MẬT AUDIT_LOGS:
--      - Chỉ tài khoản có vai trò 'admin' mới được phép đọc audit_logs.
--   4. THU HỒI TOÀN BỘ QUYỀN UPDATE/INSERT/DELETE từ authenticated trên toàn bộ 7 bảng.
-- ==============================================================================

-- ==============================================================================
-- 1. HÀM TRỢ NĂNG XÁC ĐỊNH VAI TRÒ NGƯỜI DÙNG (ANTI-RECURSION HELPER)
-- Cơ chế chống đệ quy:
--   - Hàm được gán OWNER là 'postgres' và khai báo 'SECURITY DEFINER'.
--   - Trong PostgreSQL & Supabase, role 'postgres' mặc định bypass Row Level Security.
--   - Khi hàm thực thi 'SELECT role FROM public.profiles', PostgreSQL chạy trực tiếp
--     trên heap mà không kích hoạt lại các policy RLS của profiles -> Triệt tiêu đệ quy vô hạn.
-- ==============================================================================
CREATE OR REPLACE FUNCTION public.get_auth_role()
RETURNS VARCHAR AS $$
DECLARE
    v_role VARCHAR;
BEGIN
    SELECT role INTO v_role 
    FROM public.profiles 
    WHERE id = auth.uid() AND is_active = TRUE;
    RETURN COALESCE(v_role, 'none');
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public, pg_temp;

-- Xác định rõ Owner của hàm là postgres (hoặc user quản trị CSDL)
ALTER FUNCTION public.get_auth_role() OWNER TO postgres;

-- Thu hồi quyền EXECUTE mặc định từ PUBLIC (chặn gọi trái phép từ các role không định danh)
REVOKE EXECUTE ON FUNCTION public.get_auth_role() FROM PUBLIC;

-- ==============================================================================
-- 2. THU HỒI TOÀN BỘ QUYỀN MẶC ĐỊNH TRÊN CÁC BẢNG (RESET PRIVILEGES)
-- ==============================================================================
REVOKE ALL ON TABLE public.profiles FROM anon, authenticated, public;
REVOKE ALL ON TABLE public.affiliate_profiles FROM anon, authenticated, public;
REVOKE ALL ON TABLE public.courses FROM anon, authenticated, public;
REVOKE ALL ON TABLE public.leads FROM anon, authenticated, public;
REVOKE ALL ON TABLE public.lead_reconciliations FROM anon, authenticated, public;
REVOKE ALL ON TABLE public.rewards FROM anon, authenticated, public;
REVOKE ALL ON TABLE public.audit_logs FROM anon, authenticated, public;

-- ==============================================================================
-- 3. CẤP QUYỀN TƯỜNG MINH CHO VAI TRÒ SERVICE_ROLE (Backend API Server)
-- Backend API là nơi duy nhất thực thi các thao tác ghi dữ liệu (DML).
-- Tuyệt đối không dùng 'ALL TABLES' hay 'ALL ROUTINES'.
-- ==============================================================================
GRANT USAGE ON SCHEMA public TO service_role;

GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.profiles TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.affiliate_profiles TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.courses TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.leads TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.lead_reconciliations TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.rewards TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.audit_logs TO service_role;

GRANT EXECUTE ON FUNCTION public.get_auth_role() TO service_role;

-- ==============================================================================
-- 4. CẤP QUYỀN TƯỜNG MINH CHO VAI TRÒ ANON (Khách chưa đăng nhập)
-- Khách chỉ được xem danh mục khóa học tuyển sinh công khai.
-- ==============================================================================
GRANT USAGE ON SCHEMA public TO anon;
GRANT SELECT ON TABLE public.courses TO anon;

-- ==============================================================================
-- 5. CẤP QUYỀN TƯỜNG MINH CHO VAI TRÒ AUTHENTICATED (Người dùng đã đăng nhập)
-- NGUYÊN TẮC QUYỀN TỐI THIỂU:
--   - TUYỆT ĐỐI KHÔNG CẤP UPDATE, INSERT, DELETE trên bất kỳ bảng nào cho authenticated.
--   - CHỈ CẤP QUYỀN 'SELECT' trên các bảng cần thiết. Việc hiển thị dòng nào sẽ do RLS kiểm soát.
-- ==============================================================================
GRANT USAGE ON SCHEMA public TO authenticated;

-- Quyền đọc thông tin danh mục và tài khoản
GRANT SELECT ON TABLE public.courses TO authenticated;
GRANT SELECT ON TABLE public.profiles TO authenticated;
GRANT SELECT ON TABLE public.affiliate_profiles TO authenticated;

-- Quyền đọc bảng nghiệp vụ (RLS bên dưới sẽ chặn CTV, chỉ cho Staff/Admin đọc)
GRANT SELECT ON TABLE public.leads TO authenticated;
GRANT SELECT ON TABLE public.lead_reconciliations TO authenticated;
GRANT SELECT ON TABLE public.rewards TO authenticated;
GRANT SELECT ON TABLE public.audit_logs TO authenticated;

-- Quyền thực thi hàm lấy role
GRANT EXECUTE ON FUNCTION public.get_auth_role() TO authenticated;

-- ==============================================================================
-- 6. KÍCH HOẠT ROW LEVEL SECURITY (RLS) TRÊN 100% CÁC BẢNG
-- ==============================================================================
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.affiliate_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.courses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.leads ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lead_reconciliations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.rewards ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

-- ==============================================================================
-- 7. CHÍNH SÁCH RLS CHO BẢNG COURSES (Danh mục khóa học)
-- ==============================================================================
CREATE POLICY "Public read active courses"
ON public.courses
FOR SELECT
TO anon, authenticated
USING (is_active = TRUE);

CREATE POLICY "Admin read all courses"
ON public.courses
FOR SELECT
TO authenticated
USING (public.get_auth_role() = 'admin');

-- ==============================================================================
-- 8. CHÍNH SÁCH RLS CHO BẢNG PROFILES (Hồ sơ người dùng - KHÔNG ĐỆ QUY)
-- ==============================================================================
CREATE POLICY "Profiles select policy"
ON public.profiles
FOR SELECT
TO authenticated
USING (
    -- Người dùng đọc hồ sơ của chính mình:
    id = auth.uid()
    OR
    -- Staff và Admin đọc toàn bộ danh sách profiles:
    public.get_auth_role() IN ('staff', 'admin')
);

-- ==============================================================================
-- 9. CHÍNH SÁCH RLS CHO BẢNG AFFILIATE_PROFILES (Hồ sơ CTV)
-- ==============================================================================
CREATE POLICY "Affiliate profiles select policy"
ON public.affiliate_profiles
FOR SELECT
TO authenticated
USING (
    -- CTV đọc hồ sơ của chính mình:
    user_id = auth.uid()
    OR
    -- Staff và Admin đọc tất cả hồ sơ CTV:
    public.get_auth_role() IN ('staff', 'admin')
);

-- ==============================================================================
-- 10. CHÍNH SÁCH RLS CHO CÁC BẢNG NGHIỆP VỤ (CHỈ CẤP SELECT CHO STAFF/ADMIN)
-- Đã loại bỏ chính sách FOR ALL. Không ai có quyền ghi trực tiếp qua PostgREST client.
-- CTV truy vấn trực tiếp các bảng này sẽ nhận 0 dòng (empty set).
-- ==============================================================================

-- Bảng LEADS: Chỉ Staff & Admin được đọc
CREATE POLICY "Staff and admin select leads"
ON public.leads
FOR SELECT
TO authenticated
USING (public.get_auth_role() IN ('staff', 'admin'));

-- Bảng LEAD_RECONCILIATIONS: Chỉ Staff & Admin được đọc
CREATE POLICY "Staff and admin select reconciliations"
ON public.lead_reconciliations
FOR SELECT
TO authenticated
USING (public.get_auth_role() IN ('staff', 'admin'));

-- Bảng REWARDS: Chỉ Staff & Admin được đọc
CREATE POLICY "Staff and admin select rewards"
ON public.rewards
FOR SELECT
TO authenticated
USING (public.get_auth_role() IN ('staff', 'admin'));

-- ==============================================================================
-- 11. CHÍNH SÁCH RLS CHO BẢNG AUDIT_LOGS (CHỈ ADMIN ĐƯỢC ĐỌC)
-- Cán bộ tuyển sinh (Staff) và CTV tuyệt đối không được đọc nhật ký kiểm toán hệ thống.
-- ==============================================================================
CREATE POLICY "Admin only select audit_logs"
ON public.audit_logs
FOR SELECT
TO authenticated
USING (public.get_auth_role() = 'admin');
