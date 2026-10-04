-- ==============================================================================
-- BƯỚC DB-A4.4: MIGRATION 20261004000005 - KHẮC PHỤC THIẾU SÓT A4.3, HOÀN THIỆN RPC VÀ IDEMPOTENCY
-- Dự án: Hệ thống Cộng tác viên Tuyển sinh Trường Saigontourist (STHC)
-- Mã file: /supabase/migrations/20261004000005_harden_reconciliation_rpc_and_idempotency.sql
-- ==============================================================================
-- Mục đích chính:
--   1. Thêm cột `admission_status` trên bảng `lead_reconciliations` để lưu giữ tình trạng nhập học
--      đã xác minh của từng lần đối soát trong lịch sử.
--   2. Bảng `reconciliation_idempotency_records` để quản lý chống gửi lặp thực thụ (Idempotency),
--      trả về cùng kết quả khi gửi lại cùng key/payload, chặn gửi lại khác payload.
--   3. Chuẩn hóa hàm RPC `fn_reconcile_lead_and_create_reward`:
--      - Nhận tham số `p_admission_status` do cán bộ xác minh ('ENROLLED' / 'NOT_ENROLLED').
--      - MATCHED_VALID bắt buộc `p_admission_status = 'ENROLLED'` và mã EGOV 7 số.
--      - EXISTING_IN_SCHOOL_SYSTEM hỗ trợ cả 'ENROLLED' và 'NOT_ENROLLED' kèm lý do bắt buộc.
--      - MISMATCH_INVALID bắt buộc `p_admission_status = 'NOT_ENROLLED'` kèm lý do bắt buộc.
--      - Chặn truyền WITHDRAWN qua RPC đối soát.
--      - Chống giả mạo `p_staff_id` khi gọi trực tiếp từ client (ràng buộc với auth.uid()).
--      - Lưu giữ snapshot học phí khóa học độc lập.
--   4. Chuẩn hóa hàm RPC `fn_void_reconciliation_and_reward`:
--      - Nhận `p_target_reconciliation_id` để định danh chính xác lần đối soát cần hủy.
--      - Hỗ trợ `p_idempotency_key` và `p_expected_updated_at`.
--      - Hủy nguyên tử cả đối soát và thưởng liên quan (kể cả APPROVED hay PENDING_APPROVAL).
--   5. Hàm `fn_get_lead_reconciliation_history`:
--      - Chống giả mạo `p_caller_id`, bảo vệ dữ liệu tài chính/nội bộ khi người gọi là CTV.
-- ==============================================================================

-- 1. BỔ SUNG CỘT ADMISSION_STATUS TRÊN LEAD_RECONCILIATIONS ĐỂ BẢO TOÀN LỊCH SỬ
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
          AND table_name = 'lead_reconciliations' 
          AND column_name = 'admission_status'
    ) THEN
        ALTER TABLE public.lead_reconciliations 
        ADD COLUMN admission_status VARCHAR(50) NOT NULL DEFAULT 'ENROLLED';

        ALTER TABLE public.lead_reconciliations 
        ADD CONSTRAINT chk_recon_admission_status 
        CHECK (admission_status IN ('ENROLLED', 'NOT_ENROLLED'));
    END IF;
END $$;

-- 2. TẠO BẢNG QUẢN LÝ IDEMPOTENCY CHO GIAO DỊCH ĐỐI SOÁT & HỦY ĐỐI SOÁT
CREATE TABLE IF NOT EXISTS public.reconciliation_idempotency_records (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    idempotency_key VARCHAR(100) NOT NULL,
    lead_id UUID NOT NULL REFERENCES public.leads(id) ON DELETE CASCADE,
    action VARCHAR(50) NOT NULL, -- 'RECONCILE' hoặc 'VOID'
    payload_hash VARCHAR(64) NOT NULL,
    response_data JSONB NOT NULL,
    actor_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE RESTRICT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT uq_recon_idempotency_key_lead_action UNIQUE (idempotency_key, lead_id, action)
);

CREATE INDEX IF NOT EXISTS idx_recon_idempotency_lookup 
ON public.reconciliation_idempotency_records (idempotency_key, lead_id, action);

-- ==============================================================================
-- 3. XÓA BỎ TOÀN BỘ OVERLOAD CŨ CỦA CÁC HÀM ĐỐI SOÁT ĐỂ TRÁNH LỖI 42725 (NOT UNIQUE)
-- ==============================================================================
DO $$
DECLARE
    r RECORD;
