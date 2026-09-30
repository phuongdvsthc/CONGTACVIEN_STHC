-- ==============================================================================
-- MIGRATION 005: ĐƯỜNG QUẢN TRỊ KIỂM SOÁT ĐỂ BOOTSTRAP ADMIN AN TOÀN
-- Dự án: Hệ thống Cộng tác viên Tuyển sinh Trường Saigontourist (STHC)
-- Mã file: /supabase/migrations/20260929000005_controlled_admin_bootstrap.sql
-- ==============================================================================
-- Bối cảnh:
--   - Khi thao tác trên Supabase SQL Editor (role 'postgres' / 'supabase_admin') hoặc
--     qua kênh quản trị, trigger `prevent_profile_privilege_escalation()` phiên bản trước
--     chỉ kiểm tra role 'service_role'. Khi chạy câu lệnh UPDATE trong SQL Editor,
--     current_user là 'postgres' và auth.uid() là NULL dẫn đến get_auth_role() trả về
--     'none' -> Kích hoạt ngoại lệ lỗi 42501.
--   - Migration này:
--     1. Cập nhật hàm `prevent_profile_privilege_escalation()` cho phép các role quản trị
--        hệ thống CSDL ('postgres', 'supabase_admin', 'service_role') hoặc cờ phiên
--        quản trị 'app.is_admin_bootstrap = on'.
--     2. Giữ nguyên 100% cơ chế bảo vệ: CTV kết nối qua PostgREST (role 'authenticated')
--        tuyệt đối KHÔNG THỂ sửa role hay is_active (vẫn bị chặn lỗi 42501).
--     3. Cung cấp hàm quản trị chuyên dụng `public.admin_bootstrap_user(...)` có kiểm soát,
--        xác thực đúng UID thuộc email dự kiến, ghi audit log, chạy lại an toàn và
--        trả về (id, email, role, is_active).
--     4. KHÔNG tắt trigger, KHÔNG mở quyền tự sửa role cho CTV, KHÔNG sửa migration cũ.
-- ==============================================================================

-- ==============================================================================
-- 1. CẬP NHẬT HÀM TRIGGER BẢO VỆ PROFILES (HỖ TRỢ QUẢN TRỊ CƠ SỞ DỮ LIỆU)
-- ==============================================================================
CREATE OR REPLACE FUNCTION public.prevent_profile_privilege_escalation()
RETURNS TRIGGER AS $$
DECLARE
    caller_role VARCHAR(30);
BEGIN
    -- 1. Cho phép các phiên quản trị cấp cao của CSDL (DBA / Supabase Admin / Service Role)
    --    hoặc phiên có gắn cờ quản trị nội bộ app.is_admin_bootstrap
    IF current_user IN ('postgres', 'supabase_admin', 'service_role') 
       OR current_setting('request.jwt.claim.role', true) = 'service_role'
       OR current_setting('app.is_admin_bootstrap', true) = 'on' THEN
        RETURN NEW;
    END IF;

    -- 2. Đối với người dùng thông thường (kết nối qua PostgREST với role 'authenticated'):
    -- Tra cứu vai trò qua hàm get_auth_role() an toàn
    caller_role := public.get_auth_role();

    -- Nếu không phải admin thì TUYỆT ĐỐI KHÔNG được sửa role hoặc is_active
    IF caller_role <> 'admin' THEN
        IF NEW.role IS DISTINCT FROM OLD.role THEN
            RAISE EXCEPTION 'Bị từ chối: Người dùng không được phép tự thay đổi quyền hạn/vai trò (role).'
                USING ERRCODE = '42501';
        END IF;

        IF NEW.is_active IS DISTINCT FROM OLD.is_active THEN
            RAISE EXCEPTION 'Bị từ chối: Người dùng không được phép tự thay đổi trạng thái kích hoạt (is_active).'
                USING ERRCODE = '42501';
        END IF;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp;

ALTER FUNCTION public.prevent_profile_privilege_escalation() OWNER TO postgres;
REVOKE EXECUTE ON FUNCTION public.prevent_profile_privilege_escalation() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.prevent_profile_privilege_escalation() TO authenticated, service_role, postgres, supabase_admin;

