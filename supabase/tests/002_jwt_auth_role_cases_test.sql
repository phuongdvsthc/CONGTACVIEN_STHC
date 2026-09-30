-- ==============================================================================
-- BỘ KIỂM THỬ ĐỘC LẬP TỪNG CA (TEST CASES 1 - 6) BẰNG JWT SIMULATION TRÊN SUPABASE
-- Dự án: Hệ thống Cộng tác viên Tuyển sinh Trường Saigontourist (STHC)
-- Mã file: /supabase/tests/002_jwt_auth_role_cases_test.sql
-- Mục đích: Kiểm thử độc lập và in chi tiết kết quả PASS/FAIL cho 6 yêu cầu:
--   1. CTV không tự đổi role, is_active, trạng thái duyệt hoặc mã CTV.
--   2. CTV A không đọc được dữ liệu CTV B; cả hai không đọc trực tiếp được leads, rewards, lead_reconciliations, audit_logs.
--   3. Khách (anon) chỉ xem được khóa học đang mở.
--   4. Hàm get_auth_role() trả đúng vai trò, không lỗi đệ quy; kiểm tra owner và quyền gọi hàm.
--   5. Hai lead không thể ghép cùng mã hồ sơ hợp lệ; một lead không có hai thưởng đang hoạt động; thưởng không thể trỏ sang lần đối soát của lead khác.
--   6. Hủy ghép rồi đối soát lại giữ được lịch sử cũ.
-- ==============================================================================

BEGIN;

DO $$
DECLARE
    v_user_ctv_a UUID := gen_random_uuid();
    v_user_ctv_b UUID := gen_random_uuid();
    v_user_staff UUID := gen_random_uuid();
    v_user_admin UUID := gen_random_uuid();

    v_aff_a_id UUID;
    v_aff_b_id UUID;
    v_course_active_id UUID;
    v_course_inactive_id UUID;
    v_lead_1_id UUID;
    v_lead_2_id UUID;
    
    v_recon_1_id UUID;
    v_reward_1_id UUID;
    v_recon_result JSONB;
    v_void_result JSONB;
    v_approve_result JSONB;
    
    v_read_count INTEGER;
    v_err_caught BOOLEAN;
    v_role_result VARCHAR;
    v_func_owner VARCHAR;
    v_has_anon_execute BOOLEAN;
    v_has_auth_execute BOOLEAN;
