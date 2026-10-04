-- ==============================================================================
-- BƯỚC DB-A4: MIGRATION 20261004000003 - ADMIN CẤP / THU HỒI VAI TRÒ CÁN BỘ TUYỂN SINH (STAFF)
-- Dự án: Hệ thống Cộng tác viên Tuyển sinh Trường Saigontourist (STHC)
-- Mã file: /supabase/migrations/20261004000003_admin_assign_revoke_staff_role.sql
-- ==============================================================================
-- Mục đích chính:
--   1. Hàm RPC PostgreSQL nguyên tử: fn_update_user_system_role()
--   2. Đảm bảo tính nguyên tử (Atomicity): Cập nhật profiles.role và ghi audit_logs
--      trong cùng một transaction duy nhất với khóa bi quan (FOR UPDATE).
--   3. Phân biệt rõ ràng giữa vai trò hệ thống (profiles.role) và trạng thái CTV (affiliate_profiles.status).
--   4. Kiểm tra nghiêm ngặt:
--      - Chỉ Quản trị viên (Admin) đang hoạt động mới có quyền gọi RPC.
--      - Tài khoản đích phải đang hoạt động (is_active = TRUE) và đã xác thực email.
--      - Không được phép thay đổi tài khoản Admin hoặc tự thay đổi vai trò của chính mình.
--      - Bắt buộc nhập lý do thay đổi vai trò để lưu vết kiểm toán.
--      - Không tạo audit log giả nếu vai trò không thay đổi.
-- ==============================================================================

CREATE OR REPLACE FUNCTION public.fn_update_user_system_role(
    p_affiliate_id UUID,
    p_admin_id UUID,
    p_target_role VARCHAR(30),   -- 'staff' hoặc 'affiliate'
    p_reason TEXT,
    p_client_ip VARCHAR(50) DEFAULT NULL,
    p_user_agent TEXT DEFAULT NULL
)
RETURNS JSONB AS $$
DECLARE
    v_admin public.profiles%ROWTYPE;
    v_aff public.affiliate_profiles%ROWTYPE;
    v_target_user public.profiles%ROWTYPE;
    v_clean_reason TEXT;
    v_audit_action VARCHAR(100);
    v_email_confirmed_at TIMESTAMPTZ;
    v_old_role VARCHAR(30);
    v_now TIMESTAMPTZ := NOW();
    v_result JSONB;
