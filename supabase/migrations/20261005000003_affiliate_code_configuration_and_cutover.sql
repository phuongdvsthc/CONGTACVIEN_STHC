-- ==============================================================================
-- BƯỚC DB-A7.7: MIGRATION 20261005000003 - CẤU HÌNH VÀ CHUYỂN ĐỔI BỘ CẤP MÃ CTV
-- Dự án: Hệ thống Cộng tác viên Tuyển sinh Trường Saigontourist (STHC)
-- Mã file: /supabase/migrations/20261005000003_affiliate_code_configuration_and_cutover.sql
-- ==============================================================================
-- Mục đích chính:
--   1. Cập nhật trigger handle_new_auth_user() để sử dụng hàm cấp mã tự tăng 
--      nguyên tử chính thức public.fn_generate_next_affiliate_code(NEW.id) thay vì 
--      sinh ngẫu nhiên 4 số cũ.
--   2. Backfill các mã CTV legacy hiện có vào bảng public.affiliate_code_registry 
--      (idempotent, an toàn, không ghi đè, xử lý số suffix chính xác).
--   3. Đồng bộ sequence public.seq_affiliate_code_counter bằng setval với mốc 
--      lớn nhất đã tồn tại, đảm bảo không bao giờ cấp trùng hoặc lùi số.
-- ==============================================================================

-- 1. BACKFILL MÃ CTV LEGACY VÀO REGISTRY (NẾU CHƯA CÓ)
DO $$
DECLARE
    v_rec RECORD;
    v_num BIGINT;
    v_max_num BIGINT := 10000;
BEGIN
    -- Đảm bảo bảng affiliate_code_registry tồn tại
    CREATE TABLE IF NOT EXISTS public.affiliate_code_registry (
        affiliate_code VARCHAR(50) PRIMARY KEY,
        assigned_user_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
        sequence_number BIGINT NULL UNIQUE,
        source_type VARCHAR(20) NOT NULL DEFAULT 'NEW' CONSTRAINT chk_registry_source CHECK (source_type IN ('NEW', 'LEGACY')),
        issued_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );

    -- Đọc và backfill từng affiliate_code từ affiliate_profiles
    FOR v_rec IN 
        SELECT ap.user_id, ap.affiliate_code, ap.created_at
        FROM public.affiliate_profiles ap
        JOIN public.profiles p ON p.id = ap.user_id
        WHERE ap.affiliate_code IS NOT NULL
    LOOP
        -- Trích xuất số cuối từ mã legacy (ví dụ STHCCTV1088 -> 1088)
        BEGIN
            v_num := (REGEXP_MATCH(v_rec.affiliate_code, '([0-9]+)$'))[1]::BIGINT;
        EXCEPTION WHEN OTHERS THEN
            v_num := NULL;
        END;

        IF v_num IS NOT NULL AND v_num > v_max_num THEN
            v_max_num := v_num;
        END IF;

        -- Chèn vào registry nếu chưa có
        INSERT INTO public.affiliate_code_registry (
            affiliate_code,
            assigned_user_id,
            sequence_number,
            source_type,
            issued_at
        ) VALUES (
            v_rec.affiliate_code,
            v_rec.user_id,
            v_num,
            'LEGACY',
            COALESCE(v_rec.created_at, NOW())
        )
        ON CONFLICT (affiliate_code) DO UPDATE 
        SET assigned_user_id = COALESCE(public.affiliate_code_registry.assigned_user_id, EXCLUDED.assigned_user_id),
            sequence_number = COALESCE(public.affiliate_code_registry.sequence_number, EXCLUDED.sequence_number);
    END LOOP;

    -- Đồng bộ Sequence công bố mốc tiếp theo an toàn
    IF NOT EXISTS (SELECT 1 FROM pg_sequences WHERE schemaname = 'public' AND sequencename = 'seq_affiliate_code_counter') THEN
        CREATE SEQUENCE IF NOT EXISTS public.seq_affiliate_code_counter START WITH 10001 INCREMENT BY 1 NO CYCLE;
    END IF;

    PERFORM setval('public.seq_affiliate_code_counter', GREATEST(v_max_num, 10000) + 1, false);
END $$;

-- 2. CẬP NHẬT HÀM TRIGGER handle_new_auth_user() SỬ DỤNG BỘ CẤP MÃ MỚI
CREATE OR REPLACE FUNCTION public.handle_new_auth_user()
RETURNS TRIGGER AS $$
DECLARE
    v_gen_res JSONB;
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

    -- 5. Sinh mã CTV bằng hàm nguyên tử chuẩn (fn_generate_next_affiliate_code)
    -- Hàm này đã tự động chèn vào affiliate_code_registry trong cùng transaction
    v_gen_res := public.fn_generate_next_affiliate_code(NEW.id);
    v_gen_code := v_gen_res->>'affiliate_code';

    IF v_gen_code IS NULL THEN
        RAISE EXCEPTION 'Không thể sinh mã cộng tác viên mới từ bộ đếm hệ thống.'
            USING ERRCODE = 'P0002';
    END IF;

    -- 6. Tạo bản ghi public.affiliate_profiles với mã mới
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

    -- 7. Ghi nhận Consent đồng ý quy chế trong cùng Transaction
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

        -- 8. Tiêu thụ Intent
        UPDATE public.affiliate_registration_intents
        SET status = 'CONSUMED',
            consumed_at = NOW()
        WHERE id = v_intent.id;
    END IF;

    RETURN NEW;
EXCEPTION
    WHEN OTHERS THEN
        RAISE EXCEPTION 'Khởi tạo hồ sơ CTV và cấp mã thất bại cho User %: % (Mã: %)',
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
