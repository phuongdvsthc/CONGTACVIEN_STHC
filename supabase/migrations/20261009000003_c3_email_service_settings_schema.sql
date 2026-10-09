-- ==============================================================================
-- MIGRATION: 20261009000003_c3_email_service_settings_schema.sql
-- MÔ TẢ: Bổ sung cấu hình Dịch vụ Gửi Email Nghiệp vụ (C3.11A - Email Service Config)
--        vào bảng system_settings và cập nhật RPC fn_save_system_settings_group.
-- PHÂN HỆ: Cài đặt Hệ thống & Dịch vụ Email STHC_CTV
-- ==============================================================================

-- 1. BỔ SUNG CÁC CỘT CẤU HÌNH EMAIL NGHIỆP VỤ VÀO TABLE system_settings (SINGLETON)
DO $$
BEGIN
    -- Cột bật/tắt gửi email nghiệp vụ
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' AND table_name = 'system_settings' AND column_name = 'email_business_enabled'
    ) THEN
        ALTER TABLE public.system_settings 
            ADD COLUMN email_business_enabled BOOLEAN NOT NULL DEFAULT FALSE;
    END IF;

    -- Cột SMTP Host
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' AND table_name = 'system_settings' AND column_name = 'smtp_host'
    ) THEN
        ALTER TABLE public.system_settings 
            ADD COLUMN smtp_host VARCHAR(255) NULL;
    END IF;

    -- Cột SMTP Port
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' AND table_name = 'system_settings' AND column_name = 'smtp_port'
    ) THEN
        ALTER TABLE public.system_settings 
            ADD COLUMN smtp_port INTEGER NOT NULL DEFAULT 587;
        
        ALTER TABLE public.system_settings 
            ADD CONSTRAINT chk_smtp_port CHECK (smtp_port BETWEEN 1 AND 65535);
    END IF;

    -- Cột SMTP Secure Mode (STARTTLS, TLS_WRAPPED, NONE)
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' AND table_name = 'system_settings' AND column_name = 'smtp_secure_mode'
    ) THEN
        ALTER TABLE public.system_settings 
            ADD COLUMN smtp_secure_mode VARCHAR(20) NOT NULL DEFAULT 'STARTTLS';
        
        ALTER TABLE public.system_settings 
            ADD CONSTRAINT chk_smtp_secure_mode CHECK (smtp_secure_mode IN ('STARTTLS', 'TLS_WRAPPED', 'NONE'));
    END IF;

    -- Cột Tên người gửi hiển thị (From Name)
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' AND table_name = 'system_settings' AND column_name = 'smtp_sender_name'
    ) THEN
        ALTER TABLE public.system_settings 
            ADD COLUMN smtp_sender_name VARCHAR(255) NULL DEFAULT 'Ban Tuyển sinh Trường Saigontourist';
    END IF;

    -- Cột Địa chỉ email người gửi (From Email)
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' AND table_name = 'system_settings' AND column_name = 'smtp_sender_email'
    ) THEN
        ALTER TABLE public.system_settings 
            ADD COLUMN smtp_sender_email VARCHAR(255) NULL DEFAULT 'tuyensinh@sthc.edu.vn';
    END IF;

    -- Cột Địa chỉ phản hồi (Reply-To Email)
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' AND table_name = 'system_settings' AND column_name = 'smtp_reply_to'
    ) THEN
        ALTER TABLE public.system_settings 
            ADD COLUMN smtp_reply_to VARCHAR(255) NULL DEFAULT 'tuyensinh@sthc.edu.vn';
    END IF;

    -- Cột Timeout kết nối SMTP (milliseconds)
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' AND table_name = 'system_settings' AND column_name = 'smtp_timeout_ms'
    ) THEN
        ALTER TABLE public.system_settings 
            ADD COLUMN smtp_timeout_ms INTEGER NOT NULL DEFAULT 10000;
        
        ALTER TABLE public.system_settings 
            ADD CONSTRAINT chk_smtp_timeout CHECK (smtp_timeout_ms BETWEEN 2000 AND 60000);
    END IF;
