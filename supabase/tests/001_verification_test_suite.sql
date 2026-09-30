-- ==============================================================================
-- BƯỚC DB-A1: TEST SUITE - BỘ KIỂM THỬ XÁC MINH CƠ SỞ DỮ LIỆU TOÀN DIỆN
-- Dự án: Hệ thống Cộng tác viên Tuyển sinh Trường Saigontourist (STHC)
-- Mã file: /supabase/tests/001_verification_test_suite.sql
-- Mục đích: Kiểm thử toàn bộ 6 yêu cầu chuẩn hóa DB-A1:
--   1. CTV tự đổi role / status bị từ chối.
--   2. CTV A không đọc được hồ sơ của CTV B.
--   3. Truy vấn hồ sơ profiles KHÔNG bị đệ quy RLS (CTV, Staff, Admin đều đọc an toàn).
--   4. Thao tác nguyên tử đối soát & tạo thưởng 500k; chặn trùng mã hồ sơ.
--   5. Tạo thưởng lệch lead (mismatched lead) bị khóa ngoại kết hợp từ chối.
--   6. Hủy ghép và đối soát lại cùng lead bảo toàn lịch sử VOIDED.
--   7. Lịch sử không bị mất: Xóa lead có liên kết đối soát/thưởng bị ON DELETE RESTRICT chặn đứng.
--   8. Rollback nguyên tử hoàn tất khi gặp lỗi giữa chừng.
-- ==============================================================================

BEGIN;

DO $$
DECLARE
    -- Giả lập ID người dùng
    v_user_ctv_a UUID := gen_random_uuid();
    v_user_ctv_b UUID := gen_random_uuid();
    v_user_staff UUID := gen_random_uuid();
    v_user_admin UUID := gen_random_uuid();

    v_aff_a_id UUID;
    v_aff_b_id UUID;
    v_course_id UUID;
    v_lead_1_id UUID;
    v_lead_2_id UUID;
    
    v_recon_result JSONB;
    v_void_result JSONB;
    v_approve_result JSONB;
    v_err_caught BOOLEAN := FALSE;
    v_recon_count INTEGER;
    v_reward_count INTEGER;
    v_profile_read_count INTEGER;
    v_recon_1_id UUID;
