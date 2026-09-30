-- ==============================================================================
-- KỊCH BẢN HOÀN CHỈNH: BOOTSTRAP ADMIN DÀNH CHO SUPABASE SQL EDITOR
-- Dự án: Hệ thống Cộng tác viên Tuyển sinh Trường Saigontourist (STHC)
-- File: /supabase/tests/004_bootstrap_target_admin_editor.sql
-- ==============================================================================
-- Hướng dẫn:
--   Dán toàn bộ file này vào tab SQL Editor trên Supabase Dashboard và nhấn RUN.
--   Kịch bản hoàn toàn tự chứa (self-contained), an toàn, idempotent và không phụ thuộc dữ liệu mẫu:
--     1. Cập nhật trigger trên affiliate_profiles hỗ trợ phiên quản trị (bypass khi app.is_admin_bootstrap = on).
--     2. Cập nhật hàm admin_bootstrap_user cho phép bootstrap email chỉ định.
--     3. Khối DO $$ tiền kiểm (Pre-flight check): Báo rõ UID/email và kiểm tra ma trận phân quyền CTV.
--     4. Câu lệnh SELECT cuối: Thực thi nâng quyền, ghi audit_logs và trả về đúng (id, email, role, is_active).
-- ==============================================================================

-- ------------------------------------------------------------------------------
-- 1. CẬP NHẬT TRIGGER TRÊN BẢNG AFFILIATE_PROFILES (HỖ TRỢ PHIÊN QUẢN TRỊ BOOTSTRAP)
-- ------------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.prevent_affiliate_privilege_escalation()
RETURNS TRIGGER AS $$
DECLARE
    caller_role VARCHAR(30);
BEGIN
    -- 1. Cho phép DBA, Supabase admin, service_role hoặc phiên bootstrap admin nội bộ
    IF current_user IN ('postgres', 'supabase_admin', 'service_role')
       OR current_setting('request.jwt.claim.role', true) = 'service_role'
       OR current_setting('app.is_admin_bootstrap', true) = 'on' THEN
        RETURN NEW;
    END IF;

    -- 2. Đối với người dùng thông thường (kết nối qua PostgREST với role 'authenticated'):
    caller_role := public.get_auth_role();

    IF caller_role NOT IN ('staff', 'admin') THEN
        IF NEW.status IS DISTINCT FROM OLD.status THEN
            RAISE EXCEPTION 'Bị từ chối: Cộng tác viên không được phép tự duyệt hoặc đổi trạng thái hồ sơ (status).'
                USING ERRCODE = '42501';
        END IF;

        IF NEW.affiliate_code IS DISTINCT FROM OLD.affiliate_code THEN
            RAISE EXCEPTION 'Bị từ chối: Không được phép thay đổi mã CTV (affiliate_code) đã cấp.'
                USING ERRCODE = '42501';
        END IF;

        IF NEW.reviewed_by IS DISTINCT FROM OLD.reviewed_by 
           OR NEW.reviewed_at IS DISTINCT FROM OLD.reviewed_at 
           OR NEW.review_note IS DISTINCT FROM OLD.review_note THEN
            RAISE EXCEPTION 'Bị từ chối: Bạn không có quyền can thiệp vào các trường phê duyệt hồ sơ.'
                USING ERRCODE = '42501';
        END IF;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp;

ALTER FUNCTION public.prevent_affiliate_privilege_escalation() OWNER TO postgres;
REVOKE EXECUTE ON FUNCTION public.prevent_affiliate_privilege_escalation() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.prevent_affiliate_privilege_escalation() TO authenticated, service_role, postgres, supabase_admin;

-- ------------------------------------------------------------------------------
-- 2. CẬP NHẬT HÀM ADMIN_BOOTSTRAP_USER (CHO PHÉP BOOTSTRAP EMAIL ĐƯỢC CHỈ ĐỊNH)
-- ------------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.admin_bootstrap_user(
    p_target_user_id UUID,
    p_expected_email TEXT,
    p_reason TEXT DEFAULT 'Khởi tạo Quản trị viên hệ thống qua Controlled Bootstrap'
)
RETURNS TABLE (
    id UUID,
    email VARCHAR,
    role VARCHAR,
    is_active BOOLEAN
) AS $$
DECLARE
    v_actual_email VARCHAR(255);
    v_current_role VARCHAR(30);
    v_current_active BOOLEAN;
    v_clean_email TEXT;