BEGIN
    -- 1. Kiểm tra quyền hạn người thực hiện (Caller phải là Admin đang hoạt động)
    SELECT *
    INTO v_admin
    FROM public.profiles
    WHERE id = p_admin_id;

    IF NOT FOUND OR v_admin.is_active = FALSE THEN
        RAISE EXCEPTION 'Bị từ chối: Tài khoản Quản trị viên không tồn tại hoặc đã bị vô hiệu hóa.'
            USING ERRCODE = '42501';
    END IF;

    IF v_admin.role <> 'admin' THEN
        RAISE EXCEPTION 'Bị từ chối: Chỉ Quản trị viên (Admin) mới có quyền cấp hoặc thu hồi vai trò Cán bộ Tuyển sinh (Staff). Tài khoản hiện tại có vai trò "%".'
            , v_admin.role
            USING ERRCODE = '42501';
    END IF;

    -- 2. Kiểm tra vai trò đích hợp lệ (chỉ chấp nhận 'staff' hoặc 'affiliate')
    IF p_target_role NOT IN ('staff', 'affiliate') THEN
        RAISE EXCEPTION 'Vai trò hệ thống đích không hợp lệ (chỉ chấp nhận staff hoặc affiliate).'
            USING ERRCODE = '22023';
    END IF;

    -- 3. Kiểm tra lý do thao tác (Bắt buộc, không chấp nhận chuỗi rỗng)
    v_clean_reason := NULLIF(TRIM(p_reason), '');
    IF v_clean_reason IS NULL OR LENGTH(v_clean_reason) = 0 THEN
        RAISE EXCEPTION 'Bắt buộc phải nhập lý do khi cấp hoặc thu hồi vai trò Cán bộ Tuyển sinh.'
            USING ERRCODE = '22023';
    END IF;

    -- 4. Tìm và khóa hồ sơ CTV tương ứng
    SELECT *
    INTO v_aff
    FROM public.affiliate_profiles
    WHERE id = p_affiliate_id;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Không tìm thấy hồ sơ cộng tác viên với mã định danh cung cấp.'
            USING ERRCODE = 'P0002';
    END IF;

    -- 5. Tìm và khóa bản ghi người dùng trong profiles (Pessimistic Locking)
    SELECT *
    INTO v_target_user
    FROM public.profiles
    WHERE id = v_aff.user_id
    FOR UPDATE;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Không tìm thấy hồ sơ người dùng liên kết với hồ sơ CTV này trong hệ thống.'
            USING ERRCODE = 'P0002';
    END IF;

    v_old_role := v_target_user.role;

    -- 6. Kiểm tra không được thay đổi tài khoản Admin
    IF v_old_role = 'admin' THEN
        RAISE EXCEPTION 'Bị từ chối: Không thể sử dụng chức năng này để thay đổi vai trò của tài khoản Quản trị viên (Admin).'
            USING ERRCODE = '42501';
    END IF;

    -- 7. Kiểm tra không được tự thay đổi vai trò của chính Admin đang thao tác
    IF v_target_user.id = p_admin_id THEN
        RAISE EXCEPTION 'Bị từ chối: Quản trị viên không thể tự thay đổi vai trò của chính tài khoản đang đăng nhập.'
            USING ERRCODE = '42501';
    END IF;

    -- 8. Kiểm tra trạng thái hoạt động của tài khoản đích
    IF v_target_user.is_active = FALSE THEN
        RAISE EXCEPTION 'Không thể thay đổi vai trò: Tài khoản đích hiện đang bị vô hiệu hóa (is_active = false).'
            USING ERRCODE = '22023';
    END IF;

    -- 9. Kiểm tra email đã xác thực
    SELECT email_confirmed_at
    INTO v_email_confirmed_at
    FROM auth.users
    WHERE id = v_target_user.id;

    IF v_email_confirmed_at IS NULL THEN
        RAISE EXCEPTION 'Không thể cấp quyền: Email của tài khoản chưa được xác thực. Vui lòng yêu cầu người dùng hoàn tất xác thực email trước.'
            USING ERRCODE = '22023';
    END IF;

    -- 10. Kiểm tra nếu vai trò đích trùng với vai trò hiện tại
    IF v_old_role = p_target_role THEN
        RAISE EXCEPTION 'Tài khoản người dùng đã ở vai trò "%", không cần thay đổi.', p_target_role
            USING ERRCODE = '22023';
    END IF;

    -- 11. Xác định action kiểm toán
    IF p_target_role = 'staff' THEN
        v_audit_action := 'SYSTEM_ROLE_ASSIGNED';
    ELSE
        v_audit_action := 'SYSTEM_ROLE_REVOKED';
    END IF;

    -- 12. Cập nhật profiles.role trong cùng transaction
    UPDATE public.profiles
    SET
        role = p_target_role,
        updated_at = v_now
    WHERE id = v_target_user.id;

    -- 13. Ghi nhật ký kiểm toán vào audit_logs (cho cả profiles và affiliate_profiles)
    INSERT INTO public.audit_logs (
        actor_id,
        action,
        entity_name,
        entity_id,
        old_values,
        new_values,
        reason,
        ip_address,
        user_agent,
        created_at
    ) VALUES (
        p_admin_id,
        v_audit_action,
        'profiles',
        v_target_user.id,
        jsonb_build_object('role', v_old_role),
        jsonb_build_object('role', p_target_role),
        v_clean_reason,
        p_client_ip,
        p_user_agent,
        v_now
    );

    INSERT INTO public.audit_logs (
        actor_id,
        action,
        entity_name,
        entity_id,
        old_values,
        new_values,
        reason,
        ip_address,
        user_agent,
        created_at
    ) VALUES (
        p_admin_id,
        v_audit_action,
        'affiliate_profiles',
        p_affiliate_id,
        jsonb_build_object('role', v_old_role, 'user_id', v_target_user.id),
        jsonb_build_object('role', p_target_role, 'user_id', v_target_user.id),
        v_clean_reason,
        p_client_ip,
        p_user_agent,
        v_now
    );

    -- 14. Trả về kết quả JSON
    v_result := jsonb_build_object(
        'success', TRUE,
        'affiliate_id', p_affiliate_id,
        'user_id', v_target_user.id,
        'old_role', v_old_role,
        'new_role', p_target_role,
        'action', v_audit_action,
        'reason', v_clean_reason,
        'updated_at', v_now
    );

    RETURN v_result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp;

ALTER FUNCTION public.fn_update_user_system_role(UUID, UUID, VARCHAR, TEXT, VARCHAR, TEXT) OWNER TO postgres;
REVOKE EXECUTE ON FUNCTION public.fn_update_user_system_role(UUID, UUID, VARCHAR, TEXT, VARCHAR, TEXT) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.fn_update_user_system_role(UUID, UUID, VARCHAR, TEXT, VARCHAR, TEXT) TO authenticated, service_role;
