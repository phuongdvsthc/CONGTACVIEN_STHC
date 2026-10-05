-- ==============================================================================
-- BƯỚC DB-A7.6: MIGRATION 20261005000002 - QUY CHẾ VÀ ĐĂNG KÝ CTV (A7.6)
-- Dự án: Hệ thống Cộng tác viên Tuyển sinh Trường Saigontourist (STHC)
-- Mã file: /supabase/migrations/20261005000002_affiliate_registration_intent_and_consent.sql
-- ==============================================================================
-- Mục đích chính:
--   1. Tạo bảng public.affiliate_registration_intents lưu vết yêu cầu đăng ký
--      được máy chủ backend ký nhận ngắn hạn (Token 1 lần, TTL 15 phút).
--   2. Đảm bảo toàn vẹn: Bắt buộc chỉ backend được tạo registration intent.
--   3. Cập nhật hàm trigger public.handle_new_auth_user():
--      - Kiểm tra và khóa intent nguyên tử (FOR UPDATE).
--      - Kiểm tra khóa trạng thái tiếp nhận đăng ký tại public.system_settings.
--      - Kiểm tra tính hợp lệ và hiệu lực của phiên bản quy chế tuyển sinh.
--      - Tự động ghi nhận bản ghi đồng ý vào public.affiliate_regulation_consents
--        trong cùng transaction tạo Auth User và hồ sơ CTV.
--      - Tiêu thụ intent (chống replay attack và đăng ký trùng lặp).
--   4. Ngăn chặn đăng ký trực tiếp qua Supabase Auth client nếu bỏ qua backend.
--   5. Bảo vệ luồng quản trị bootstrap tài khoản Admin/Staff nội bộ.
-- ==============================================================================

