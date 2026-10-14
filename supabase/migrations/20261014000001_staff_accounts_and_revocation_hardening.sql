-- ==============================================================================
-- MIGRATION: 20261014000001 - BẢO MẬT VÀ QUẢN LÝ TÀI KHOẢN NHÂN VIÊN (A7-NV.6)
-- Dự án: Hệ thống Quản lý Cộng tác viên Tuyển sinh STHC (STHC_CTV)
-- File: /supabase/migrations/20261014000001_staff_accounts_and_revocation_hardening.sql
-- 
-- Mục đích:
--   1. Nâng cấp hàm RPC fn_update_user_system_role():
--      - Khi Admin thu hồi vai trò Staff (chuyển về 'affiliate'), tự động vô hiệu hóa
--        (is_active = FALSE) toàn bộ các nhóm quyền đang hoạt động của nhân viên đó
--        trong bảng public.staff_permission_groups (bảo toàn lịch sử, không xóa cứng).
--      - Ghi nhận thêm bản ghi kiểm toán STAFF_GROUPS_DEACTIVATED_ON_REVOKE vào public.audit_logs.
--      - Khi nâng lại vai trò Staff, nhân viên chỉ nhận quyền nền, không tự động phục hồi nhóm cũ.
--   2. Tạo hàm RPC fn_toggle_staff_active_status():
--      - Cho phép Quản trị viên (Admin) khóa hoặc mở khóa tài khoản Staff (profiles.is_active).
--      - Kiểm tra nghiêm ngặt: chỉ tác động lên role = 'staff', bắt buộc nhập lý do (>= 5 ký tự),
--        chặn tự khóa chính Admin, chống cập nhật trùng trạng thái (Idempotency).
--      - Ghi nhận đồng thời bản ghi kiểm toán STAFF_ACCOUNT_LOCKED hoặc STAFF_ACCOUNT_UNLOCKED
--        trong cùng transaction nguyên tử (Rollback toàn bộ nếu có lỗi).
-- ==============================================================================

-- ==============================================================================
-- 1. NÂNG CẤP HÀM RPC: fn_update_user_system_role
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
    v_deactivated_count INT := 0;
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

    -- 3. Kiểm tra lý do thao tác (Bắt buộc, không chấp nhận chuỗi rỗng hoặc < 5 ký tự)
    v_clean_reason := NULLIF(TRIM(p_reason), '');
    IF v_clean_reason IS NULL OR LENGTH(v_clean_reason) < 5 THEN
        RAISE EXCEPTION 'Bắt buộc phải nhập lý do hợp lệ (tối thiểu 5 ký tự) khi cấp hoặc thu hồi vai trò Cán bộ Tuyển sinh.'
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

    -- 13. NẾU THU HỒI VAI TRÒ STAFF (staff -> affiliate):
    -- Tự động vô hiệu hóa toàn bộ nhóm quyền đang hoạt động của nhân viên trong staff_permission_groups
    -- (Bảo toàn các dòng lịch sử gán, chỉ chuyển is_active = FALSE).
    IF p_target_role = 'affiliate' THEN
        UPDATE public.staff_permission_groups
        SET is_active = FALSE
        WHERE staff_id = v_target_user.id
          AND is_active = TRUE;

        GET DIAGNOSTICS v_deactivated_count = ROW_COUNT;

        IF v_deactivated_count > 0 THEN
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
                'STAFF_GROUPS_DEACTIVATED_ON_REVOKE',
                'staff_permission_groups',
                v_target_user.id,
                jsonb_build_object('deactivated_count', v_deactivated_count),
                jsonb_build_object('is_active', false),
                v_clean_reason,
                p_client_ip,
                p_user_agent,
                v_now
            );
        END IF;
    END IF;

    -- 14. Ghi nhật ký kiểm toán vào audit_logs (cho cả profiles và affiliate_profiles)
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

    -- 15. Trả về kết quả JSON
    v_result := jsonb_build_object(
        'success', TRUE,
        'affiliate_id', p_affiliate_id,
        'user_id', v_target_user.id,
        'old_role', v_old_role,
        'new_role', p_target_role,
        'action', v_audit_action,
        'deactivated_groups_count', v_deactivated_count,
        'reason', v_clean_reason,
        'updated_at', v_now
    );

    RETURN v_result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp;

ALTER FUNCTION public.fn_update_user_system_role(UUID, UUID, VARCHAR, TEXT, VARCHAR, TEXT) OWNER TO postgres;
REVOKE EXECUTE ON FUNCTION public.fn_update_user_system_role(UUID, UUID, VARCHAR, TEXT, VARCHAR, TEXT) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.fn_update_user_system_role(UUID, UUID, VARCHAR, TEXT, VARCHAR, TEXT) TO authenticated, service_role;