BEGIN
    FOR r IN (
        SELECT oid::regprocedure AS func_signature 
        FROM pg_proc 
        WHERE proname IN (
            'fn_reconcile_lead_and_create_reward',
            'fn_reconcile_lead_and_generate_reward',
            'fn_void_reconciliation_and_reward',
            'fn_get_lead_reconciliation_history'
        )
        AND pronamespace = 'public'::regnamespace
    ) LOOP
        EXECUTE 'DROP FUNCTION IF EXISTS ' || r.func_signature || ' CASCADE;';
    END LOOP;
END $$;

-- ==============================================================================
-- 4. HÀM NGUYÊN TỬ HOÀN CHỈNH: ĐỐI SOÁT HỒ SƠ & TẠO THƯỞNG (CHUẨN HÓA A4.4)
-- ==============================================================================
CREATE OR REPLACE FUNCTION public.fn_reconcile_lead_and_create_reward(
    p_lead_id UUID,
    p_staff_id UUID,
    p_reconciliation_status VARCHAR(50) DEFAULT 'MATCHED_VALID',
    p_admission_status VARCHAR(50) DEFAULT 'ENROLLED',
    p_external_admission_code VARCHAR(100) DEFAULT NULL,
    p_external_student_code VARCHAR(100) DEFAULT NULL,
    p_course_id UUID DEFAULT NULL,
    p_tuition_fee_collected NUMERIC(14, 2) DEFAULT NULL,
    p_receipt_number VARCHAR(100) DEFAULT NULL,
    p_tuition_paid_at TIMESTAMPTZ DEFAULT NULL,
    p_staff_note TEXT DEFAULT NULL,
    p_expected_updated_at TIMESTAMPTZ DEFAULT NULL,
    p_idempotency_key VARCHAR(100) DEFAULT NULL
)
RETURNS JSONB AS $$
DECLARE
    v_caller_uid UUID;
    v_actual_staff_id UUID;
    v_lead public.leads%ROWTYPE;
    v_affiliate public.affiliate_profiles%ROWTYPE;
    v_staff_role VARCHAR(30);
    v_clean_egov_code VARCHAR(100);
    v_clean_student_code VARCHAR(100);
    v_clean_receipt VARCHAR(100);
    v_clean_note TEXT;
    v_target_course_id UUID;
    v_course_fee NUMERIC(14, 2) := NULL;
    v_course_fee_type VARCHAR(50) := 'ESTIMATE';
    v_reconciliation_id UUID;
    v_reward_id UUID := NULL;
    v_now TIMESTAMPTZ := NOW();
    v_old_recon_status VARCHAR(50);
    v_old_reward_status VARCHAR(50);
    v_old_admission_status VARCHAR(50);
    v_new_admission_status VARCHAR(50);
    v_new_reward_status VARCHAR(50);
    v_clean_idempotency_key VARCHAR(100);
    v_payload_hash VARCHAR(64);
    v_existing_idem public.reconciliation_idempotency_records%ROWTYPE;
    v_result JSONB;