-- 1. BẢNG PHIÊN ĐĂNG KÝ XÁC NHẬN BỞI SERVER (REGISTRATION INTENTS)
CREATE TABLE IF NOT EXISTS public.affiliate_registration_intents (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    intent_token VARCHAR(128) NOT NULL UNIQUE,
    email VARCHAR(255) NOT NULL,
    regulation_id UUID NOT NULL REFERENCES public.system_regulations(id) ON DELETE RESTRICT,
    regulation_version_code VARCHAR(50) NOT NULL,
    status VARCHAR(30) NOT NULL DEFAULT 'PENDING' CONSTRAINT chk_reg_intent_status CHECK (
        status IN ('PENDING', 'CONSUMED', 'EXPIRED')
    ),
    expires_at TIMESTAMPTZ NOT NULL,
    consumed_at TIMESTAMPTZ NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_reg_intents_token ON public.affiliate_registration_intents(intent_token);
CREATE INDEX IF NOT EXISTS idx_reg_intents_email ON public.affiliate_registration_intents(LOWER(email));
CREATE INDEX IF NOT EXISTS idx_reg_intents_status ON public.affiliate_registration_intents(status);

ALTER TABLE public.affiliate_registration_intents ENABLE ROW LEVEL SECURITY;

-- Chỉ có service_role backend được toàn quyền thao tác trên bảng intents
DROP POLICY IF EXISTS "Service Role Manage Registration Intents" ON public.affiliate_registration_intents;
CREATE POLICY "Service Role Manage Registration Intents"
    ON public.affiliate_registration_intents FOR ALL
    TO service_role
    USING (true)
    WITH CHECK (true);

-- 2. HÀM TẠO INTENT XÁC NHẬN ĐĂNG KÝ CHO BACKEND (RPC AN TOÀN)
CREATE OR REPLACE FUNCTION public.fn_create_registration_intent(
    p_intent_token VARCHAR(128),
    p_email VARCHAR(255),
    p_regulation_id UUID,
    p_ttl_minutes INTEGER DEFAULT 15
)
RETURNS JSONB AS $$
DECLARE
    v_reg public.system_regulations%ROWTYPE;
    v_settings public.system_settings%ROWTYPE;
    v_clean_email VARCHAR(255);
    v_expires_at TIMESTAMPTZ;
    v_intent_id UUID;
BEGIN
    v_clean_email := LOWER(TRIM(p_email));

    -- Kiểm tra trạng thái tiếp nhận đăng ký hiện hành
    SELECT * INTO v_settings FROM public.system_settings WHERE id = 1;
    IF NOT FOUND OR v_settings.allow_affiliate_registration = FALSE THEN
        RAISE EXCEPTION 'Hệ thống hiện đang tạm ngưng tiếp nhận đăng ký cộng tác viên mới.'
            USING ERRCODE = '22023';
    END IF;

    -- Kiểm tra quy chế tuyển sinh phải đang ở trạng thái ACTIVE và đã đến ngày hiệu lực
    SELECT * INTO v_reg FROM public.system_regulations WHERE id = p_regulation_id;
    IF NOT FOUND OR v_reg.status <> 'ACTIVE' OR v_reg.effective_date > NOW() THEN
        RAISE EXCEPTION 'Văn bản quy chế tuyển sinh không hợp lệ hoặc đã được cập nhật phiên bản mới.'
            USING ERRCODE = '22023';
    END IF;

    v_expires_at := NOW() + (p_ttl_minutes || ' minutes')::INTERVAL;

    INSERT INTO public.affiliate_registration_intents (
        intent_token,
        email,
        regulation_id,
        regulation_version_code,
        status,
        expires_at,
        created_at
    ) VALUES (
        p_intent_token,
        v_clean_email,
        v_reg.id,
        v_reg.version_code,
        'PENDING',
        v_expires_at,
        NOW()
    )
    RETURNING id INTO v_intent_id;

    RETURN jsonb_build_object(
        'success', TRUE,
        'intent_id', v_intent_id,
        'regulation_id', v_reg.id,
        'regulation_version_code', v_reg.version_code,
        'expires_at', v_expires_at
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp;

ALTER FUNCTION public.fn_create_registration_intent OWNER TO postgres;
REVOKE EXECUTE ON FUNCTION public.fn_create_registration_intent FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.fn_create_registration_intent TO service_role;

-- 3. CẬP NHẬT TRIGGER TẠO TÀI KHOẢN VÀ HỒ SƠ ĐỒNG BỘ CONSENT NGUYÊN TỬ
CREATE OR REPLACE FUNCTION public.handle_new_auth_user()
RETURNS TRIGGER AS $$
DECLARE
    v_gen_code VARCHAR(50);
    v_extracted_name VARCHAR(150);
    v_extracted_phone VARCHAR(20);
    v_extracted_id_card VARCHAR(30);
    v_extracted_occupation VARCHAR(150);
    v_extracted_address TEXT;
    v_intent_token VARCHAR(128);
    v_intent public.affiliate_registration_intents%ROWTYPE;
    v_settings public.system_settings%ROWTYPE;
    v_reg public.system_regulations%ROWTYPE;
    v_affiliate_id UUID;
    v_is_admin_bootstrap BOOLEAN := FALSE;
BEGIN
    -- Kiểm tra cờ ngoại lệ quản trị nội bộ (bootstrap admin/staff)
    IF current_setting('app.is_admin_bootstrap', true) = 'on' 
       OR current_user IN ('postgres', 'supabase_admin') THEN
        v_is_admin_bootstrap := TRUE;
    END IF;

    -- Trích xuất thông tin người dùng
    v_extracted_name := COALESCE(
        NULLIF(TRIM(NEW.raw_user_meta_data->>'full_name'), ''),
        NULLIF(TRIM(NEW.raw_user_meta_data->>'name'), ''),
        NULLIF(TRIM(split_part(COALESCE(NEW.email, ''), '@', 1)), ''),
        'Cộng tác viên'
    );
    v_extracted_phone := NULLIF(TRIM(NEW.raw_user_meta_data->>'phone'), '');
    v_extracted_id_card := NULLIF(TRIM(NEW.raw_user_meta_data->>'id_card_number'), '');
    v_extracted_occupation := NULLIF(TRIM(NEW.raw_user_meta_data->>'occupation'), '');
    v_extracted_address := NULLIF(TRIM(NEW.raw_user_meta_data->>'address'), '');
    v_intent_token := NULLIF(TRIM(NEW.raw_user_meta_data->>'registration_intent_token'), '');

    -- Nếu không phải phiên bootstrap quản trị nội bộ thì bắt buộc phải có registration intent
    IF NOT v_is_admin_bootstrap THEN
        IF v_intent_token IS NULL THEN
            -- Chặn đăng ký trực tiếp qua Supabase Auth Client bỏ qua kiểm tra quy chế backend
            RAISE EXCEPTION 'Bị từ chối: Đăng ký tài khoản CTV bắt buộc phải thực hiện qua Cổng tiếp nhận chính thức kèm xác thực quy chế tuyển sinh.'
                USING ERRCODE = '42501';
        END IF;

        -- 1. Khóa và kiểm chứng intent token
        SELECT * INTO v_intent 
        FROM public.affiliate_registration_intents
        WHERE intent_token = v_intent_token 
        FOR UPDATE;

        IF NOT FOUND THEN
            RAISE EXCEPTION 'Phiên xác thực đăng ký (Registration Intent) không tồn tại hoặc không hợp lệ.'
                USING ERRCODE = 'P0005';
        END IF;

        IF v_intent.status <> 'PENDING' THEN
            RAISE EXCEPTION 'Phiên xác thực đăng ký đã được sử dụng hoặc đã bị hủy.'
                USING ERRCODE = 'P0005';
        END IF;

        IF v_intent.expires_at < NOW() THEN
            RAISE EXCEPTION 'Phiên xác thực đăng ký đã hết hạn. Vui lòng gửi lại form đăng ký.'
                USING ERRCODE = 'P0005';
        END IF;

        IF LOWER(v_intent.email) <> LOWER(NEW.email) THEN
            RAISE EXCEPTION 'Thông tin email đăng ký không trùng khớp với phiên xác thực.'
                USING ERRCODE = 'P0005';
        END IF;

        -- 2. Khóa kiểm tra trạng thái tiếp nhận đăng ký hiện hành (Lock FOR SHARE)
        SELECT * INTO v_settings FROM public.system_settings WHERE id = 1 FOR SHARE;
        IF NOT FOUND OR v_settings.allow_affiliate_registration = FALSE THEN
            RAISE EXCEPTION 'Hệ thống hiện đang tạm ngưng tiếp nhận hồ sơ cộng tác viên mới.'
                USING ERRCODE = 'P0006';
        END IF;

        -- 3. Khóa kiểm tra phiên bản quy chế tuyển sinh (Lock FOR SHARE)
        SELECT * INTO v_reg FROM public.system_regulations WHERE id = v_intent.regulation_id FOR SHARE;
        IF NOT FOUND OR v_reg.status <> 'ACTIVE' OR v_reg.effective_date > NOW() THEN
            RAISE EXCEPTION 'Quy chế tuyển sinh đã được cập nhật phiên bản mới. Vui lòng xác nhận lại quy chế mới.'
                USING ERRCODE = 'P0007';
        END IF;
    END IF;

    -- 4. Tạo bản ghi public.profiles
    INSERT INTO public.profiles (
        id,
        email,
        full_name,
        phone,
        role,
        is_active,
        created_at,
        updated_at
    ) VALUES (
        NEW.id,
        NEW.email,
        v_extracted_name,
        v_extracted_phone,
        'affiliate',
        TRUE,
        NOW(),
        NOW()
    );

    -- 5. Sinh mã CTV duy nhất và tạo bản ghi public.affiliate_profiles
    v_gen_code := public.generate_unique_affiliate_code();

    INSERT INTO public.affiliate_profiles (
        user_id,
        affiliate_code,
        status,
        id_card_number,
        occupation,
        address,
        created_at,
        updated_at
    ) VALUES (
        NEW.id,
        v_gen_code,
        'PENDING_REVIEW',
        v_extracted_id_card,
        v_extracted_occupation,
        v_extracted_address,
        NOW(),
        NOW()
    )
    RETURNING id INTO v_affiliate_id;

    -- 6. Ghi nhận Consent đồng ý quy chế trong cùng Transaction
    IF NOT v_is_admin_bootstrap AND v_intent.regulation_id IS NOT NULL THEN
        INSERT INTO public.affiliate_regulation_consents (
            affiliate_profile_id,
            regulation_id,
            consented_at,
            client_ip,
            user_agent
        ) VALUES (
            v_affiliate_id,
            v_intent.regulation_id,
            NOW(),
            NULLIF(TRIM(NEW.raw_user_meta_data->>'client_ip'), ''),
            NULLIF(TRIM(NEW.raw_user_meta_data->>'user_agent'), '')
        )
        ON CONFLICT (affiliate_profile_id, regulation_id) DO NOTHING;

        -- 7. Tiêu thụ Intent
        UPDATE public.affiliate_registration_intents
        SET status = 'CONSUMED',
            consumed_at = NOW()
        WHERE id = v_intent.id;
    END IF;

    RETURN NEW;
EXCEPTION
    WHEN OTHERS THEN
        RAISE EXCEPTION 'Khởi tạo hồ sơ CTV và ghi nhận đồng ý quy chế thất bại cho User %: % (Mã: %)',
            NEW.id, SQLERRM, SQLSTATE
            USING ERRCODE = 'P0001';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp;

ALTER FUNCTION public.handle_new_auth_user() OWNER TO postgres;
REVOKE EXECUTE ON FUNCTION public.handle_new_auth_user() FROM PUBLIC, anon, authenticated;
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'supabase_auth_admin') THEN
        GRANT EXECUTE ON FUNCTION public.handle_new_auth_user() TO supabase_auth_admin;
    END IF;
END $$;
GRANT EXECUTE ON FUNCTION public.handle_new_auth_user() TO service_role;