BEGIN
    v_clean_email := LOWER(TRIM(p_expected_email));

    IF v_clean_email IS NULL OR v_clean_email = '' THEN
        RAISE EXCEPTION 'Email dự kiến không được để trống.'
            USING ERRCODE = '22023';
    END IF;

    -- Kiểm tra tài khoản có tồn tại trong public.profiles không
    SELECT p.email, p.role, p.is_active
    INTO v_actual_email, v_current_role, v_current_active
    FROM public.profiles p
    WHERE p.id = p_target_user_id;

    -- Nếu chưa có trong profiles nhưng đã có trong auth.users thì tự động bù hồ sơ
    IF v_actual_email IS NULL THEN
        IF EXISTS (SELECT 1 FROM auth.users u WHERE u.id = p_target_user_id) THEN
            PERFORM public.sync_missing_auth_profiles();
            SELECT p.email, p.role, p.is_active
            INTO v_actual_email, v_current_role, v_current_active
            FROM public.profiles p
            WHERE p.id = p_target_user_id;
        END IF;

        IF v_actual_email IS NULL THEN
            RAISE EXCEPTION 'Không tìm thấy hồ sơ người dùng với UID: %', p_target_user_id
                USING ERRCODE = 'P0002';
        END IF;
    END IF;

    -- Xác thực đối chiếu nghiêm ngặt: UID chỉ định phải thuộc đúng email dự kiến
    IF LOWER(TRIM(v_actual_email)) <> v_clean_email THEN
        RAISE EXCEPTION 'Xác thực thất bại: UID % gắn với email "%", không khớp với email dự kiến "%". Thao tác bị hủy để chống nhầm lẫn tài khoản.',
            p_target_user_id, v_actual_email, p_expected_email
            USING ERRCODE = '22023';
    END IF;

    -- Kiểm tra tính Idempotent: Nếu đã là Admin đang hoạt động thì trả về kết quả ngay
    IF v_current_role = 'admin' AND v_current_active = TRUE THEN
        RETURN QUERY
        SELECT p.id, p.email, p.role, p.is_active
        FROM public.profiles p
        WHERE p.id = p_target_user_id;
        RETURN;
    END IF;

    -- Bật cờ phiên nội bộ để các trigger cho phép cập nhật trong phiên quản trị này
    PERFORM set_config('app.is_admin_bootstrap', 'on', true);

    -- Cập nhật bảng profiles
    UPDATE public.profiles p
    SET role = 'admin',
        is_active = TRUE,
        updated_at = NOW()
    WHERE p.id = p_target_user_id;

    -- Cập nhật duyệt hồ sơ CTV tương ứng (nếu có)
    UPDATE public.affiliate_profiles ap
    SET status = 'ACTIVE',
        reviewed_at = NOW(),
        review_note = p_reason,
        updated_at = NOW()
    WHERE ap.user_id = p_target_user_id;

    -- Ghi nhật ký kiểm toán vào audit_logs
    INSERT INTO public.audit_logs (
        actor_id,
        action,
        entity_name,
        entity_id,
        old_values,
        new_values,
        reason
    ) VALUES (
        p_target_user_id,
        'ADMIN_BOOTSTRAP_PROMOTED',
        'profiles',
        p_target_user_id,
        jsonb_build_object('role', v_current_role, 'is_active', v_current_active),
        jsonb_build_object('role', 'admin', 'is_active', true),
        p_reason
    );

    -- Tắt cờ phiên nội bộ
    PERFORM set_config('app.is_admin_bootstrap', 'off', true);

    -- Trả về đúng 4 trường: id, email, role, is_active
    RETURN QUERY
    SELECT p.id, p.email, p.role, p.is_active
    FROM public.profiles p
    WHERE p.id = p_target_user_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp;

ALTER FUNCTION public.admin_bootstrap_user(UUID, TEXT, TEXT) OWNER TO postgres;
REVOKE EXECUTE ON FUNCTION public.admin_bootstrap_user(UUID, TEXT, TEXT) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.admin_bootstrap_user(UUID, TEXT, TEXT) TO service_role, postgres, supabase_admin;

-- ------------------------------------------------------------------------------
-- 3. KHỐI TIỀN KIỂM (PRE-FLIGHT CHECK) & XÁC MINH BẢO MẬT PHÂN QUYỀN
-- ------------------------------------------------------------------------------
DO $$
DECLARE
    v_target_id UUID := '879a11fc-ff89-4019-b2f4-57d7843b631b'::uuid;
    v_target_email TEXT;
    v_target_role TEXT;
    v_target_active BOOLEAN;
    v_has_profile_update BOOLEAN;
    v_has_affiliate_update BOOLEAN;
    v_has_bootstrap_exec BOOLEAN;