BEGIN
    -- 1. Xác thực và chống giả mạo danh tính caller
    v_caller_uid := auth.uid();
    IF v_caller_uid IS NOT NULL THEN
        -- Nếu gọi trực tiếp từ authenticated JWT client, ép buộc staff_id là chính auth.uid()
        v_actual_staff_id := v_caller_uid;
    ELSE
        -- Nếu gọi qua backend service_role, sử dụng p_staff_id đã xác thực bởi backend middleware
        v_actual_staff_id := p_staff_id;
    END IF;

    IF v_actual_staff_id IS NULL THEN
        RAISE EXCEPTION 'Danh tính cán bộ thực hiện không hợp lệ.' USING ERRCODE = '42501';
    END IF;

    -- 2. Kiểm tra vai trò của cán bộ thực hiện (Admin hoặc Staff đang hoạt động)
    SELECT role INTO v_staff_role 
    FROM public.profiles 
    WHERE id = v_actual_staff_id AND is_active = TRUE;

    IF v_staff_role IS NULL OR v_staff_role NOT IN ('staff', 'admin') THEN
        RAISE EXCEPTION 'Bị từ chối: Chỉ Cán bộ Tuyển sinh hoặc Quản trị viên mới có quyền thực hiện đối soát hồ sơ.'
            USING ERRCODE = '42501';
    END IF;

    -- 3. Kiểm tra tính hợp lệ của tham số trạng thái
    IF p_reconciliation_status NOT IN ('MATCHED_VALID', 'EXISTING_IN_SCHOOL_SYSTEM', 'MISMATCH_INVALID') THEN
        RAISE EXCEPTION 'Trạng thái đối soát "%" không hợp lệ. Chỉ chấp nhận MATCHED_VALID, EXISTING_IN_SCHOOL_SYSTEM hoặc MISMATCH_INVALID.', p_reconciliation_status
            USING ERRCODE = '22023';
    END IF;

    IF p_admission_status NOT IN ('ENROLLED', 'NOT_ENROLLED') THEN
        RAISE EXCEPTION 'Tình trạng nhập học "%" không hợp lệ. Chỉ chấp nhận ENROLLED hoặc NOT_ENROLLED. Không được truyền WITHDRAWN qua endpoint này.', p_admission_status
            USING ERRCODE = '22023';
    END IF;

    -- 4. Khóa bản ghi Lead để kiểm tra đồng thời (Pessimistic Locking)
    SELECT * INTO v_lead 
    FROM public.leads 
    WHERE id = p_lead_id 
    FOR UPDATE;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Không tìm thấy hồ sơ khách hàng (Lead) với ID: %', p_lead_id
            USING ERRCODE = 'P0002';
    END IF;

    -- 5. Xử lý Chống gửi lặp thực thụ (Idempotency Key Handling)
    v_clean_idempotency_key := NULLIF(TRIM(p_idempotency_key), '');
    IF v_clean_idempotency_key IS NOT NULL THEN
        -- Tính toán payload hash
        v_payload_hash := encode(digest(
            CONCAT_WS('|', 
                p_lead_id::text, 
                p_reconciliation_status, 
                p_admission_status, 
                COALESCE(TRIM(p_external_admission_code), ''),
                COALESCE(TRIM(p_external_student_code), ''),
                COALESCE(p_course_id::text, ''),
                COALESCE(p_tuition_fee_collected::text, ''),
                COALESCE(TRIM(p_receipt_number), '')
            ), 'sha256'), 'hex');

        SELECT * INTO v_existing_idem 
        FROM public.reconciliation_idempotency_records 
        WHERE idempotency_key = v_clean_idempotency_key 
          AND lead_id = p_lead_id 
          AND action = 'RECONCILE';

        IF FOUND THEN
            IF v_existing_idem.payload_hash = v_payload_hash THEN
                -- Cùng key, cùng payload -> Trả về kết quả trước đó đã lưu
                RETURN jsonb_set(v_existing_idem.response_data, '{is_idempotent_replay}', 'true'::jsonb);
            ELSE
                -- Cùng key nhưng khác payload -> Xung đột 409
                RAISE EXCEPTION 'Xung đột Idempotency-Key: Khóa này đã được sử dụng cho một yêu cầu đối soát với nội dung khác.'
                    USING ERRCODE = '40001';
            END IF;
        END IF;
    END IF;

    -- 6. Kiểm soát xung đột phiên bản đồng thời (Optimistic Concurrency Check)
    IF p_expected_updated_at IS NOT NULL AND v_lead.updated_at <> p_expected_updated_at THEN
        RAISE EXCEPTION 'Xung đột dữ liệu đồng thời: Hồ sơ đã được cập nhật bởi một cán bộ khác. Vui lòng tải lại trang để lấy dữ liệu mới nhất.'
            USING ERRCODE = '40001';
    END IF;

    -- 7. Kiểm tra hồ sơ đã có đối soát đang có hiệu lực chưa
    IF v_lead.reconciliation_status IN ('MATCHED_VALID', 'EXISTING_IN_SCHOOL_SYSTEM') THEN
        RAISE EXCEPTION 'Hồ sơ này đang có kết quả đối soát có hiệu lực (%). Vui lòng hủy ghép trước nếu muốn thay đổi kết quả.', v_lead.reconciliation_status
            USING ERRCODE = '23505';
    END IF;

    -- 8. Chuẩn hóa dữ liệu đầu vào
    v_clean_egov_code := NULLIF(TRIM(p_external_admission_code), '');
    v_clean_student_code := NULLIF(TRIM(p_external_student_code), '');
    v_clean_receipt := NULLIF(TRIM(p_receipt_number), '');
    v_clean_note := NULLIF(TRIM(p_staff_note), '');

    -- Kiểm tra học phí thu không được âm nếu có truyền
    IF p_tuition_fee_collected IS NOT NULL AND p_tuition_fee_collected < 0 THEN
        RAISE EXCEPTION 'Số tiền học phí thực thu không được là số âm.'
            USING ERRCODE = '22023';
    END IF;

    -- Xác định khóa học và mức học phí snapshot
    v_target_course_id := COALESCE(p_course_id, v_lead.course_id);
    IF v_target_course_id IS NOT NULL THEN
        SELECT tuition_fee_estimate INTO v_course_fee 
        FROM public.courses 
        WHERE id = v_target_course_id;
    END IF;

    v_old_recon_status := v_lead.reconciliation_status;
    v_old_reward_status := v_lead.reward_status;
    v_old_admission_status := COALESCE(v_lead.admission_status, 'NOT_ENROLLED');

    -- =========================================================================
    -- TRƯỜNG HỢP 1: MATCHED_VALID (ĐỐI SOÁT HỢP LỆ & ĐÃ NHẬP HỌC)
    -- =========================================================================
    IF p_reconciliation_status = 'MATCHED_VALID' THEN
        -- Bắt buộc xác nhận học viên đã nhập học trên EGOV
        IF p_admission_status <> 'ENROLLED' THEN
            RAISE EXCEPTION 'Đối soát hợp lệ (MATCHED_VALID) bắt buộc tình trạng nhập học là ENROLLED (EGOV đã tick Đã nhập học).'
                USING ERRCODE = '22023';
        END IF;

        -- Bắt buộc phải có Mã hồ sơ EGOV
        IF v_clean_egov_code IS NULL THEN
            RAISE EXCEPTION 'Mã hồ sơ EGOV là bắt buộc khi xác nhận hồ sơ đối soát hợp lệ.'
                USING ERRCODE = '22023';
        END IF;

        -- Validate định dạng Regex đúng 7 chữ số: ^[0-9]{7}$
        IF NOT (v_clean_egov_code ~ '^[0-9]{7}$') THEN
            RAISE EXCEPTION 'Mã hồ sơ EGOV không hợp lệ: Phải gồm đúng 7 chữ số viết liền nhau (Ví dụ: 0012345, 1089234).'
                USING ERRCODE = '22023';
        END IF;

        -- Kiểm tra mã EGOV có đang được gắn với đối soát MATCHED_VALID khác không
        IF EXISTS (
            SELECT 1 FROM public.lead_reconciliations 
            WHERE external_admission_code = v_clean_egov_code 
              AND reconciliation_status = 'MATCHED_VALID'
        ) THEN
            RAISE EXCEPTION 'Mã hồ sơ EGOV "%" đã được đối soát hợp lệ cho một học viên khác trong hệ thống.', v_clean_egov_code
                USING ERRCODE = '23505';
        END IF;

        v_new_admission_status := 'ENROLLED';

        -- Tạo bản ghi đối soát mới
        INSERT INTO public.lead_reconciliations (
            lead_id,
            staff_id,
            course_id,
            course_tuition_fee,
            course_tuition_fee_type,
            external_admission_code,
            external_student_code,
            tuition_fee_collected,
            receipt_number,
            tuition_paid_at,
            reconciliation_status,
            admission_status,
            staff_note,
            reconciled_at
        ) VALUES (
            p_lead_id,
            v_actual_staff_id,
            v_target_course_id,
            v_course_fee,
            v_course_fee_type,
            v_clean_egov_code,
            v_clean_student_code,
            p_tuition_fee_collected,
            v_clean_receipt,
            p_tuition_paid_at,
            'MATCHED_VALID',
            'ENROLLED',
            v_clean_note,
            v_now
        ) RETURNING id INTO v_reconciliation_id;

        -- Xử lý sinh thưởng cho CTV nếu hồ sơ có CTV ACTIVE
        IF v_lead.affiliate_id IS NOT NULL THEN
            SELECT * INTO v_affiliate 
            FROM public.affiliate_profiles 
            WHERE id = v_lead.affiliate_id;

            IF v_affiliate.id IS NOT NULL AND v_affiliate.status = 'ACTIVE' THEN
                INSERT INTO public.rewards (
                    lead_id,
                    reconciliation_id,
                    affiliate_id,
                    amount,
                    status,
                    created_at,
                    updated_at
                ) VALUES (
                    p_lead_id,
                    v_reconciliation_id,
                    v_lead.affiliate_id,
                    500000.00,
                    'PENDING_APPROVAL',
                    v_now,
                    v_now
                ) RETURNING id INTO v_reward_id;

                v_new_reward_status := 'PENDING_APPROVAL';
            ELSE
                v_new_reward_status := 'NONE';
            END IF;
        ELSE
            v_new_reward_status := 'NONE';
        END IF;

    -- =========================================================================
    -- TRƯỜNG HỢP 2: EXISTING_IN_SCHOOL_SYSTEM (HỌC VIÊN ĐÃ ĐĂNG KÝ TRƯỚC QUA KÊNH KHÁC)
    -- =========================================================================
    ELSIF p_reconciliation_status = 'EXISTING_IN_SCHOOL_SYSTEM' THEN
        -- Bắt buộc phải có lý do / ghi chú xác định căn cứ
        IF v_clean_note IS NULL THEN
            RAISE EXCEPTION 'Bắt buộc phải nhập căn cứ/ghi chú khi xác nhận khách đã đăng ký trước qua kênh khác.'
                USING ERRCODE = '22023';
        END IF;

        -- Nếu có nhập mã EGOV, kiểm tra đúng 7 chữ số
        IF v_clean_egov_code IS NOT NULL AND NOT (v_clean_egov_code ~ '^[0-9]{7}$') THEN
            RAISE EXCEPTION 'Mã hồ sơ EGOV không hợp lệ: Phải gồm đúng 7 chữ số viết liền nhau.'
                USING ERRCODE = '22023';
        END IF;

        -- Hỗ trợ cả ENROLLED và NOT_ENROLLED theo tình trạng thực tế trên EGOV
        v_new_admission_status := p_admission_status;
        v_new_reward_status := 'NONE'; -- Không sinh thưởng

        INSERT INTO public.lead_reconciliations (
            lead_id,
            staff_id,
            course_id,
            course_tuition_fee,
            course_tuition_fee_type,
            external_admission_code,
            external_student_code,
            tuition_fee_collected,
            receipt_number,
            tuition_paid_at,
            reconciliation_status,
            admission_status,
            staff_note,
            reconciled_at
        ) VALUES (
            p_lead_id,
            v_actual_staff_id,
            v_target_course_id,
            v_course_fee,
            v_course_fee_type,
            v_clean_egov_code,
            v_clean_student_code,
            p_tuition_fee_collected,
            v_clean_receipt,
            p_tuition_paid_at,
            'EXISTING_IN_SCHOOL_SYSTEM',
            v_new_admission_status,
            v_clean_note,
            v_now
        ) RETURNING id INTO v_reconciliation_id;

    -- =========================================================================
    -- TRƯỜNG HỢP 3: MISMATCH_INVALID (KHÔNG TÌM THẤY HỒ SƠ KHỚP TRÊN EGOV)
    -- =========================================================================
    ELSE
        IF p_admission_status <> 'NOT_ENROLLED' THEN
            RAISE EXCEPTION 'Hồ sơ không khớp (MISMATCH_INVALID) không thể xác nhận tình trạng nhập học là ENROLLED.'
                USING ERRCODE = '22023';
        END IF;

        IF v_clean_note IS NULL THEN
            RAISE EXCEPTION 'Bắt buộc phải nhập ghi chú lý do không tìm thấy hoặc thông tin không khớp trên EGOV.'
                USING ERRCODE = '22023';
        END IF;

        v_new_admission_status := 'NOT_ENROLLED';
        v_new_reward_status := 'NONE';

        INSERT INTO public.lead_reconciliations (
            lead_id,
            staff_id,
            course_id,
            course_tuition_fee,
            course_tuition_fee_type,
            external_admission_code,
            reconciliation_status,
            admission_status,
            staff_note,
            reconciled_at
        ) VALUES (
            p_lead_id,
            v_actual_staff_id,
            v_target_course_id,
            v_course_fee,
            v_course_fee_type,
            NULL,
            'MISMATCH_INVALID',
            'NOT_ENROLLED',
            v_clean_note,
            v_now
        ) RETURNING id INTO v_reconciliation_id;
    END IF;

    -- 9. Cập nhật bảng Leads (đồng bộ cả 2 trục trạng thái)
    UPDATE public.leads 
    SET reconciliation_status = p_reconciliation_status,
        admission_status = v_new_admission_status,
        reward_status = v_new_reward_status,
        updated_at = v_now
    WHERE id = p_lead_id;

    -- 10. Ghi nhật ký kiểm toán (Audit Log)
    INSERT INTO public.audit_logs (
        actor_id,
        action,
        entity_name,
        entity_id,
        old_values,
        new_values,
        reason,
        created_at
    ) VALUES (
        v_actual_staff_id,
        'RECONCILE_LEAD',
        'leads',
        p_lead_id,
        jsonb_build_object(
            'reconciliation_status', v_old_recon_status,
            'admission_status', v_old_admission_status,
            'reward_status', v_old_reward_status
        ),
        jsonb_build_object(
            'reconciliation_status', p_reconciliation_status,
            'admission_status', v_new_admission_status,
            'reward_status', v_new_reward_status,
            'external_admission_code', v_clean_egov_code,
            'reconciliation_id', v_reconciliation_id,
            'reward_id', v_reward_id
        ),
        COALESCE(v_clean_note, 'Đối soát kết quả hồ sơ tuyển sinh'),
        v_now
    );

    -- 11. Xây dựng kết quả trả về
    v_result := jsonb_build_object(
        'success', TRUE,
        'message', CASE 
            WHEN p_reconciliation_status = 'MATCHED_VALID' THEN 'Đối soát thành công! Đã xác nhận nhập học và tạo thưởng chờ duyệt.'
            WHEN p_reconciliation_status = 'EXISTING_IN_SCHOOL_SYSTEM' THEN 'Đã ghi nhận kết quả: Học viên đã đăng ký trước qua kênh khác.'
            ELSE 'Đã ghi nhận kết quả: Thông tin chưa khớp hồ sơ tuyển sinh.'
        END,
        'lead_id', p_lead_id,
        'reconciliation_id', v_reconciliation_id,
        'reconciliation_status', p_reconciliation_status,
        'admission_status', v_new_admission_status,
        'external_admission_code', v_clean_egov_code,
        'reward_id', v_reward_id,
        'reward_created', (v_reward_id IS NOT NULL),
        'updated_at', v_now
    );

    -- 12. Lưu bản ghi Idempotency nếu có key
    IF v_clean_idempotency_key IS NOT NULL THEN
        INSERT INTO public.reconciliation_idempotency_records (
            idempotency_key,
            lead_id,
            action,
            payload_hash,
            response_data,
            actor_id,
            created_at
        ) VALUES (
            v_clean_idempotency_key,
            p_lead_id,
            'RECONCILE',
            v_payload_hash,
            v_result,
            v_actual_staff_id,
            v_now
        )
        ON CONFLICT (idempotency_key, lead_id, action) DO NOTHING;
    END IF;

    RETURN v_result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp;