-- ==============================================================================
-- 2. HÀM QUẢN TRỊ NGUYÊN TỬ: BOOTSTRAP TÀI KHOẢN ADMIN ĐÍCH DANH (CONTROLLED ADMIN RPC)
-- Xác nhận UID thuộc email dự kiến, nâng quyền, ghi audit_logs và trả về (id, email, role, is_active)
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

    -- 1. Chặn an toàn tài khoản hệ thống Work + KPI
    IF v_clean_email = 'admin@sthc.edu.vn' THEN
        RAISE EXCEPTION 'Từ chối: Không được sử dụng tài khoản admin@sthc.edu.vn của hệ thống Work + KPI.'
            USING ERRCODE = '42501';
    END IF;

    -- 2. Kiểm tra tài khoản có tồn tại trong public.profiles không
    SELECT p.email, p.role, p.is_active
    INTO v_actual_email, v_current_role, v_current_active
    FROM public.profiles p
    WHERE p.id = p_target_user_id;

    IF v_actual_email IS NULL THEN
        -- Kiểm tra dự phòng nếu tài khoản đã có trong auth.users nhưng chưa có profiles
        IF EXISTS (SELECT 1 FROM auth.users u WHERE u.id = p_target_user_id) THEN
            -- Tự động bù hồ sơ qua hàm sync_missing_auth_profiles đã có ở Migration 003
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

    -- 3. Xác thực nghiêm ngặt: UID chỉ định phải thuộc đúng email dự kiến
    IF LOWER(TRIM(v_actual_email)) <> v_clean_email THEN
        RAISE EXCEPTION 'Xác thực thất bại: UID % gắn với email "%", không khớp với email dự kiến "%". Thao tác bị hủy để chống nhầm lẫn.',
            p_target_user_id, v_actual_email, p_expected_email
            USING ERRCODE = '22023';
    END IF;

    -- 4. Kiểm tra tính Idempotent: Nếu đã là Admin đang hoạt động thì không ghi đè trùng
    IF v_current_role = 'admin' AND v_current_active = TRUE THEN
        RETURN QUERY
        SELECT p.id, p.email, p.role, p.is_active
        FROM public.profiles p
        WHERE p.id = p_target_user_id;
        RETURN;
    END IF;

    -- 5. Thực hiện nâng quyền trong phiên quản trị có kiểm soát
    -- Đặt cờ session nội bộ để bypass trigger an toàn
    PERFORM set_config('app.is_admin_bootstrap', 'on', true);

    -- 5.1 Cập nhật bảng profiles
    UPDATE public.profiles p
    SET role = 'admin',
        is_active = TRUE,
        updated_at = NOW()
    WHERE p.id = p_target_user_id;

    -- 5.2 Duyệt hồ sơ CTV tương ứng (nếu có)
    UPDATE public.affiliate_profiles ap
    SET status = 'ACTIVE',
        reviewed_at = NOW(),
        review_note = p_reason,
        updated_at = NOW()
    WHERE ap.user_id = p_target_user_id;

    -- 5.3 Ghi nhật ký kiểm toán vào audit_logs
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

    -- Tắt cờ session
    PERFORM set_config('app.is_admin_bootstrap', 'off', true);

    -- 6. Trả về đúng 4 trường: id, email, role, is_active
    RETURN QUERY
    SELECT p.id, p.email, p.role, p.is_active
    FROM public.profiles p
    WHERE p.id = p_target_user_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp;

ALTER FUNCTION public.admin_bootstrap_user(UUID, TEXT, TEXT) OWNER TO postgres;

-- Bảo vệ hàm: THU HỒI toàn bộ từ PUBLIC, anon, authenticated (CTV KHÔNG THỂ GỌI)
REVOKE EXECUTE ON FUNCTION public.admin_bootstrap_user(UUID, TEXT, TEXT) FROM PUBLIC, anon, authenticated;
-- Chỉ cấp quyền cho service_role và các vai trò quản trị CSDL
GRANT EXECUTE ON FUNCTION public.admin_bootstrap_user(UUID, TEXT, TEXT) TO service_role, postgres, supabase_admin;