-- ==============================================================================
-- 2. HÀM RPC MỚI: fn_toggle_staff_active_status (Khóa / Mở khóa tài khoản Staff)
-- ==============================================================================
CREATE OR REPLACE FUNCTION public.fn_toggle_staff_active_status(
    p_staff_id UUID,
    p_admin_id UUID,
    p_is_active BOOLEAN,
    p_reason TEXT,
    p_client_ip VARCHAR(50) DEFAULT NULL,
    p_user_agent TEXT DEFAULT NULL
)
RETURNS JSONB AS $$
DECLARE
    v_admin public.profiles%ROWTYPE;
    v_target public.profiles%ROWTYPE;
    v_clean_reason TEXT;
    v_audit_action VARCHAR(100);
    v_old_active BOOLEAN;
    v_now TIMESTAMPTZ := NOW();
    v_result JSONB;
BEGIN
    -- 1. Kiểm tra Admin thực hiện
    SELECT *
    INTO v_admin
    FROM public.profiles
    WHERE id = p_admin_id;

    IF NOT FOUND OR v_admin.is_active = FALSE THEN
        RAISE EXCEPTION 'Bị từ chối: Tài khoản Quản trị viên không tồn tại hoặc đã bị vô hiệu hóa.'
            USING ERRCODE = '42501';
    END IF;

    IF v_admin.role <> 'admin' THEN
        RAISE EXCEPTION 'Bị từ chối: Chỉ Quản trị viên (Admin) mới có quyền khóa hoặc mở khóa tài khoản nhân viên.'
            USING ERRCODE = '42501';
    END IF;

    -- 2. Kiểm tra lý do (Bắt buộc, tối thiểu 5 ký tự)
    v_clean_reason := NULLIF(TRIM(p_reason), '');
    IF v_clean_reason IS NULL OR LENGTH(v_clean_reason) < 5 THEN
        RAISE EXCEPTION 'Bắt buộc phải nhập lý do hợp lệ (tối thiểu 5 ký tự) khi thay đổi trạng thái kích hoạt tài khoản nhân viên.'
            USING ERRCODE = '22023';
    END IF;

    -- 3. Khóa bản ghi target (Pessimistic Locking)
    SELECT *
    INTO v_target
    FROM public.profiles
    WHERE id = p_staff_id
    FOR UPDATE;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Không tìm thấy hồ sơ người dùng trong hệ thống.'
            USING ERRCODE = 'P0002';
    END IF;

    -- 4. Kiểm tra target bắt buộc phải là Staff
    IF v_target.role <> 'staff' THEN
        RAISE EXCEPTION 'Chức năng này chỉ áp dụng cho tài khoản Cán bộ Tuyển sinh (Staff). Tài khoản hiện tại có vai trò "%".'
            , v_target.role
            USING ERRCODE = '22023';
    END IF;

    -- 5. Không được tự thao tác trên chính Admin
    IF v_target.id = p_admin_id THEN
        RAISE EXCEPTION 'Bị từ chối: Quản trị viên không thể tự thay đổi trạng thái kích hoạt của chính mình.'
            USING ERRCODE = '42501';
    END IF;

    -- 6. Kiểm tra trạng thái hiện tại (Chống thao tác thừa / Idempotency)
    v_old_active := v_target.is_active;
    IF v_old_active = p_is_active THEN
        IF p_is_active = TRUE THEN
            RAISE EXCEPTION 'Tài khoản nhân viên này hiện đang ở trạng thái Hoạt động, không cần mở khóa.'
                USING ERRCODE = '22023';
        ELSE
            RAISE EXCEPTION 'Tài khoản nhân viên này hiện đã bị Vô hiệu hóa trước đó, không cần khóa lại.'
                USING ERRCODE = '22023';
        END IF;
    END IF;

    -- 7. Xác định action kiểm toán
    IF p_is_active = FALSE THEN
        v_audit_action := 'STAFF_ACCOUNT_LOCKED';
    ELSE
        v_audit_action := 'STAFF_ACCOUNT_UNLOCKED';
    END IF;

    -- 8. Cập nhật profiles.is_active
    UPDATE public.profiles
    SET
        is_active = p_is_active,
        updated_at = v_now
    WHERE id = v_target.id;

    -- 9. Ghi nhật ký kiểm toán vào audit_logs trong cùng transaction
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
        v_target.id,
        jsonb_build_object('is_active', v_old_active),
        jsonb_build_object('is_active', p_is_active),
        v_clean_reason,
        p_client_ip,
        p_user_agent,
        v_now
    );

    -- 10. Trả về kết quả JSON
    v_result := jsonb_build_object(
        'success', TRUE,
        'staff_id', v_target.id,
        'email', v_target.email,
        'full_name', v_target.full_name,
        'old_is_active', v_old_active,
        'new_is_active', p_is_active,
        'action', v_audit_action,
        'reason', v_clean_reason,
        'updated_at', v_now
    );

    RETURN v_result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp;

ALTER FUNCTION public.fn_toggle_staff_active_status(UUID, UUID, BOOLEAN, TEXT, VARCHAR, TEXT) OWNER TO postgres;
REVOKE EXECUTE ON FUNCTION public.fn_toggle_staff_active_status(UUID, UUID, BOOLEAN, TEXT, VARCHAR, TEXT) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.fn_toggle_staff_active_status(UUID, UUID, BOOLEAN, TEXT, VARCHAR, TEXT) TO authenticated, service_role;