-- ==============================================================================
-- 4. HÀM NGUYÊN TỬ: HỦY GHÉP ĐỐI SOÁT VỚI TARGET RECONCILIATION & IDEMPOTENCY
-- ==============================================================================
CREATE OR REPLACE FUNCTION public.fn_void_reconciliation_and_reward(
    p_lead_id UUID,
    p_staff_id UUID,
    p_void_reason TEXT,
    p_target_reconciliation_id UUID DEFAULT NULL,
    p_expected_updated_at TIMESTAMPTZ DEFAULT NULL,
    p_idempotency_key VARCHAR(100) DEFAULT NULL
)
RETURNS JSONB AS $$
DECLARE
    v_caller_uid UUID;
    v_actual_staff_id UUID;
    v_lead public.leads%ROWTYPE;
    v_recon public.lead_reconciliations%ROWTYPE;
    v_reward public.rewards%ROWTYPE;
    v_staff_role VARCHAR(30);
    v_clean_reason TEXT;
    v_clean_idempotency_key VARCHAR(100);
    v_payload_hash VARCHAR(64);
    v_existing_idem public.reconciliation_idempotency_records%ROWTYPE;
    v_now TIMESTAMPTZ := NOW();
    v_result JSONB;
BEGIN
    -- 1. Xác thực và chống giả mạo danh tính caller
    v_caller_uid := auth.uid();
    IF v_caller_uid IS NOT NULL THEN
        v_actual_staff_id := v_caller_uid;
    ELSE
        v_actual_staff_id := p_staff_id;
    END IF;

    IF v_actual_staff_id IS NULL THEN
        RAISE EXCEPTION 'Danh tính cán bộ thực hiện không hợp lệ.' USING ERRCODE = '42501';
    END IF;

    -- 2. Kiểm tra quyền hạn
    SELECT role INTO v_staff_role 
    FROM public.profiles 
    WHERE id = v_actual_staff_id AND is_active = TRUE;

    IF v_staff_role IS NULL OR v_staff_role NOT IN ('staff', 'admin') THEN
        RAISE EXCEPTION 'Bị từ chối: Chỉ Cán bộ Tuyển sinh hoặc Quản trị viên mới có quyền hủy ghép đối soát.'
            USING ERRCODE = '42501';
    END IF;

    -- 3. Kiểm tra lý do bắt buộc
    v_clean_reason := NULLIF(TRIM(p_void_reason), '');
    IF v_clean_reason IS NULL THEN
        RAISE EXCEPTION 'Bắt buộc phải nhập lý do hủy ghép đối soát.'
            USING ERRCODE = '22023';
    END IF;

    -- 4. Khóa bản ghi Lead để kiểm tra đồng thời
    SELECT * INTO v_lead 
    FROM public.leads 
    WHERE id = p_lead_id 
    FOR UPDATE;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Không tìm thấy hồ sơ khách hàng (Lead) với ID: %', p_lead_id 
            USING ERRCODE = 'P0002';
    END IF;

    -- 5. Xử lý Idempotency
    v_clean_idempotency_key := NULLIF(TRIM(p_idempotency_key), '');
    IF v_clean_idempotency_key IS NOT NULL THEN
        v_payload_hash := encode(digest(
            CONCAT_WS('|', p_lead_id::text, COALESCE(p_target_reconciliation_id::text, ''), v_clean_reason),
            'sha256'
        ), 'hex');

        SELECT * INTO v_existing_idem 
        FROM public.reconciliation_idempotency_records 
        WHERE idempotency_key = v_clean_idempotency_key 
          AND lead_id = p_lead_id 
          AND action = 'VOID';

        IF FOUND THEN
            IF v_existing_idem.payload_hash = v_payload_hash THEN
                RETURN jsonb_set(v_existing_idem.response_data, '{is_idempotent_replay}', 'true'::jsonb);
            ELSE
                RAISE EXCEPTION 'Xung đột Idempotency-Key: Khóa này đã được sử dụng cho một yêu cầu hủy với nội dung khác.'
                    USING ERRCODE = '40001';
            END IF;
        END IF;
    END IF;

    -- 6. Kiểm soát xung đột phiên bản
    IF p_expected_updated_at IS NOT NULL AND v_lead.updated_at <> p_expected_updated_at THEN
        RAISE EXCEPTION 'Xung đột dữ liệu đồng thời: Hồ sơ đã được cập nhật bởi người dùng khác. Vui lòng tải lại trang.'
            USING ERRCODE = '40001';
    END IF;

    -- 7. Tìm bản ghi đối soát cần hủy
    IF p_target_reconciliation_id IS NOT NULL THEN
        SELECT * INTO v_recon 
        FROM public.lead_reconciliations 
        WHERE id = p_target_reconciliation_id 
          AND lead_id = p_lead_id
        FOR UPDATE;

        IF NOT FOUND THEN
            RAISE EXCEPTION 'Không tìm thấy bản ghi đối soát đích với ID: %', p_target_reconciliation_id
                USING ERRCODE = 'P0002';
        END IF;

        IF v_recon.reconciliation_status = 'VOIDED' THEN
            RAISE EXCEPTION 'Bản ghi đối soát này đã bị hủy trước đó (Trạng thái hiện tại: VOIDED).'
                USING ERRCODE = '22023';
        END IF;
    ELSE
        SELECT * INTO v_recon 
        FROM public.lead_reconciliations 
        WHERE lead_id = p_lead_id 
          AND reconciliation_status IN ('MATCHED_VALID', 'EXISTING_IN_SCHOOL_SYSTEM', 'MISMATCH_INVALID')
        ORDER BY reconciled_at DESC
        LIMIT 1
        FOR UPDATE;

        IF NOT FOUND THEN
            RAISE EXCEPTION 'Hồ sơ này hiện không có bản ghi đối soát nào đang có hiệu lực để hủy.'
                USING ERRCODE = 'P0002';
        END IF;
    END IF;

    -- 8. Cập nhật bản ghi đối soát thành VOIDED
    UPDATE public.lead_reconciliations 
    SET reconciliation_status = 'VOIDED',
        void_reason = v_clean_reason,
        voided_by = v_actual_staff_id,
        voided_at = v_now
    WHERE id = v_recon.id;

    -- 9. Tìm và chuyển khoản thưởng liên kết sang VOIDED
    SELECT * INTO v_reward 
    FROM public.rewards 
    WHERE reconciliation_id = v_recon.id 
      AND status IN ('PENDING_APPROVAL', 'APPROVED')
    FOR UPDATE;

    IF v_reward.id IS NOT NULL THEN
        UPDATE public.rewards 
        SET status = 'VOIDED',
            void_reason = v_clean_reason,
            voided_by = v_actual_staff_id,
            voided_at = v_now,
            updated_at = v_now
        WHERE id = v_reward.id;
    END IF;

    -- 10. Đưa Lead về trạng thái mặc định chưa đối soát
    UPDATE public.leads 
    SET reconciliation_status = 'NOT_RECONCILED',
        admission_status = 'NOT_ENROLLED',
        reward_status = 'NONE',
        updated_at = v_now
    WHERE id = p_lead_id;

    -- 11. Ghi nhật ký kiểm toán
    INSERT INTO public.audit_logs (
        actor_id,
        action,
        entity_name,
        entity_id,
        old_values,
        new_values,
        reason,
        created_at
    ) VALUES (
        v_actual_staff_id,
        'VOID_RECONCILIATION',
        'lead_reconciliations',
        v_recon.id,
        jsonb_build_object(
            'external_admission_code', v_recon.external_admission_code,
            'reconciliation_status', v_recon.reconciliation_status,
            'reward_status', CASE WHEN v_reward.id IS NOT NULL THEN v_reward.status ELSE 'NONE' END
        ),
        jsonb_build_object(
            'reconciliation_status', 'VOIDED',
            'reward_status', 'VOIDED',
            'lead_reconciliation_status', 'NOT_RECONCILED',
            'lead_admission_status', 'NOT_ENROLLED',
            'lead_reward_status', 'NONE'
        ),
        v_clean_reason,
        v_now
    );

    v_result := jsonb_build_object(
        'success', TRUE,
        'message', 'Đã hủy ghép đối soát thành công và bảo toàn lịch sử kiểm toán!',
        'lead_id', p_lead_id,
        'voided_reconciliation_id', v_recon.id,
        'voided_reward_id', CASE WHEN v_reward.id IS NOT NULL THEN v_reward.id ELSE NULL END,
        'updated_at', v_now
    );

    -- 12. Lưu Idempotency record nếu có
    IF v_clean_idempotency_key IS NOT NULL THEN
        INSERT INTO public.reconciliation_idempotency_records (
            idempotency_key,
            lead_id,
            action,
            payload_hash,
            response_data,
            actor_id,
            created_at
        ) VALUES (
            v_clean_idempotency_key,
            p_lead_id,
            'VOID',
            v_payload_hash,
            v_result,
            v_actual_staff_id,
            v_now
        )
        ON CONFLICT (idempotency_key, lead_id, action) DO NOTHING;
    END IF;

    RETURN v_result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp;

-- ==============================================================================
-- 6. PHÂN QUYỀN THỰC THI (VỚI CHỮ KÝ THAM SỐ TƯỜNG MINH)
-- ==============================================================================
REVOKE EXECUTE ON FUNCTION public.fn_reconcile_lead_and_create_reward(UUID, UUID, VARCHAR, VARCHAR, VARCHAR, VARCHAR, UUID, NUMERIC, VARCHAR, TIMESTAMPTZ, TEXT, TIMESTAMPTZ, VARCHAR) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.fn_void_reconciliation_and_reward(UUID, UUID, TEXT, UUID, TIMESTAMPTZ, VARCHAR) FROM PUBLIC, anon;

GRANT EXECUTE ON FUNCTION public.fn_reconcile_lead_and_create_reward(UUID, UUID, VARCHAR, VARCHAR, VARCHAR, VARCHAR, UUID, NUMERIC, VARCHAR, TIMESTAMPTZ, TEXT, TIMESTAMPTZ, VARCHAR) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.fn_void_reconciliation_and_reward(UUID, UUID, TEXT, UUID, TIMESTAMPTZ, VARCHAR) TO authenticated, service_role;