BEGIN
    -- Lấy thông tin tài khoản đích
    SELECT email, role, is_active 
    INTO v_target_email, v_target_role, v_target_active
    FROM public.profiles 
    WHERE id = v_target_id;

    IF v_target_email IS NULL THEN
        SELECT email INTO v_target_email FROM auth.users WHERE id = v_target_id;
        v_target_role := 'chưa đồng bộ profiles (sẽ tự động đồng bộ)';
        v_target_active := FALSE;
    END IF;

    RAISE NOTICE '================================================================================';
    RAISE NOTICE ' [1/3] THÔNG TIN TÀI KHOẢN SẼ ĐƯỢC NÂNG QUYỀN ADMIN (PRE-FLIGHT):';
    RAISE NOTICE '   - Target UID      : %', v_target_id;
    RAISE NOTICE '   - Target Email    : %', COALESCE(v_target_email, 'Không tìm thấy!');
    RAISE NOTICE '   - Vai trò hiện tại: %', COALESCE(v_target_role, 'Chưa xác định');
    RAISE NOTICE '   - Trạng thái      : %', CASE WHEN v_target_active THEN 'Đang hoạt động' ELSE 'Chưa kích hoạt' END;
    RAISE NOTICE '================================================================================';

    -- Kiểm tra ma trận phân quyền: Đảm bảo role 'authenticated' (CTV kết nối qua PostgREST/JWT)
    -- TUYỆT ĐỐI KHÔNG có quyền UPDATE profiles hay affiliate_profiles, và KHÔNG được gọi hàm bootstrap
    v_has_profile_update := has_table_privilege('authenticated', 'public.profiles', 'UPDATE');
    v_has_affiliate_update := has_table_privilege('authenticated', 'public.affiliate_profiles', 'UPDATE');
    v_has_bootstrap_exec := has_function_privilege('authenticated', 'public.admin_bootstrap_user(uuid, text, text)', 'EXECUTE');

    IF v_has_profile_update THEN
        RAISE EXCEPTION '[LỖI BẢO MẬT]: Role authenticated đang có quyền UPDATE trên bảng public.profiles!'
            USING ERRCODE = '42501';
    END IF;

    IF v_has_affiliate_update THEN
        RAISE EXCEPTION '[LỖI BẢO MẬT]: Role authenticated đang có quyền UPDATE trên bảng public.affiliate_profiles!'
            USING ERRCODE = '42501';
    END IF;

    IF v_has_bootstrap_exec THEN
        RAISE EXCEPTION '[LỖI BẢO MẬT]: Role authenticated đang có quyền EXECUTE trên hàm admin_bootstrap_user!'
            USING ERRCODE = '42501';
    END IF;

    RAISE NOTICE ' [2/3] XÁC MINH BẢO MẬT PHÂN QUYỀN (JWT CTV KHÔNG THỂ LEO QUYỀN):';
    RAISE NOTICE '   [PASS] 1. Role "authenticated" KHÔNG CÓ quyền UPDATE bảng profiles (chặn mã 42501).';
    RAISE NOTICE '   [PASS] 2. Role "authenticated" KHÔNG CÓ quyền UPDATE bảng affiliate_profiles (chặn mã 42501).';
    RAISE NOTICE '   [PASS] 3. Role "authenticated" KHÔNG CÓ quyền gọi hàm admin_bootstrap_user (chặn mã 42501).';
    RAISE NOTICE '   [PASS] 4. Trigger prevent_profile_privilege_escalation() và prevent_affiliate_privilege_escalation() đang hoạt động.';
    RAISE NOTICE '================================================================================';
    RAISE NOTICE ' [3/3] TIẾN HÀNH NÂNG QUYỀN ADMIN ĐÍCH DANH VÀ GHI NHẬT KÝ KIỂM TOÁN...';
END $$;

-- ------------------------------------------------------------------------------
-- 4. THỰC THI NÂNG QUYỀN QUA HÀM QUẢN TRỊ KIỂM SOÁT (HIỂN THỊ KẾT QUẢ ĐÚNG 4 TRƯỜNG)
-- ------------------------------------------------------------------------------
SELECT 
    id,
    email,
    role,
    is_active
FROM public.admin_bootstrap_user(
    '879a11fc-ff89-4019-b2f4-57d7843b631b'::uuid,
    COALESCE(
        (SELECT email FROM public.profiles WHERE id = '879a11fc-ff89-4019-b2f4-57d7843b631b'::uuid),
        (SELECT email FROM auth.users WHERE id = '879a11fc-ff89-4019-b2f4-57d7843b631b'::uuid)
    ),
    'Bootstrap Quản trị viên đầu tiên cho hệ thống STHC_CTV'
);
