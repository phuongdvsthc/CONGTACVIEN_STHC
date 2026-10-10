-- ==============================================================================
-- MIGRATION: 20261009000007_c3_smtp_credentials_secure_storage.sql
-- MÔ TẢ: Bổ sung các cột lưu trữ thông tin xác thực SMTP (smtp_username và smtp_password_ciphertext)
--        vào bảng system_settings để Admin đơn vị cấu hình trực tiếp trên giao diện.
-- PHÂN HỆ: Quản trị hệ thống & Bảo mật Credentials (C3.SMTP)
-- ==============================================================================

-- 1. Bổ sung cột smtp_username và smtp_password_ciphertext vào bảng system_settings (Singleton id = 1)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' AND table_name = 'system_settings' AND column_name = 'smtp_username'
    ) THEN
        ALTER TABLE public.system_settings 
            ADD COLUMN smtp_username VARCHAR(255) NULL;
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' AND table_name = 'system_settings' AND column_name = 'smtp_password_ciphertext'
    ) THEN
        ALTER TABLE public.system_settings 
            ADD COLUMN smtp_password_ciphertext TEXT NULL;
    END IF;
END $$;

-- 2. Cập nhật RPC fn_save_system_settings_group để lưu smtp_username và smtp_password_ciphertext an toàn
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

    -- 2. Khóa dòng cấu hình duy nhất
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

    IF v_clean_group = 'EMAIL_SERVICE' THEN
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

        -- Xác định giá trị username mới
        v_new_username := CASE 
            WHEN p_data ? 'smtp_username' THEN NULLIF(TRIM(p_data->>'smtp_username'), '')
            ELSE v_curr.smtp_username
        END;

        -- Xác định giá trị password ciphertext mới (nếu p_data có truyền mật khẩu mới đã mã hóa, hoặc giữ nguyên cũ nếu trống)
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

        -- Ghi nhật lịch sử thay đổi
        INSERT INTO public.system_settings_history (
            setting_group, action_type, revision, previous_data, new_data, changed_by, changed_at, change_reason
        ) VALUES (
            'EMAIL_SERVICE', 'UPDATE', v_new_revision, v_prev_json, v_new_json, p_admin_id, NOW(), p_reason
        );

        RETURN jsonb_build_object(
            'success', TRUE,
            'revision', v_new_revision,
            'settings', row_to_json(v_curr)
        );
    ELSE
        RAISE EXCEPTION 'Nhóm cấu hình % không được hỗ trợ trong phiên bản này.', p_group USING ERRCODE = 'P0001';
    END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
