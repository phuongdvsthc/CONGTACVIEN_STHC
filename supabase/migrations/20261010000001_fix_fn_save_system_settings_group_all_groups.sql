-- ==============================================================================
-- MIGRATION: 20261010000001_fix_fn_save_system_settings_group_all_groups.sql
-- MÔ TẢ: Cập nhật hàm RPC public.fn_save_system_settings_group trong Supabase 
--        để hỗ trợ đầy đủ 5 nhóm cấu hình: BRANDING, OPERATION, REGISTRATION, 
--        AFFILIATE_CODE, và EMAIL_SERVICE (bao gồm bảo mật SMTP credentials).
-- PHÂN HỆ: Quản trị hệ thống & Cấu hình vận hành (A7 & C3)
-- ==============================================================================

CREATE OR REPLACE FUNCTION public.fn_save_system_settings_group(
    p_admin_id UUID,
    p_group VARCHAR(50),
    p_expected_revision INTEGER,
    p_data JSONB,
    p_reason TEXT DEFAULT NULL
)
RETURNS JSONB AS $$
DECLARE
    v_admin public.profiles%ROWTYPE;
    v_curr public.system_settings%ROWTYPE;
    v_prev_json JSONB;
    v_new_json JSONB;
    v_new_revision INTEGER;
    v_clean_group VARCHAR(50);
    v_new_username VARCHAR(255);
    v_new_pass_cipher TEXT;
