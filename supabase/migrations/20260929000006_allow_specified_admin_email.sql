-- ==============================================================================
-- MIGRATION 006: SỬA TOÀN DIỆN CƠ CHẾ QUẢN TRỊ BOOTSTRAP VÀ PHÊ DUYỆT HỒ SƠ CTV
-- Dự án: Hệ thống Cộng tác viên Tuyển sinh Trường Saigontourist (STHC)
-- Mã file: /supabase/migrations/20260929000006_allow_specified_admin_email.sql
-- ==============================================================================
-- Các nội dung sửa đổi:
--   1. Cập nhật `prevent_affiliate_privilege_escalation()`:
--      Cho phép các phiên quản trị CSDL ('postgres', 'supabase_admin', 'service_role')
--      hoặc phiên có cờ 'app.is_admin_bootstrap = on' duyệt hồ sơ CTV khi bootstrap.
--      Khi CTV thường thao tác qua PostgREST (role 'authenticated'), trigger VẪN CHẶN 100%.
--   2. Cập nhật `admin_bootstrap_user()`:
--      Gỡ bỏ điều kiện chặn cứng email dòng 12, cho phép bootstrap bất kỳ tài khoản nào
--      được xác nhận đúng UID và email dự kiến (bao gồm 'admin@sthc.edu.vn').
-- ==============================================================================

-- ==============================================================================
-- 1. CẬP NHẬT TRIGGER TRÊN BẢNG AFFILIATE_PROFILES (HỖ TRỢ PHIÊN QUẢN TRỊ VÀ BOOTSTRAP)
-- ==============================================================================
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

    -- 2. Đối với người dùng kết nối qua PostgREST / JWT
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

-- ==============================================================================
-- 2. CẬP NHẬT HÀM ADMIN_BOOTSTRAP_USER (HỖ TRỢ ĐÍCH DANH UID VÀ EMAIL ĐƯỢC CHỈ ĐỊNH)
-- ==============================================================================
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
