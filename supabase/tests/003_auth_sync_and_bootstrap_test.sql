-- ==============================================================================
-- BỘ KIỂM THỬ XÁC MINH SQL EDITOR CHO BƯỚC DB-C: ĐỒNG BỘ AUTH & BOOTSTRAP ADMIN
-- Dự án: Hệ thống Cộng tác viên Tuyển sinh Trường Saigontourist (STHC)
-- File: /supabase/tests/003_auth_sync_and_bootstrap_test.sql
-- ==============================================================================
-- Hướng dẫn:
-- Mở tab SQL Editor trong Supabase Dashboard của dự án thử nghiệm CTV,
-- dán toàn bộ nội dung file này và nhấn RUN. Toàn bộ kịch bản kiểm thử sẽ
-- chạy trong 1 TRANSACTION an toàn và tự động ROLLBACK để không làm bẩn dữ liệu.
-- ==============================================================================

BEGIN;

DO $$
DECLARE
    v_test_user_id UUID := gen_random_uuid();
    v_test_admin_id UUID := gen_random_uuid();
    v_profile_rec RECORD;
    v_affiliate_rec RECORD;
    v_escalation_error BOOLEAN := FALSE;
    v_status_error BOOLEAN := FALSE;
    v_backfill_result JSONB;
BEGIN
    RAISE NOTICE '====================================================================';
    RAISE NOTICE ' BẮT ĐẦU KIỂM THỬ TÍCH HỢP DB-C: ĐỒNG BỘ AUTH & BOOTSTRAP ADMIN';
    RAISE NOTICE '====================================================================';

    -- --------------------------------------------------------------------------
    -- 1. KIỂM THỬ TRIGGER: TẠO HỒ SƠ KHI ĐĂNG KÝ VỚI METADATA GIẢ MẠO
    -- --------------------------------------------------------------------------
    RAISE NOTICE '[CA C1]: Giả lập người dùng đăng ký gửi kèm metadata giả mạo đặc quyền...';

    -- Giả lập INSERT vào auth.users với metadata giả role=admin, status=ACTIVE, code=FAKE
    INSERT INTO auth.users (
        id,
        instance_id,
        aud,
        role,
        email,
        encrypted_password,
        email_confirmed_at,
        raw_app_meta_data,
        raw_user_meta_data,
        created_at,
        updated_at
    ) VALUES (
        v_test_user_id,
        '00000000-0000-0000-0000-000000000000',
        'authenticated',
        'authenticated',
        'ctv_fake_meta@example.test',
        crypt('dummy_password', gen_salt('bf')),
        NOW(),
        '{"provider":"email","providers":["email"]}'::jsonb,
        jsonb_build_object(
            'full_name', 'Nguyễn Văn Giả Mạo',
            'role', 'admin',                      -- Cố tình giả mạo role admin
            'status', 'ACTIVE',                   -- Cố tình giả mạo status ACTIVE
            'affiliate_code', 'FAKE_CODE_9999',  -- Cố tình giả mạo mã CTV
            'is_active', FALSE
        ),
        NOW(),
        NOW()
    );

    -- Kiểm tra bản ghi public.profiles được sinh ra
    SELECT * INTO v_profile_rec FROM public.profiles WHERE id = v_test_user_id;
    IF v_profile_rec.id IS NULL THEN
        RAISE EXCEPTION 'THẤT BẠI: Trigger không tự tạo bản ghi trong public.profiles!';
    END IF;

    IF v_profile_rec.role <> 'affiliate' OR v_profile_rec.is_active <> TRUE THEN
        RAISE EXCEPTION 'THẤT BẠI: profiles.role hoặc is_active bị nhận từ metadata giả! Hiện tại: role=%, is_active=%',
            v_profile_rec.role, v_profile_rec.is_active;
    ELSE
        RAISE NOTICE '  -> [PASS C1.1]: profiles.role = affiliate, is_active = true (Bỏ qua metadata role=admin).';
    END IF;

    -- Kiểm tra bản ghi public.affiliate_profiles được sinh ra
    SELECT * INTO v_affiliate_rec FROM public.affiliate_profiles WHERE user_id = v_test_user_id;
    IF v_affiliate_rec.id IS NULL THEN
        RAISE EXCEPTION 'THẤT BẠI: Trigger không tự tạo bản ghi trong public.affiliate_profiles!';
    END IF;

    IF v_affiliate_rec.status <> 'PENDING_REVIEW' THEN
        RAISE EXCEPTION 'THẤT BẠI: status không phải PENDING_REVIEW! Hiện tại: %', v_affiliate_rec.status;
    ELSE
        RAISE NOTICE '  -> [PASS C1.2]: affiliate_profiles.status = PENDING_REVIEW (Bỏ qua metadata status=ACTIVE).';
    END IF;

    IF v_affiliate_rec.affiliate_code NOT LIKE 'STHCCTV%' OR v_affiliate_rec.affiliate_code = 'FAKE_CODE_9999' THEN
        RAISE EXCEPTION 'THẤT BẠI: Mã CTV không đúng format hoặc bị nhận mã giả! Hiện tại: %', v_affiliate_rec.affiliate_code;
    ELSE
        RAISE NOTICE '  -> [PASS C1.3]: Mã CTV sinh chuẩn tự động: % (Bỏ qua mã giả FAKE_CODE_9999).', v_affiliate_rec.affiliate_code;
    END IF;

    -- --------------------------------------------------------------------------
    -- 2. KIỂM THỬ ĐỒNG BỘ EMAIL KHI USER THAY ĐỔI EMAIL
    -- --------------------------------------------------------------------------
    RAISE NOTICE '[CA C2]: Kiểm tra đồng bộ email khi auth.users thay đổi email...';
    UPDATE auth.users
    SET email = 'ctv_new_email@example.test', updated_at = NOW()
    WHERE id = v_test_user_id;

    SELECT email INTO v_profile_rec FROM public.profiles WHERE id = v_test_user_id;
    IF v_profile_rec.email <> 'ctv_new_email@example.test' THEN
        RAISE EXCEPTION 'THẤT BẠI: Email trong public.profiles không tự đồng bộ! Hiện tại: %', v_profile_rec.email;
    ELSE
        RAISE NOTICE '  -> [PASS C2.1]: Email trong public.profiles đã tự động đồng bộ sang email mới: %', v_profile_rec.email;
    END IF;

    -- --------------------------------------------------------------------------
    -- 3. KIỂM THỬ CHỐNG LEO THANG ĐẶC QUYỀN (ANTI-PRIVILEGE ESCALATION)
    -- --------------------------------------------------------------------------
    RAISE NOTICE '[CA C3]: Giả lập phiên authenticated của CTV và thử tự nâng quyền...';
    -- Đặt context phiên làm việc thành authenticated với user_id của CTV
    PERFORM set_config('role', 'authenticated', true);
    PERFORM set_config('request.jwt.claim.sub', v_test_user_id::text, true);
    PERFORM set_config('request.jwt.claim.role', 'authenticated', true);

    -- 3.1 Thử đổi profiles.role thành 'admin'
    BEGIN
        UPDATE public.profiles
        SET role = 'admin'
        WHERE id = v_test_user_id;
    EXCEPTION
        WHEN insufficient_privilege OR OTHERS THEN
            v_escalation_error := TRUE;
    END;

    IF NOT v_escalation_error THEN
        RAISE EXCEPTION 'THẤT BẠI BẢO MẬT: CTV tự đổi role thành admin mà không bị chặn!';
    ELSE
        RAISE NOTICE '  -> [PASS C3.1]: CTV tự sửa profiles.role = admin bị trigger chặn thành công.';
    END IF;

    -- 3.2 Thử đổi affiliate_profiles.status thành 'ACTIVE'
    BEGIN
        UPDATE public.affiliate_profiles
        SET status = 'ACTIVE'
        WHERE user_id = v_test_user_id;
    EXCEPTION
        WHEN insufficient_privilege OR OTHERS THEN
            v_status_error := TRUE;
    END;

    IF NOT v_status_error THEN
        RAISE EXCEPTION 'THẤT BẠI BẢO MẬT: CTV tự đổi status thành ACTIVE mà không bị chặn!';
    ELSE
        RAISE NOTICE '  -> [PASS C3.2]: CTV tự duyệt status = ACTIVE bị trigger chặn thành công.';
    END IF;

    -- Reset context về postgres (super-user / service_role)
    PERFORM set_config('role', 'postgres', true);

    -- --------------------------------------------------------------------------
    -- 4. KIỂM THỬ THỦ TỤC ĐỐI CHIẾU & BỔ SUNG HỒ SƠ THIẾU (BACKFILL IDEMPOTENT)
    -- --------------------------------------------------------------------------
    RAISE NOTICE '[CA C4]: Kiểm tra thủ tục sync_missing_auth_profiles()...';
    -- Chạy lần 1:
    v_backfill_result := public.sync_missing_auth_profiles();
    RAISE NOTICE '  -> Kết quả chạy đối chiếu lần 1: %', v_backfill_result;

    -- Chạy lần 2 (Kiểm tra idempotent, không tạo trùng):
    v_backfill_result := public.sync_missing_auth_profiles();
    IF (v_backfill_result->>'missing_profiles_synced')::int > 0 THEN
        RAISE EXCEPTION 'THẤT BẠI: Chạy lại sync_missing_auth_profiles tạo trùng lặp bản ghi!';
    ELSE
        RAISE NOTICE '  -> [PASS C4.1]: Chạy lại lần 2 an toàn (Idempotent PASS, không tạo trùng).';
    END IF;

    RAISE NOTICE '====================================================================';
    RAISE NOTICE ' TẤT CẢ CÁC CA KIỂM THỬ DB-C TRONG SQL ĐÃ ĐẠT (PASS HOÀN TOÀN)!';
    RAISE NOTICE '====================================================================';
END $$;

-- Tự động ROLLBACK để không lưu dữ liệu thử nghiệm trong CSDL
ROLLBACK;