END $$;

-- 2. CẬP NHẬT RÀNG BUỘC NHÓM CẤU HÌNH TRONG system_settings_history ĐỂ HỖ TRỢ 'EMAIL_SERVICE'
DO $$
BEGIN
    ALTER TABLE public.system_settings_history DROP CONSTRAINT IF EXISTS chk_setting_group;
    ALTER TABLE public.system_settings_history 
        ADD CONSTRAINT chk_setting_group CHECK (
            setting_group IN ('BRANDING', 'OPERATION', 'REGISTRATION', 'AFFILIATE_CODE', 'EMAIL_SERVICE', 'ROLLBACK')
        );
EXCEPTION WHEN OTHERS THEN
    -- Bỏ qua nếu bảng chưa tồn tại hoặc lỗi tương thích
    NULL;
END $$;

-- 3. CẬP NHẬT RPC LƯU CẤU HÌNH NGUYÊN TỬ (fn_save_system_settings_group)
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
    v_active_reg_count INTEGER;
    v_clean_group VARCHAR(50);
BEGIN
    v_clean_group := UPPER(TRIM(p_group));

    -- 1. Kiểm tra quyền Admin
    SELECT * INTO v_admin FROM public.profiles WHERE id = p_admin_id;
    IF NOT FOUND OR v_admin.is_active = FALSE OR v_admin.role <> 'admin' THEN
        RAISE EXCEPTION 'Bị từ chối: Chỉ Quản trị viên (Admin) mới có quyền lưu cấu hình hệ thống.'
            USING ERRCODE = '42501';
    END IF;

    -- 2. Khóa dòng cấu hình duy nhất (Optimistic Concurrency Control)
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

    -- 3. Cập nhật theo từng nhóm cho phép (Allowlist validation)
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
        IF (p_data->>'allow_affiliate_registration')::BOOLEAN IS TRUE THEN
            SELECT COUNT(*) INTO v_active_reg_count 
            FROM public.system_regulations 
            WHERE status = 'ACTIVE';

            IF v_active_reg_count = 0 THEN
                RAISE EXCEPTION 'Bị từ chối: Không thể mở tiếp nhận đăng ký CTV khi chưa có phiên bản quy chế nào đang áp dụng (ACTIVE).'
                    USING ERRCODE = '22023';
            END IF;
        END IF;

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
        SET affiliate_code_prefix = COALESCE(NULLIF(UPPER(TRIM(p_data->>'affiliate_code_prefix')), ''), affiliate_code_prefix),
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

    -- =========================================================================
    -- NHÓM MỚI: EMAIL_SERVICE (C3.11A CẤU HÌNH DỊCH VỤ EMAIL NGHIỆP VỤ)
    -- =========================================================================
    ELSIF v_clean_group = 'EMAIL_SERVICE' THEN
        v_prev_json := jsonb_build_object(
            'email_business_enabled', v_curr.email_business_enabled,
            'smtp_host', v_curr.smtp_host,
            'smtp_port', v_curr.smtp_port,
            'smtp_secure_mode', v_curr.smtp_secure_mode,
            'smtp_sender_name', v_curr.smtp_sender_name,
            'smtp_sender_email', v_curr.smtp_sender_email,
            'smtp_reply_to', v_curr.smtp_reply_to,
            'smtp_timeout_ms', v_curr.smtp_timeout_ms
        );

        UPDATE public.system_settings
        SET email_business_enabled = CASE WHEN p_data ? 'email_business_enabled' THEN (p_data->>'email_business_enabled')::BOOLEAN ELSE email_business_enabled END,
            smtp_host = CASE WHEN p_data ? 'smtp_host' THEN NULLIF(TRIM(p_data->>'smtp_host'), '') ELSE smtp_host END,
            smtp_port = CASE WHEN p_data ? 'smtp_port' THEN (p_data->>'smtp_port')::INTEGER ELSE smtp_port END,
            smtp_secure_mode = CASE WHEN p_data ? 'smtp_secure_mode' THEN UPPER(TRIM(p_data->>'smtp_secure_mode')) ELSE smtp_secure_mode END,
            smtp_sender_name = CASE WHEN p_data ? 'smtp_sender_name' THEN NULLIF(TRIM(p_data->>'smtp_sender_name'), '') ELSE smtp_sender_name END,
            smtp_sender_email = CASE WHEN p_data ? 'smtp_sender_email' THEN NULLIF(TRIM(p_data->>'smtp_sender_email'), '') ELSE smtp_sender_email END,
            smtp_reply_to = CASE WHEN p_data ? 'smtp_reply_to' THEN NULLIF(TRIM(p_data->>'smtp_reply_to'), '') ELSE smtp_reply_to END,
            smtp_timeout_ms = CASE WHEN p_data ? 'smtp_timeout_ms' THEN (p_data->>'smtp_timeout_ms')::INTEGER ELSE smtp_timeout_ms END,
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
            'smtp_timeout_ms', v_curr.smtp_timeout_ms
        );

    ELSE
        RAISE EXCEPTION 'Nhóm cấu hình không hợp lệ: % (Chỉ chấp nhận BRANDING, OPERATION, REGISTRATION, AFFILIATE_CODE, EMAIL_SERVICE).', p_group
            USING ERRCODE = '22023';
    END IF;

    -- 4. Ghi nhật ký lịch sử cấu hình trong cùng transaction
    INSERT INTO public.system_settings_history (
        setting_group,
        action_type,
        revision,
        previous_data,
        new_data,
        changed_by,
        changed_at,
        change_reason
    ) VALUES (
        v_clean_group,
        'UPDATE',
        v_new_revision,
        v_prev_json,
        v_new_json,
        p_admin_id,
        NOW(),
        p_reason
    );

    -- 5. Trả về kết quả phiên bản mới
    RETURN jsonb_build_object(
        'success', TRUE,
        'revision', v_new_revision,
        'settings', row_to_json(v_curr)
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp;

ALTER FUNCTION public.fn_save_system_settings_group OWNER TO postgres;
REVOKE EXECUTE ON FUNCTION public.fn_save_system_settings_group FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.fn_save_system_settings_group TO service_role;

-- 4. TẠO BẢNG NHẬT KÝ KIỂM THỬ DỊCH VỤ EMAIL (AN TOÀN BẢO MẬT PII & SECRETS)
CREATE TABLE IF NOT EXISTS public.email_service_test_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    admin_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    action_type VARCHAR(50) NOT NULL CONSTRAINT chk_test_action_type CHECK (
        action_type IN ('VERIFY_CONNECTION', 'SEND_TEST_EMAIL')
    ),
    recipient_masked VARCHAR(255) NULL,
    status VARCHAR(20) NOT NULL CONSTRAINT chk_test_status CHECK (
        status IN ('SUCCESS', 'FAILED')
    ),
    error_code VARCHAR(50) NULL,
    error_message TEXT NULL,
    technical_details JSONB NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_email_service_logs_created_at ON public.email_service_test_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_email_service_logs_admin_id ON public.email_service_test_logs(admin_id);

ALTER TABLE public.email_service_test_logs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Service Role Manage Email Service Logs" ON public.email_service_test_logs;
CREATE POLICY "Service Role Manage Email Service Logs"
    ON public.email_service_test_logs FOR ALL
    TO service_role
    USING (true)
    WITH CHECK (true);

DROP POLICY IF EXISTS "Admin Read Email Service Logs" ON public.email_service_test_logs;
CREATE POLICY "Admin Read Email Service Logs"
    ON public.email_service_test_logs FOR SELECT
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.profiles
            WHERE profiles.id = auth.uid()
              AND profiles.role = 'admin'
              AND profiles.is_active = TRUE
        )
    );