BEGIN
    RAISE NOTICE '=== BẮT ĐẦU KIỂM THỬ XÁC MINH KIẾN TRÚC CSDL SUPABASE STHC CTV (BƯỚC DB-A1) ===';

    -- --------------------------------------------------------------------------
    -- BƯỚC 1: KHỞI TẠO DỮ LIỆU THỬ NGHIỆM BAN ĐẦU
    -- --------------------------------------------------------------------------
    INSERT INTO public.courses (code, title, slug, department, degree_level, duration_text, is_active)
    VALUES ('TEST-BEP', 'Kỹ thuật Bếp Test', 'bep-test', 'Bếp', 'Trung cấp', '2 năm', TRUE)
    RETURNING id INTO v_course_id;

    INSERT INTO public.profiles (id, email, full_name, role, is_active) VALUES
    (v_user_ctv_a, 'ctv.a@test.com', 'Cộng tác viên A', 'affiliate', TRUE),
    (v_user_ctv_b, 'ctv.b@test.com', 'Cộng tác viên B', 'affiliate', TRUE),
    (v_user_staff, 'staff@test.com', 'Cán bộ Tuyển sinh', 'staff', TRUE),
    (v_user_admin, 'admin@test.com', 'Trưởng phòng Tuyển sinh', 'admin', TRUE);

    INSERT INTO public.affiliate_profiles (user_id, affiliate_code, status) VALUES
    (v_user_ctv_a, 'STHCCTV1111', 'ACTIVE')
    RETURNING id INTO v_aff_a_id;

    INSERT INTO public.affiliate_profiles (user_id, affiliate_code, status) VALUES
    (v_user_ctv_b, 'STHCCTV2222', 'PENDING_REVIEW')
    RETURNING id INTO v_aff_b_id;

    INSERT INTO public.leads (full_name, phone, course_id, affiliate_id, affiliate_code_captured, consent_accepted)
    VALUES ('Học viên 1', '0901111111', v_course_id, v_aff_a_id, 'STHCCTV1111', TRUE)
    RETURNING id INTO v_lead_1_id;

    INSERT INTO public.leads (full_name, phone, course_id, affiliate_id, affiliate_code_captured, consent_accepted)
    VALUES ('Học viên 2', '0902222222', v_course_id, v_aff_a_id, 'STHCCTV1111', TRUE)
    RETURNING id INTO v_lead_2_id;

    RAISE NOTICE '1. Khởi tạo dữ liệu giả lập thành công.';

    -- --------------------------------------------------------------------------
    -- TEST 1: CHẶN CTV TỰ THAY ĐỔI ROLE VÀ STATUS (REVOKE UPDATE & ANTI-ESCALATION)
    -- --------------------------------------------------------------------------
    PERFORM set_config('request.jwt.claim.sub', v_user_ctv_a::TEXT, true);
    PERFORM set_config('request.jwt.claim.role', 'authenticated', true);

    -- 1.1 CTV A cố tình tự sửa role thành admin
    v_err_caught := FALSE;
    BEGIN
        UPDATE public.profiles SET role = 'admin' WHERE id = v_user_ctv_a;
    EXCEPTION WHEN OTHERS THEN
        v_err_caught := TRUE;
    END;
    IF NOT v_err_caught THEN
        RAISE EXCEPTION 'TEST 1.1 THẤT BẠI: CTV A có thể tự ý sửa profiles.role!';
    END IF;
    RAISE NOTICE '2. [PASS] Test 1.1: Chặn thành công CTV tự sửa profiles.role (Permission denied).';

    -- 1.2 CTV B cố tình tự kích hoạt status thành ACTIVE
    PERFORM set_config('request.jwt.claim.sub', v_user_ctv_b::TEXT, true);
    v_err_caught := FALSE;
    BEGIN
        UPDATE public.affiliate_profiles SET status = 'ACTIVE' WHERE user_id = v_user_ctv_b;
    EXCEPTION WHEN OTHERS THEN
        v_err_caught := TRUE;
    END;
    IF NOT v_err_caught THEN
        RAISE EXCEPTION 'TEST 1.2 THẤT BẠI: CTV B có thể tự ý kích hoạt affiliate_profiles.status!';
    END IF;
    RAISE NOTICE '3. [PASS] Test 1.2: Chặn thành công CTV tự đổi affiliate_profiles.status.';

    -- --------------------------------------------------------------------------
    -- TEST 2: TRUY VẤN HỒ SƠ KHÔNG BỊ ĐỆ QUY RLS VÀ PHÂN LẬP DỮ LIỆU CTV
    -- --------------------------------------------------------------------------
    -- 2.1 CTV A đọc profiles: không bị lỗi đệ quy, chỉ đọc được đúng 1 dòng của chính mình
    PERFORM set_config('request.jwt.claim.sub', v_user_ctv_a::TEXT, true);
    SELECT COUNT(*) INTO v_profile_read_count FROM public.profiles;
    IF v_profile_read_count <> 1 THEN
        RAISE EXCEPTION 'TEST 2.1 THẤT BẠI: CTV A đọc được % dòng profiles (kỳ vọng chỉ 1 dòng của mình)!', v_profile_read_count;
    END IF;

    -- 2.2 CTV A cố tình truy vấn hồ sơ của CTV B
    SELECT COUNT(*) INTO v_profile_read_count FROM public.profiles WHERE id = v_user_ctv_b;
    IF v_profile_read_count <> 0 THEN
        RAISE EXCEPTION 'TEST 2.2 THẤT BẠI: CTV A đọc trộm được hồ sơ của CTV B!';
    END IF;
    RAISE NOTICE '4. [PASS] Test 2.1 & 2.2: CTV A đọc hồ sơ không bị đệ quy và bị chặn tuyệt đối khi đọc hồ sơ CTV B.';

    -- 2.3 Staff và Admin đọc profiles: không bị đệ quy, đọc được đầy đủ danh sách
    PERFORM set_config('request.jwt.claim.sub', v_user_staff::TEXT, true);
    SELECT COUNT(*) INTO v_profile_read_count FROM public.profiles;
    IF v_profile_read_count <> 4 THEN
        RAISE EXCEPTION 'TEST 2.3 THẤT BẠI: Staff không đọc đủ 4 profiles hoặc bị lỗi đệ quy!';
    END IF;

    PERFORM set_config('request.jwt.claim.sub', v_user_admin::TEXT, true);
    SELECT COUNT(*) INTO v_profile_read_count FROM public.profiles;
    IF v_profile_read_count <> 4 THEN
        RAISE EXCEPTION 'TEST 2.4 THẤT BẠI: Admin không đọc đủ 4 profiles hoặc bị lỗi đệ quy!';
    END IF;
    RAISE NOTICE '5. [PASS] Test 2.3 & 2.4: Staff và Admin đọc danh sách profiles hoàn toàn không bị lỗi đệ quy RLS.';

    -- --------------------------------------------------------------------------
    -- TEST 3: ĐỐI SOÁT HỒ SƠ & TỰ ĐỘNG SINH THƯỞNG 500K NGUYÊN TỬ
    -- --------------------------------------------------------------------------
    PERFORM set_config('request.jwt.claim.sub', v_user_staff::TEXT, true);

    v_recon_result := public.fn_reconcile_lead_and_create_reward(
        v_lead_1_id,
        v_user_staff,
        'STHC-2026-DH001',
        '26BEP001',
        14500000.00,
        'PT-001',
        NOW(),
        'Đối soát hồ sơ nộp đợt 1'
    );

    IF (v_recon_result->>'success')::BOOLEAN <> TRUE THEN
        RAISE EXCEPTION 'TEST 3 THẤT BẠI: fn_reconcile_lead_and_create_reward không thành công!';
    END IF;

    v_recon_1_id := (v_recon_result->>'reconciliation_id')::UUID;

    SELECT COUNT(*) INTO v_recon_count 
    FROM public.lead_reconciliations 
    WHERE lead_id = v_lead_1_id AND reconciliation_status = 'MATCHED_VALID';

    SELECT COUNT(*) INTO v_reward_count 
    FROM public.rewards 
    WHERE lead_id = v_lead_1_id AND status = 'PENDING_APPROVAL' AND amount = 500000.00;

    IF v_recon_count <> 1 OR v_reward_count <> 1 THEN
        RAISE EXCEPTION 'TEST 3 THẤT BẠI: Không sinh đủ 1 đối soát MATCHED_VALID và 1 thưởng 500k!';
    END IF;
    RAISE NOTICE '6. [PASS] Test 3: Thao tác nguyên tử đối soát & sinh thưởng 500k thành công.';

    -- --------------------------------------------------------------------------
    -- TEST 4: CHẶN TẠO THƯỞNG LỆCH LEAD_ID (COMPOSITE FOREIGN KEY INTEGRITY)
    -- --------------------------------------------------------------------------
    -- Thử chèn thủ công một khoản thưởng lấy reconciliation_id của Lead 1 nhưng gán lead_id của Lead 2
    v_err_caught := FALSE;
    BEGIN
        INSERT INTO public.rewards (
            lead_id,
            reconciliation_id,
            affiliate_id,
            amount,
            status
        ) VALUES (
            v_lead_2_id,      -- LỆCH LEAD: v_recon_1_id thuộc Lead 1 chứ không phải Lead 2!
            v_recon_1_id,
            v_aff_a_id,
            500000.00,
            'PENDING_APPROVAL'
        );
    EXCEPTION WHEN OTHERS THEN
        v_err_caught := TRUE;
    END;

    IF NOT v_err_caught THEN
        RAISE EXCEPTION 'TEST 4 THẤT BẠI: Khóa ngoại kết hợp không chặn được việc tạo thưởng lệch lead_id!';
    END IF;
    RAISE NOTICE '7. [PASS] Test 4: Khóa ngoại kết hợp (reconciliation_id, lead_id) chặn đứng 100% lỗi lệch lead_id.';

    -- --------------------------------------------------------------------------
    -- TEST 5: CHẶN GHÉP TRÙNG MÃ HỒ SƠ TUYỂN SINH (PARTIAL UNIQUE INDEX)
    -- --------------------------------------------------------------------------
    v_err_caught := FALSE;
    BEGIN
        PERFORM public.fn_reconcile_lead_and_create_reward(
            v_lead_2_id,
            v_user_staff,
            'STHC-2026-DH001', -- Mã hồ sơ đang hợp lệ của Lead 1
            '26BEP002',
            14500000.00,
            'PT-002',
            NOW(),
            'Ghép thử mã trùng'
        );
    EXCEPTION WHEN OTHERS THEN
        v_err_caught := TRUE;
    END;

    IF NOT v_err_caught THEN
        RAISE EXCEPTION 'TEST 5 THẤT BẠI: Hệ thống cho phép 2 lead ghép cùng 1 mã hồ sơ!';
    END IF;
    RAISE NOTICE '8. [PASS] Test 5: Chỉ mục duy nhất có điều kiện chặn thành công ghép trùng mã hồ sơ.';

    -- --------------------------------------------------------------------------
    -- TEST 6: DUYỆT THƯỞNG, HỦY GHÉP NHẦM VÀ ĐỐI SOÁT LẠI (BẢO TOÀN LỊCH SỬ)
    -- --------------------------------------------------------------------------
    -- 6.1 Admin duyệt thưởng Lead 1
    PERFORM set_config('request.jwt.claim.sub', v_user_admin::TEXT, true);
    v_approve_result := public.fn_approve_reward((v_recon_result->>'reward_id')::UUID, v_user_admin);
    IF (v_approve_result->>'success')::BOOLEAN <> TRUE THEN
        RAISE EXCEPTION 'TEST 6.1 THẤT BẠI: Phê duyệt thưởng không thành công!';
    END IF;

    -- 6.2 Hủy ghép đối soát do phát hiện nhầm lẫn
    PERFORM set_config('request.jwt.claim.sub', v_user_staff::TEXT, true);
    v_void_result := public.fn_void_reconciliation_and_reward(
        v_lead_1_id,
        v_user_staff,
        'Cán bộ nhập nhầm mã hồ sơ của sinh viên khác'
    );
    IF (v_void_result->>'success')::BOOLEAN <> TRUE THEN
        RAISE EXCEPTION 'TEST 6.2 THẤT BẠI: Hủy ghép đối soát thất bại!';
    END IF;

    -- 6.3 Đối soát lại cho chính Lead 1 với mã hồ sơ đúng mới
    v_recon_result := public.fn_reconcile_lead_and_create_reward(
        v_lead_1_id,
        v_user_staff,
        'STHC-2026-DH001-DUNG',
        '26BEP001',
        14500000.00,
        'PT-001B',
        NOW(),
        'Đối soát lại với mã hồ sơ chính xác'
    );

    SELECT COUNT(*) INTO v_recon_count FROM public.lead_reconciliations WHERE lead_id = v_lead_1_id;
    SELECT COUNT(*) INTO v_reward_count FROM public.rewards WHERE lead_id = v_lead_1_id;
    IF v_recon_count <> 2 OR v_reward_count <> 2 THEN
        RAISE EXCEPTION 'TEST 6.3 THẤT BẠI: Không bảo toàn được 2 bản ghi lịch sử đối soát và thưởng!';
    END IF;
    RAISE NOTICE '9. [PASS] Test 6: Hủy ghép và đối soát lại cùng Lead thành công, lưu giữ trọn vẹn lịch sử VOIDED.';

    -- --------------------------------------------------------------------------
    -- TEST 7: BẢO VỆ LỊCH SỬ KHI XỬ LÝ LEAD (ON DELETE RESTRICT)
    -- --------------------------------------------------------------------------
    -- Cố tình xóa Lead 1 khi đã có lịch sử đối soát và thưởng
    v_err_caught := FALSE;
    BEGIN
        DELETE FROM public.leads WHERE id = v_lead_1_id;
    EXCEPTION WHEN OTHERS THEN
        v_err_caught := TRUE;
    END;

    IF NOT v_err_caught THEN
        RAISE EXCEPTION 'TEST 7 THẤT BẠI: Hệ thống cho phép xóa lead có lịch sử đối soát/thưởng liên kết!';
    END IF;
    RAISE NOTICE '10. [PASS] Test 7: ON DELETE RESTRICT chặn đứng hành vi xóa lead làm mất dấu vết đối soát & thưởng.';

    -- --------------------------------------------------------------------------
    -- TEST 8: HOÀN TÁC TOÀN BỘ KHI CÓ LỖI (ATOMIC ROLLBACK)
    -- --------------------------------------------------------------------------
    v_err_caught := FALSE;
    BEGIN
        PERFORM public.fn_reconcile_lead_and_create_reward(
            v_lead_2_id,
            v_user_staff,
            'STHC-2026-ERR',
            'ERROR_STUDENT',
            -50000.00, -- Học phí âm gây lỗi
            'ERR-PT',
            NOW(),
            'Thử nghiệm lỗi dở dang'
        );
    EXCEPTION WHEN OTHERS THEN
        v_err_caught := TRUE;
    END;

    SELECT COUNT(*) INTO v_recon_count FROM public.lead_reconciliations WHERE lead_id = v_lead_2_id;
    SELECT COUNT(*) INTO v_reward_count FROM public.rewards WHERE lead_id = v_lead_2_id;
    IF v_recon_count <> 0 OR v_reward_count <> 0 THEN
        RAISE EXCEPTION 'TEST 8 THẤT BẠI: Lỗi giữa chừng để lại bản ghi rác dở dang!';
    END IF;
    RAISE NOTICE '11. [PASS] Test 8: Rollback nguyên tử hoàn tất, không để lại bất kỳ dữ liệu rác nào.';

    RAISE NOTICE '=== TOÀN BỘ CÁC CA KIỂM THỬ XÁC MINH CƠ SỞ DỮ LIỆU ĐỀU ĐẠT CHUẨN 100% ===';
END $$;

ROLLBACK;