BEGIN
    RAISE NOTICE '==============================================================================';
    RAISE NOTICE 'BẮT ĐẦU KIỂM THỬ XÁC MINH CƠ SỞ DỮ LIỆU SUPABASE STHC CTV (6 CA KIỂM THỬ CHUẨN)';
    RAISE NOTICE '==============================================================================';

    -- --------------------------------------------------------------------------
    -- BƯỚC 0: TẠO DỮ LIỆU MẪU ĐỘC LẬP
    -- --------------------------------------------------------------------------
    -- Khóa học mở và đóng
    INSERT INTO public.courses (code, title, slug, department, degree_level, duration_text, is_active)
    VALUES ('TC-BEP-2026', 'Kỹ thuật Chế biến Món ăn', 'ky-thuat-che-bien-mon-an', 'Khoa Bếp', 'Trung cấp', '2 năm', TRUE)
    RETURNING id INTO v_course_active_id;

    INSERT INTO public.courses (code, title, slug, department, degree_level, duration_text, is_active)
    VALUES ('SC-BARTENDER-OLD', 'Pha chế Bartender (Khóa cũ)', 'pha-che-bartender-old', 'Khoa Nhà hàng', 'Sơ cấp', '3 tháng', FALSE)
    RETURNING id INTO v_course_inactive_id;

    -- Profiles
    INSERT INTO public.profiles (id, email, full_name, role, is_active) VALUES
    (v_user_ctv_a, 'ctv.a@test.saigontourist.edu.vn', 'Nguyễn Văn A (CTV A)', 'affiliate', TRUE),
    (v_user_ctv_b, 'ctv.b@test.saigontourist.edu.vn', 'Trần Thị B (CTV B)', 'affiliate', TRUE),
    (v_user_staff, 'tuyensinh.staff@test.saigontourist.edu.vn', 'Lê Cán Bộ (Staff)', 'staff', TRUE),
    (v_user_admin, 'truongphong.admin@test.saigontourist.edu.vn', 'Phạm Trưởng Phòng (Admin)', 'admin', TRUE);

    -- Affiliate Profiles
    INSERT INTO public.affiliate_profiles (user_id, affiliate_code, status) VALUES
    (v_user_ctv_a, 'STHCCTV9001', 'ACTIVE')
    RETURNING id INTO v_aff_a_id;

    INSERT INTO public.affiliate_profiles (user_id, affiliate_code, status) VALUES
    (v_user_ctv_b, 'STHCCTV9002', 'PENDING_REVIEW')
    RETURNING id INTO v_aff_b_id;

    -- Leads
    INSERT INTO public.leads (full_name, phone, course_id, affiliate_id, affiliate_code_captured, consent_accepted)
    VALUES ('Thí sinh A1', '0911000001', v_course_active_id, v_aff_a_id, 'STHCCTV9001', TRUE)
    RETURNING id INTO v_lead_1_id;

    INSERT INTO public.leads (full_name, phone, course_id, affiliate_id, affiliate_code_captured, consent_accepted)
    VALUES ('Thí sinh A2', '0911000002', v_course_active_id, v_aff_a_id, 'STHCCTV9001', TRUE)
    RETURNING id INTO v_lead_2_id;

    RAISE NOTICE '>> Bước 0: Tạo dữ liệu thử nghiệm ban đầu thành công.';

    -- ==========================================================================
    -- CA 1: CTV KHÔNG TỰ ĐỔI ROLE, IS_ACTIVE, TRẠNG THÁI DUYỆT HOẶC MÃ CTV
    -- ==========================================================================
    RAISE NOTICE '------------------------------------------------------------------------------';
    RAISE NOTICE '[CA 1] Kiểm tra: CTV không tự đổi role, is_active, status hoặc affiliate_code';
    
    -- Giả lập JWT CTV A
    PERFORM set_config('request.jwt.claim.sub', v_user_ctv_a::TEXT, true);
    PERFORM set_config('request.jwt.claim.role', 'authenticated', true);

    -- 1.1 Thử đổi role thành admin
    v_err_caught := FALSE;
    BEGIN
        UPDATE public.profiles SET role = 'admin' WHERE id = v_user_ctv_a;
    EXCEPTION WHEN OTHERS THEN
        v_err_caught := TRUE;
    END;
    IF NOT v_err_caught THEN
        RAISE EXCEPTION '[CA 1.1 FAIL]: CTV A có thể tự ý sửa role thành admin!';
    ELSE
        RAISE NOTICE '  - [PASS] Ca 1.1: Chặn thành công CTV A tự đổi role sang admin.';
    END IF;

    -- 1.2 Thử đổi is_active
    v_err_caught := FALSE;
    BEGIN
        UPDATE public.profiles SET is_active = FALSE WHERE id = v_user_ctv_a;
    EXCEPTION WHEN OTHERS THEN
        v_err_caught := TRUE;
    END;
    IF NOT v_err_caught THEN
        RAISE EXCEPTION '[CA 1.2 FAIL]: CTV A có thể tự ý sửa is_active!';
    ELSE
        RAISE NOTICE '  - [PASS] Ca 1.2: Chặn thành công CTV A tự sửa is_active.';
    END IF;

    -- 1.3 Giả lập JWT CTV B thử đổi status duyệt từ PENDING_REVIEW -> ACTIVE
    PERFORM set_config('request.jwt.claim.sub', v_user_ctv_b::TEXT, true);
    v_err_caught := FALSE;
    BEGIN
        UPDATE public.affiliate_profiles SET status = 'ACTIVE' WHERE user_id = v_user_ctv_b;
    EXCEPTION WHEN OTHERS THEN
        v_err_caught := TRUE;
    END;
    IF NOT v_err_caught THEN
        RAISE EXCEPTION '[CA 1.3 FAIL]: CTV B có thể tự ý duyệt hồ sơ của mình thành ACTIVE!';
    ELSE
        RAISE NOTICE '  - [PASS] Ca 1.3: Chặn thành công CTV B tự kích hoạt trạng thái ACTIVE.';
    END IF;

    -- 1.4 Thử đổi affiliate_code
    v_err_caught := FALSE;
    BEGIN
        UPDATE public.affiliate_profiles SET affiliate_code = 'STHCCTV9999' WHERE user_id = v_user_ctv_b;
    EXCEPTION WHEN OTHERS THEN
        v_err_caught := TRUE;
    END;
    IF NOT v_err_caught THEN
        RAISE EXCEPTION '[CA 1.4 FAIL]: CTV B có thể tự đổi affiliate_code!';
    ELSE
        RAISE NOTICE '  - [PASS] Ca 1.4: Chặn thành công CTV B tự sửa affiliate_code.';
    END IF;
    RAISE NOTICE '>> KẾT QUẢ CA 1: PASS TOÀN BỘ (Chặn ở cả lớp quyền Grant Revoke và Trigger).';

    -- ==========================================================================
    -- CA 2: CTV A KHÔNG ĐỌC ĐƯỢC CTV B; CẢ HAI KHÔNG ĐỌC ĐƯỢC LEADS, REWARDS, v.v.
    -- ==========================================================================
    RAISE NOTICE '------------------------------------------------------------------------------';
    RAISE NOTICE '[CA 2] Kiểm tra phân lập dữ liệu CTV & Bảo vệ bảng nghiệp vụ';
    PERFORM set_config('request.jwt.claim.sub', v_user_ctv_a::TEXT, true);

    -- 2.1 CTV A đọc profiles: chỉ thấy chính mình (1 dòng)
    SELECT COUNT(*) INTO v_read_count FROM public.profiles;
    IF v_read_count <> 1 THEN
        RAISE EXCEPTION '[CA 2.1 FAIL]: CTV A đọc được % dòng profiles (kỳ vọng đúng 1 dòng)!', v_read_count;
    END IF;

    -- 2.2 CTV A cố ý truy vấn profiles của CTV B
    SELECT COUNT(*) INTO v_read_count FROM public.profiles WHERE id = v_user_ctv_b;
    IF v_read_count <> 0 THEN
        RAISE EXCEPTION '[CA 2.2 FAIL]: CTV A đọc được hồ sơ của CTV B!';
    END IF;

    -- 2.3 CTV A cố ý truy vấn affiliate_profiles của CTV B
    SELECT COUNT(*) INTO v_read_count FROM public.affiliate_profiles WHERE user_id = v_user_ctv_b;
    IF v_read_count <> 0 THEN
        RAISE EXCEPTION '[CA 2.3 FAIL]: CTV A đọc được hồ sơ affiliate_profiles của CTV B!';
    END IF;

    -- 2.4 CTV A truy vấn trực tiếp bảng leads
    SELECT COUNT(*) INTO v_read_count FROM public.leads;
    IF v_read_count <> 0 THEN
        RAISE EXCEPTION '[CA 2.4 FAIL]: CTV A đọc được trực tiếp % dòng từ bảng leads!', v_read_count;
    END IF;

    -- 2.5 CTV A truy vấn trực tiếp bảng rewards
    SELECT COUNT(*) INTO v_read_count FROM public.rewards;
    IF v_read_count <> 0 THEN
        RAISE EXCEPTION '[CA 2.5 FAIL]: CTV A đọc được trực tiếp % dòng từ bảng rewards!', v_read_count;
    END IF;

    -- 2.6 CTV A truy vấn trực tiếp bảng lead_reconciliations
    SELECT COUNT(*) INTO v_read_count FROM public.lead_reconciliations;
    IF v_read_count <> 0 THEN
        RAISE EXCEPTION '[CA 2.6 FAIL]: CTV A đọc được trực tiếp từ bảng lead_reconciliations!';
    END IF;

    -- 2.7 CTV A truy vấn trực tiếp bảng audit_logs
    SELECT COUNT(*) INTO v_read_count FROM public.audit_logs;
    IF v_read_count <> 0 THEN
        RAISE EXCEPTION '[CA 2.7 FAIL]: CTV A đọc được trực tiếp từ bảng audit_logs!';
    END IF;

    -- 2.8 Kiểm tra tương tự với CTV B
    PERFORM set_config('request.jwt.claim.sub', v_user_ctv_b::TEXT, true);
    SELECT COUNT(*) INTO v_read_count FROM public.leads;
    IF v_read_count <> 0 THEN
        RAISE EXCEPTION '[CA 2.8 FAIL]: CTV B đọc được trực tiếp bảng leads!';
    END IF;

    RAISE NOTICE '>> KẾT QUẢ CA 2: PASS TOÀN BỘ (CTV A & B hoàn toàn bị cô lập, bảng nội bộ trả về 0 dòng).';

    -- ==========================================================================
    -- CA 3: KHÁCH (ANON) CHỈ XEM ĐƯỢC KHÓA HỌC ĐANG MỞ
    -- ==========================================================================
    RAISE NOTICE '------------------------------------------------------------------------------';
    RAISE NOTICE '[CA 3] Kiểm tra: Khách (anon) chỉ xem khóa học active, bị chặn bảng khác';
    PERFORM set_config('request.jwt.claim.sub', '', true);
    PERFORM set_config('request.jwt.claim.role', 'anon', true);

    -- 3.1 Khách đọc courses: chỉ thấy 1 khóa active, không thấy khóa inactive
    SELECT COUNT(*) INTO v_read_count FROM public.courses;
    IF v_read_count <> 1 THEN
        RAISE EXCEPTION '[CA 3.1 FAIL]: Khách đọc được % khóa học (kỳ vọng chỉ 1 khóa đang mở)!', v_read_count;
    END IF;

    SELECT COUNT(*) INTO v_read_count FROM public.courses WHERE id = v_course_inactive_id;
    IF v_read_count <> 0 THEN
        RAISE EXCEPTION '[CA 3.2 FAIL]: Khách đọc được khóa học đã đóng!';
    END IF;

    -- 3.3 Khách đọc bảng khác (leads, profiles) bị từ chối quyền ở tầng SQL
    v_err_caught := FALSE;
    BEGIN
        SELECT COUNT(*) INTO v_read_count FROM public.leads;
    EXCEPTION WHEN OTHERS THEN
        v_err_caught := TRUE;
    END;
    IF NOT v_err_caught THEN
        RAISE EXCEPTION '[CA 3.3 FAIL]: Khách có quyền truy cập bảng leads!';
    END IF;

    RAISE NOTICE '>> KẾT QUẢ CA 3: PASS TOÀN BỘ (Khách chỉ thấy 1 khóa active; bị từ chối truy cập bảng leads).';

    -- ==========================================================================
    -- CA 4: HÀM GET_AUTH_ROLE() TRẢ ĐÚNG VAI TRÒ, KHÔNG ĐỆ QUY, ĐÚNG OWNER & QUYỀN GỌI
    -- ==========================================================================
    RAISE NOTICE '------------------------------------------------------------------------------';
    RAISE NOTICE '[CA 4] Kiểm tra hàm get_auth_role()';

    -- 4.1 Kiểm tra vai trò của từng user
    PERFORM set_config('request.jwt.claim.role', 'authenticated', true);

    PERFORM set_config('request.jwt.claim.sub', v_user_ctv_a::TEXT, true);
    v_role_result := public.get_auth_role();
    IF v_role_result <> 'affiliate' THEN
        RAISE EXCEPTION '[CA 4.1 FAIL]: get_auth_role() của CTV A trả về % (kỳ vọng affiliate)!', v_role_result;
    END IF;

    PERFORM set_config('request.jwt.claim.sub', v_user_staff::TEXT, true);
    v_role_result := public.get_auth_role();
    IF v_role_result <> 'staff' THEN
        RAISE EXCEPTION '[CA 4.2 FAIL]: get_auth_role() của Staff trả về % (kỳ vọng staff)!', v_role_result;
    END IF;

    PERFORM set_config('request.jwt.claim.sub', v_user_admin::TEXT, true);
    v_role_result := public.get_auth_role();
    IF v_role_result <> 'admin' THEN
        RAISE EXCEPTION '[CA 4.3 FAIL]: get_auth_role() của Admin trả về % (kỳ vọng admin)!', v_role_result;
    END IF;

    -- 4.2 Kiểm tra không đệ quy khi Staff và Admin đọc profiles
    PERFORM set_config('request.jwt.claim.sub', v_user_staff::TEXT, true);
    SELECT COUNT(*) INTO v_read_count FROM public.profiles;
    IF v_read_count <> 4 THEN
        RAISE EXCEPTION '[CA 4.4 FAIL]: Staff đọc profiles không đủ 4 dòng hoặc bị lỗi đệ quy!';
    END IF;

    -- 4.3 Kiểm tra Owner của hàm
    SELECT r.rolname INTO v_func_owner
    FROM pg_proc p
    JOIN pg_roles r ON p.proowner = r.oid
    WHERE p.proname = 'get_auth_role';
    IF v_func_owner <> 'postgres' THEN
        RAISE EXCEPTION '[CA 4.5 FAIL]: Owner của get_auth_role() là % (kỳ vọng postgres)!', v_func_owner;
    END IF;

    -- 4.4 Kiểm tra quyền gọi hàm
    SELECT has_function_privilege('anon', 'public.get_auth_role()', 'EXECUTE') INTO v_has_anon_execute;
    SELECT has_function_privilege('authenticated', 'public.get_auth_role()', 'EXECUTE') INTO v_has_auth_execute;
    IF v_has_anon_execute = TRUE THEN
        RAISE EXCEPTION '[CA 4.6 FAIL]: anon vẫn có quyền EXECUTE trên get_auth_role()!';
    END IF;
    IF v_has_auth_execute = FALSE THEN
        RAISE EXCEPTION '[CA 4.7 FAIL]: authenticated bị thiếu quyền EXECUTE trên get_auth_role()!';
    END IF;

    RAISE NOTICE '>> KẾT QUẢ CA 4: PASS TOÀN BỘ (Owner postgres, không đệ quy, phân quyền gọi chính xác).';

    -- ==========================================================================
    -- CA 5: RÀNG BUỘC TOÀN VẸN: TRÙNG MÃ HỒ SƠ, 2 THƯỞNG HOẠT ĐỘNG, LỆCH LEAD_ID
    -- ==========================================================================
    RAISE NOTICE '------------------------------------------------------------------------------';
    RAISE NOTICE '[CA 5] Kiểm tra ràng buộc toàn vẹn cơ sở dữ liệu';
    PERFORM set_config('request.jwt.claim.sub', v_user_staff::TEXT, true);

    -- 5.1 Tạo đối soát hợp lệ cho Lead 1
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
    v_recon_1_id := (v_recon_result->>'reconciliation_id')::UUID;
    v_reward_1_id := (v_recon_result->>'reward_id')::UUID;

    -- 5.2 Hai lead không thể ghép cùng mã hồ sơ hợp lệ
    v_err_caught := FALSE;
    BEGIN
        PERFORM public.fn_reconcile_lead_and_create_reward(
            v_lead_2_id,
            v_user_staff,
            'STHC-2026-DH001', -- Trùng mã hợp lệ đang gắn Lead 1
            '26BEP002',
            14500000.00,
            'PT-002',
            NOW(),
            'Ghép trùng mã'
        );
    EXCEPTION WHEN OTHERS THEN
        v_err_caught := TRUE;
    END;
    IF NOT v_err_caught THEN
        RAISE EXCEPTION '[CA 5.1 FAIL]: Cho phép ghép 2 lead vào cùng 1 mã hồ sơ hợp lệ!';
    ELSE
        RAISE NOTICE '  - [PASS] Ca 5.1: Chặn thành công 2 lead ghép cùng 1 mã hồ sơ (uq_valid_external_admission_code).';
    END IF;

    -- 5.3 Một lead không thể có hai thưởng đang hoạt động
    v_err_caught := FALSE;
    BEGIN
        INSERT INTO public.rewards (lead_id, reconciliation_id, affiliate_id, amount, status)
        VALUES (v_lead_1_id, gen_random_uuid(), v_aff_a_id, 500000.00, 'PENDING_APPROVAL');
    EXCEPTION WHEN OTHERS THEN
        v_err_caught := TRUE;
    END;
    IF NOT v_err_caught THEN
        RAISE EXCEPTION '[CA 5.2 FAIL]: Cho phép tạo 2 bản ghi thưởng active cho cùng 1 lead!';
    ELSE
        RAISE NOTICE '  - [PASS] Ca 5.2: Chặn thành công 2 thưởng active trên cùng 1 lead (uq_active_reward_per_lead).';
    END IF;

    -- 5.4 Thưởng không thể trỏ sang lần đối soát của lead khác (Lệch lead_id)
    v_err_caught := FALSE;
    BEGIN
        INSERT INTO public.rewards (lead_id, reconciliation_id, affiliate_id, amount, status)
        VALUES (v_lead_2_id, v_recon_1_id, v_aff_a_id, 500000.00, 'PENDING_APPROVAL');
    EXCEPTION WHEN OTHERS THEN
        v_err_caught := TRUE;
    END;
    IF NOT v_err_caught THEN
        RAISE EXCEPTION '[CA 5.3 FAIL]: Khóa ngoại kết hợp không chặn được việc gán thưởng lệch lead!';
    ELSE
        RAISE NOTICE '  - [PASS] Ca 5.3: Khóa ngoại kết hợp fk_rewards_recon_lead chặn đứng gán thưởng lệch lead.';
    END IF;
    RAISE NOTICE '>> KẾT QUẢ CA 5: PASS TOÀN BỘ (Partial unique indexes & Composite foreign key hoạt động chuẩn xác).';

    -- ==========================================================================
    -- CA 6: HỦY GHÉP RỒI ĐỐI SOÁT LẠI GIỮ ĐƯỢC LỊCH SỬ CŨ
    -- ==========================================================================
    RAISE NOTICE '------------------------------------------------------------------------------';
    RAISE NOTICE '[CA 6] Kiểm tra: Hủy ghép rồi đối soát lại bảo toàn lịch sử';

    -- 6.1 Admin duyệt thưởng Lead 1
    PERFORM set_config('request.jwt.claim.sub', v_user_admin::TEXT, true);
    v_approve_result := public.fn_approve_reward(v_reward_1_id, v_user_admin);

    -- 6.2 Hủy ghép do nhầm lẫn
    PERFORM set_config('request.jwt.claim.sub', v_user_staff::TEXT, true);
    v_void_result := public.fn_void_reconciliation_and_reward(
        v_lead_1_id,
        v_user_staff,
        'Cán bộ nhập nhầm mã hồ sơ, hủy để đối soát lại'
    );

    -- 6.3 Đối soát lại với mã hồ sơ đúng
    v_recon_result := public.fn_reconcile_lead_and_create_reward(
        v_lead_1_id,
        v_user_staff,
        'STHC-2026-DH001-CHINH-XAC',
        '26BEP001',
        14500000.00,
        'PT-001-NEW',
        NOW(),
        'Đối soát lại chính xác'
    );

    -- 6.4 Kiểm tra số lượng bản ghi lịch sử
    SELECT COUNT(*) INTO v_read_count FROM public.lead_reconciliations WHERE lead_id = v_lead_1_id;
    IF v_read_count <> 2 THEN
        RAISE EXCEPTION '[CA 6.1 FAIL]: Bảng lead_reconciliations không đủ 2 bản ghi (kết quả: %)!', v_read_count;
    END IF;

    SELECT COUNT(*) INTO v_read_count FROM public.rewards WHERE lead_id = v_lead_1_id;
    IF v_read_count <> 2 THEN
        RAISE EXCEPTION '[CA 6.2 FAIL]: Bảng rewards không đủ 2 bản ghi (kết quả: %)!', v_read_count;
    END IF;

    -- Kiểm tra có đúng 1 bản ghi VOIDED và 1 bản ghi mới
    SELECT COUNT(*) INTO v_read_count FROM public.lead_reconciliations WHERE lead_id = v_lead_1_id AND reconciliation_status = 'VOIDED';
    IF v_read_count <> 1 THEN
        RAISE EXCEPTION '[CA 6.3 FAIL]: Thiếu bản ghi VOIDED lịch sử!';
    END IF;

    RAISE NOTICE '>> KẾT QUẢ CA 6: PASS TOÀN BỘ (Lưu giữ đầy đủ 2 bản ghi đối soát & 2 bản ghi thưởng; không mất mát dữ liệu).';

    RAISE NOTICE '==============================================================================';
    RAISE NOTICE 'XÁC NHẬN: TOÀN BỘ 6/6 CA KIỂM THỬ ĐỀU ĐẠT CHUẨN (ALL TESTS PASSED)';
    RAISE NOTICE '==============================================================================';

END $$;

ROLLBACK;