BEGIN
    v_clean_group := UPPER(TRIM(p_group));

    -- 1. Kiểm tra quyền Admin
    SELECT * INTO v_admin FROM public.profiles WHERE id = p_admin_id;
    IF NOT FOUND OR v_admin.is_active = FALSE OR v_admin.role <> 'admin' THEN
        RAISE EXCEPTION 'Bị từ chối: Chỉ Quản trị viên (Admin) mới có quyền lưu cấu hình hệ thống.'
            USING ERRCODE = '42501';
    END IF;

    -- 2. Khóa dòng cấu hình duy nhất (Singleton id = 1)
    SELECT * INTO v_curr FROM public.system_settings WHERE id = 1 FOR UPDATE;
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Không tìm thấy bản ghi cấu hình hệ thống.' USING ERRCODE = 'P0002';
    END IF;

    IF v_curr.revision <> p_expected_revision THEN
        RAISE EXCEPTION 'Xung đột phiên bản: Cấu hình đã được thay đổi bởi quản trị viên khác (Hiện tại: %, Yêu cầu: %). Vui lòng tải lại trang.',
            v_curr.revision, p_expected_revision
            USING ERRCODE = 'P0004';
    END IF;

    v_new_revision := v_curr.revision + 1;

    -- 3. Xử lý theo từng nhóm cấu hình
    IF v_clean_group = 'BRANDING' THEN
        v_prev_json := jsonb_build_object(
            'system_name', v_curr.system_name,
            'system_short_name', v_curr.system_short_name,
            'unit_name', v_curr.unit_name,
            'logo_backend_url', v_curr.logo_backend_url,
            'favicon_url', v_curr.favicon_url
        );

        UPDATE public.system_settings
        SET system_name = COALESCE(NULLIF(TRIM(p_data->>'system_name'), ''), system_name),
            system_short_name = COALESCE(NULLIF(TRIM(p_data->>'system_short_name'), ''), system_short_name),
            unit_name = COALESCE(NULLIF(TRIM(p_data->>'unit_name'), ''), unit_name),
            logo_backend_url = CASE WHEN p_data ? 'logo_backend_url' THEN NULLIF(TRIM(p_data->>'logo_backend_url'), '') ELSE logo_backend_url END,
            favicon_url = CASE WHEN p_data ? 'favicon_url' THEN NULLIF(TRIM(p_data->>'favicon_url'), '') ELSE favicon_url END,
            revision = v_new_revision,
            updated_at = NOW(),
            updated_by = p_admin_id
        WHERE id = 1
        RETURNING * INTO v_curr;

        v_new_json := jsonb_build_object(
            'system_name', v_curr.system_name,
            'system_short_name', v_curr.system_short_name,
            'unit_name', v_curr.unit_name,
            'logo_backend_url', v_curr.logo_backend_url,
            'favicon_url', v_curr.favicon_url
        );

    ELSIF v_clean_group = 'OPERATION' THEN
        v_prev_json := jsonb_build_object(
            'public_base_url', v_curr.public_base_url,
            'support_email', v_curr.support_email,
            'support_phone', v_curr.support_phone,
            'timezone', v_curr.timezone
        );

        UPDATE public.system_settings
        SET public_base_url = COALESCE(NULLIF(TRIM(p_data->>'public_base_url'), ''), public_base_url),
            support_email = COALESCE(NULLIF(TRIM(p_data->>'support_email'), ''), support_email),
            support_phone = COALESCE(NULLIF(TRIM(p_data->>'support_phone'), ''), support_phone),
            timezone = COALESCE(NULLIF(TRIM(p_data->>'timezone'), ''), timezone),
            revision = v_new_revision,
            updated_at = NOW(),
            updated_by = p_admin_id
        WHERE id = 1
        RETURNING * INTO v_curr;

        v_new_json := jsonb_build_object(
            'public_base_url', v_curr.public_base_url,
            'support_email', v_curr.support_email,
            'support_phone', v_curr.support_phone,
            'timezone', v_curr.timezone
        );

    ELSIF v_clean_group = 'REGISTRATION' THEN
        v_prev_json := jsonb_build_object(
            'allow_affiliate_registration', v_curr.allow_affiliate_registration,
            'registration_closed_message', v_curr.registration_closed_message
        );

        UPDATE public.system_settings
        SET allow_affiliate_registration = COALESCE((p_data->>'allow_affiliate_registration')::BOOLEAN, allow_affiliate_registration),
            registration_closed_message = CASE WHEN p_data ? 'registration_closed_message' THEN NULLIF(TRIM(p_data->>'registration_closed_message'), '') ELSE registration_closed_message END,
            revision = v_new_revision,
            updated_at = NOW(),
            updated_by = p_admin_id
        WHERE id = 1
        RETURNING * INTO v_curr;

        v_new_json := jsonb_build_object(
            'allow_affiliate_registration', v_curr.allow_affiliate_registration,
            'registration_closed_message', v_curr.registration_closed_message
        );

    ELSIF v_clean_group = 'AFFILIATE_CODE' THEN
        v_prev_json := jsonb_build_object(
            'affiliate_code_prefix', v_curr.affiliate_code_prefix,
            'affiliate_code_min_digits', v_curr.affiliate_code_min_digits
        );

        UPDATE public.system_settings
        SET affiliate_code_prefix = COALESCE(NULLIF(TRIM(p_data->>'affiliate_code_prefix'), ''), affiliate_code_prefix),
            affiliate_code_min_digits = COALESCE((p_data->>'affiliate_code_min_digits')::INTEGER, affiliate_code_min_digits),
            revision = v_new_revision,
            updated_at = NOW(),
            updated_by = p_admin_id
        WHERE id = 1
        RETURNING * INTO v_curr;

        v_new_json := jsonb_build_object(
            'affiliate_code_prefix', v_curr.affiliate_code_prefix,
            'affiliate_code_min_digits', v_curr.affiliate_code_min_digits
        );

    ELSIF v_clean_group = 'EMAIL_SERVICE' THEN
        v_prev_json := jsonb_build_object(
            'email_business_enabled', v_curr.email_business_enabled,
            'smtp_host', v_curr.smtp_host,
            'smtp_port', v_curr.smtp_port,
            'smtp_secure_mode', v_curr.smtp_secure_mode,
            'smtp_sender_name', v_curr.smtp_sender_name,
            'smtp_sender_email', v_curr.smtp_sender_email,
            'smtp_reply_to', v_curr.smtp_reply_to,
            'smtp_timeout_ms', v_curr.smtp_timeout_ms,
            'smtp_username', v_curr.smtp_username,
            'has_password', CASE WHEN v_curr.smtp_password_ciphertext IS NOT NULL AND v_curr.smtp_password_ciphertext <> '' THEN TRUE ELSE FALSE END
        );

        v_new_username := CASE 
            WHEN p_data ? 'smtp_username' THEN NULLIF(TRIM(p_data->>'smtp_username'), '')
            ELSE v_curr.smtp_username
        END;

        v_new_pass_cipher := CASE 
            WHEN p_data ? 'smtp_password_ciphertext' AND NULLIF(TRIM(p_data->>'smtp_password_ciphertext'), '') IS NOT NULL 
            THEN TRIM(p_data->>'smtp_password_ciphertext')
            ELSE v_curr.smtp_password_ciphertext
        END;

        UPDATE public.system_settings
        SET email_business_enabled = COALESCE((p_data->>'email_business_enabled')::BOOLEAN, email_business_enabled),
            smtp_host = COALESCE(NULLIF(TRIM(p_data->>'smtp_host'), ''), smtp_host),
            smtp_port = COALESCE((p_data->>'smtp_port')::INTEGER, smtp_port),
            smtp_secure_mode = COALESCE(NULLIF(TRIM(p_data->>'smtp_secure_mode'), ''), smtp_secure_mode),
            smtp_sender_name = COALESCE(NULLIF(TRIM(p_data->>'smtp_sender_name'), ''), smtp_sender_name),
            smtp_sender_email = COALESCE(NULLIF(TRIM(p_data->>'smtp_sender_email'), ''), smtp_sender_email),
            smtp_reply_to = CASE WHEN p_data ? 'smtp_reply_to' THEN NULLIF(TRIM(p_data->>'smtp_reply_to'), '') ELSE smtp_reply_to END,
            smtp_timeout_ms = COALESCE((p_data->>'smtp_timeout_ms')::INTEGER, smtp_timeout_ms),
            smtp_username = v_new_username,
            smtp_password_ciphertext = v_new_pass_cipher,
            revision = v_new_revision,
            updated_at = NOW(),
            updated_by = p_admin_id
        WHERE id = 1
        RETURNING * INTO v_curr;

        v_new_json := jsonb_build_object(
            'email_business_enabled', v_curr.email_business_enabled,
            'smtp_host', v_curr.smtp_host,
            'smtp_port', v_curr.smtp_port,
            'smtp_secure_mode', v_curr.smtp_secure_mode,
            'smtp_sender_name', v_curr.smtp_sender_name,
            'smtp_sender_email', v_curr.smtp_sender_email,
            'smtp_reply_to', v_curr.smtp_reply_to,
            'smtp_timeout_ms', v_curr.smtp_timeout_ms,
            'smtp_username', v_curr.smtp_username,
            'has_password', CASE WHEN v_curr.smtp_password_ciphertext IS NOT NULL AND v_curr.smtp_password_ciphertext <> '' THEN TRUE ELSE FALSE END
        );
    ELSE
        RAISE EXCEPTION 'Nhóm cấu hình % không được hỗ trợ trong phiên bản này.', p_group USING ERRCODE = 'P0001';
    END IF;

    -- 4. Ghi nhật ký lịch sử thay đổi
    INSERT INTO public.system_settings_history (
        setting_group, action_type, revision, previous_data, new_data, changed_by, changed_at, change_reason
    ) VALUES (
        v_clean_group, 'UPDATE', v_new_revision, v_prev_json, v_new_json, p_admin_id, NOW(), p_reason
    );

    RETURN jsonb_build_object(
        'success', TRUE,
        'revision', v_new_revision,
        'settings', row_to_json(v_curr)
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

ALTER FUNCTION public.fn_save_system_settings_group OWNER TO postgres;
REVOKE EXECUTE ON FUNCTION public.fn_save_system_settings_group FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.fn_save_system_settings_group TO service_role;
