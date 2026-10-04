-- ==============================================================================
-- BƯỚC DB-A4.3: MIGRATION 20261004000004 - CHUẨN HÓA DỮ LIỆU, CONSTRAINT VÀ RPC ĐỐI CHIẾU HỒ SƠ & HỌC PHÍ
-- Dự án: Hệ thống Cộng tác viên Tuyển sinh Trường Saigontourist (STHC)
-- Mã file: /supabase/migrations/20261004000004_standardize_reconciliation_schema_and_rpc.sql
-- ==============================================================================
-- Mục đích chính:
--   1. Chuẩn hóa cấu trúc bảng `leads` và `lead_reconciliations`:
--      - Thêm cột `admission_status` trên `leads` ('NOT_ENROLLED', 'ENROLLED', 'WITHDRAWN').
--      - Chuyển `tuition_fee_collected` và `tuition_paid_at` trên `lead_reconciliations` thành NULLABLE (vì học phí/biên lai không phải điều kiện bắt buộc để xác nhận nhập học).
--      - Bổ sung `course_id`, `course_tuition_fee`, `course_tuition_fee_type` vào `lead_reconciliations` để lưu giữ mức học phí của khóa học tại thời điểm đối soát phục vụ thống kê doanh thu sau này.
--      - Thêm ràng buộc kiểm tra số tiền không âm: `CHECK (tuition_fee_collected IS NULL OR tuition_fee_collected >= 0)` và `CHECK (course_tuition_fee IS NULL OR course_tuition_fee >= 0)`.
--   2. Hàm RPC nguyên tử `fn_reconcile_lead_and_create_reward`:
--      - Validate định dạng Mã hồ sơ EGOV đúng 7 chữ số: `^[0-9]{7}$`.
--      - Hỗ trợ đa trạng thái đối soát: `MATCHED_VALID`, `EXISTING_IN_SCHOOL_SYSTEM`, `MISMATCH_INVALID`.
--      - Tách biệt hai trục: Tình trạng nhập học học thuật (`admission_status`) và Tính hợp lệ giới thiệu CTV (`reconciliation_status`).
--      - Kiểm soát xung đột phiên bản đồng thời (`p_expected_updated_at`) với lỗi `40001 (Serialization/Concurrency Conflict)`.
--      - Kiểm soát quyền: Chỉ `staff` hoặc `admin` đang hoạt động mới được thực hiện.
--   3. Hàm RPC nguyên tử `fn_void_reconciliation_and_reward`:
--      - Cho phép cả `staff` và `admin` thực hiện hủy đối soát khi có sai sót.
--      - Chuyển trạng thái đối soát và khoản thưởng liên quan sang `VOIDED` trong cùng một transaction.
--      - Giải phóng mã EGOV khỏi partial unique index để cho phép đối soát lại.
--      - Đưa `leads` về trạng thái `NOT_RECONCILED` / `NOT_ENROLLED` / `NONE`.
--   4. Hàm RPC `fn_get_lead_reconciliation_history`:
--      - Truy vấn lịch sử đối soát đầy đủ kèm thông tin cán bộ đối soát, cán bộ hủy và lý do.
-- ==============================================================================

-- 1. BỔ SUNG CỘT ADMISSION_STATUS VÀO BẢNG LEADS NẾU CHƯA CÓ
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
          AND table_name = 'leads' 
          AND column_name = 'admission_status'
    ) THEN
        ALTER TABLE public.leads 
        ADD COLUMN admission_status VARCHAR(50) NOT NULL DEFAULT 'NOT_ENROLLED';

        ALTER TABLE public.leads 
        ADD CONSTRAINT chk_leads_admission_status 
        CHECK (admission_status IN ('NOT_ENROLLED', 'ENROLLED', 'WITHDRAWN'));

        CREATE INDEX IF NOT EXISTS idx_leads_admission_status ON public.leads(admission_status);
    END IF;
END $$;

-- Đồng bộ admission_status ban đầu cho các lead đã MATCHED_VALID
UPDATE public.leads 
SET admission_status = 'ENROLLED' 
WHERE reconciliation_status IN ('MATCHED_VALID', 'EXISTING_IN_SCHOOL_SYSTEM') 
  AND admission_status = 'NOT_ENROLLED';

-- 2. CHUẨN HÓA BẢNG LEAD_RECONCILIATIONS (HỌC PHÍ NULLABLE, BỔ SUNG SNAPSHOT KHÓA HỌC)
DO $$
BEGIN
    -- 2.1 Cho phép tuition_fee_collected và tuition_paid_at là NULLABLE
    ALTER TABLE public.lead_reconciliations 
    ALTER COLUMN tuition_fee_collected DROP NOT NULL;

    ALTER TABLE public.lead_reconciliations 
    ALTER COLUMN tuition_paid_at DROP NOT NULL;

    -- 2.2 Cho phép external_admission_code là NULLABLE (dành cho trường hợp MISMATCH_INVALID không có mã)
    ALTER TABLE public.lead_reconciliations 
    ALTER COLUMN external_admission_code DROP NOT NULL;

    -- 2.3 Bổ sung khóa ngoại course_id nếu chưa có
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
          AND table_name = 'lead_reconciliations' 
          AND column_name = 'course_id'
    ) THEN
        ALTER TABLE public.lead_reconciliations 
        ADD COLUMN course_id UUID REFERENCES public.courses(id) ON DELETE RESTRICT;
        
        CREATE INDEX IF NOT EXISTS idx_recon_course_id ON public.lead_reconciliations(course_id);
    END IF;

    -- 2.4 Bổ sung snapshot học phí khóa học tại thời điểm đối soát
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
          AND table_name = 'lead_reconciliations' 
          AND column_name = 'course_tuition_fee'
    ) THEN
        ALTER TABLE public.lead_reconciliations 
        ADD COLUMN course_tuition_fee NUMERIC(14, 2);
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
          AND table_name = 'lead_reconciliations' 
          AND column_name = 'course_tuition_fee_type'
    ) THEN
        ALTER TABLE public.lead_reconciliations 
        ADD COLUMN course_tuition_fee_type VARCHAR(50) DEFAULT 'ESTIMATE';
    END IF;

    -- 2.5 Bổ sung ràng buộc kiểm tra số tiền không âm
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.constraint_column_usage 
        WHERE table_schema = 'public' 
          AND table_name = 'lead_reconciliations' 
          AND constraint_name = 'chk_recon_tuition_fee_collected_nonneg'
    ) THEN
        ALTER TABLE public.lead_reconciliations 
        ADD CONSTRAINT chk_recon_tuition_fee_collected_nonneg 
        CHECK (tuition_fee_collected IS NULL OR tuition_fee_collected >= 0);
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM information_schema.constraint_column_usage 
        WHERE table_schema = 'public' 
          AND table_name = 'lead_reconciliations' 
          AND constraint_name = 'chk_recon_course_tuition_fee_nonneg'
    ) THEN
        ALTER TABLE public.lead_reconciliations 
        ADD CONSTRAINT chk_recon_course_tuition_fee_nonneg 
        CHECK (course_tuition_fee IS NULL OR course_tuition_fee >= 0);
    END IF;
END $$;

-- 3. ĐẢM BẢO CHỈ MỤC DUY NHẤT CÓ ĐIỀU KIỆN (PARTIAL UNIQUE INDEXES)
DROP INDEX IF EXISTS public.uq_valid_external_admission_code;
CREATE UNIQUE INDEX uq_valid_external_admission_code 
ON public.lead_reconciliations (external_admission_code) 
WHERE reconciliation_status = 'MATCHED_VALID' AND external_admission_code IS NOT NULL;

DROP INDEX IF EXISTS public.uq_valid_recon_per_lead;
CREATE UNIQUE INDEX uq_valid_recon_per_lead 
ON public.lead_reconciliations (lead_id) 
WHERE reconciliation_status = 'MATCHED_VALID';

-- ==============================================================================
-- 4. HÀM NGUYÊN TỬ: ĐỐI SOÁT HỒ SƠ & TẠO THƯỞNG (CHUẨN HÓA A4.3)
-- ==============================================================================
CREATE OR REPLACE FUNCTION public.fn_reconcile_lead_and_create_reward(
    p_lead_id UUID,
    p_staff_id UUID,
    p_reconciliation_status VARCHAR(50) DEFAULT 'MATCHED_VALID',
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
    v_lead public.leads%ROWTYPE;
    v_affiliate public.affiliate_profiles%ROWTYPE;
    v_staff_role VARCHAR(30);
    v_admission_code_clean VARCHAR(100);
    v_student_code_clean VARCHAR(100);
    v_receipt_clean VARCHAR(100);
    v_clean_note TEXT;
    v_target_course_id UUID;
    v_course_fee NUMERIC(14, 2) := NULL;
    v_reconciliation_id UUID;
    v_reward_id UUID := NULL;
    v_now TIMESTAMPTZ := NOW();
    v_old_recon_status VARCHAR(50);
    v_old_reward_status VARCHAR(50);
    v_old_admission_status VARCHAR(50);
    v_new_admission_status VARCHAR(50);
    v_new_reward_status VARCHAR(50);
BEGIN
    -- 1. Kiểm tra quyền hạn của cán bộ thực hiện
    SELECT role INTO v_staff_role 
    FROM public.profiles 
    WHERE id = p_staff_id AND is_active = TRUE;

    IF v_staff_role IS NULL OR v_staff_role NOT IN ('staff', 'admin') THEN
        RAISE EXCEPTION 'Bị từ chối: Chỉ Cán bộ Tuyển sinh hoặc Quản trị viên mới có quyền thực hiện đối soát hồ sơ.'
            USING ERRCODE = '42501';
    END IF;

    -- 2. Kiểm tra trạng thái đối soát yêu cầu hợp lệ
    IF p_reconciliation_status NOT IN ('MATCHED_VALID', 'EXISTING_IN_SCHOOL_SYSTEM', 'MISMATCH_INVALID') THEN
        RAISE EXCEPTION 'Trạng thái đối soát "%" không hợp lệ. Chỉ chấp nhận MATCHED_VALID, EXISTING_IN_SCHOOL_SYSTEM hoặc MISMATCH_INVALID.', p_reconciliation_status
            USING ERRCODE = '22023';
    END IF;

    -- 3. Khóa bản ghi Lead để kiểm tra đồng thời (Pessimistic Locking)
    SELECT * INTO v_lead 
    FROM public.leads 
    WHERE id = p_lead_id 
    FOR UPDATE;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Không tìm thấy hồ sơ khách hàng (Lead) với ID: %', p_lead_id
            USING ERRCODE = 'P0002';
    END IF;

    -- 4. Kiểm soát xung đột phiên bản đồng thời (Optimistic Concurrency Check)
    IF p_expected_updated_at IS NOT NULL AND v_lead.updated_at <> p_expected_updated_at THEN
        RAISE EXCEPTION 'Xung đột dữ liệu đồng thời: Hồ sơ đã được cập nhật bởi một cán bộ khác. Vui lòng tải lại trang để lấy dữ liệu mới nhất.'
            USING ERRCODE = '40001';
    END IF;

    -- 5. Kiểm tra hồ sơ đã có đối soát đang có hiệu lực chưa
    IF v_lead.reconciliation_status IN ('MATCHED_VALID', 'EXISTING_IN_SCHOOL_SYSTEM') THEN
        RAISE EXCEPTION 'Hồ sơ này đang có kết quả đối soát có hiệu lực (%). Vui lòng hủy ghép trước nếu muốn thay đổi kết quả.', v_lead.reconciliation_status
            USING ERRCODE = '23505';
    END IF;

    -- 6. Chuẩn hóa dữ liệu đầu vào
    v_admission_code_clean := NULLIF(TRIM(p_external_admission_code), '');
    v_student_code_clean := NULLIF(TRIM(p_external_student_code), '');
    v_receipt_clean := NULLIF(TRIM(p_receipt_number), '');
    v_clean_note := NULLIF(TRIM(p_staff_note), '');

    -- Kiểm tra học phí thu không được âm nếu có truyền
    IF p_tuition_fee_collected IS NOT NULL AND p_tuition_fee_collected < 0 THEN
        RAISE EXCEPTION 'Số tiền học phí thực thu không được là số âm.'
            USING ERRCODE = '22023';
    END IF;

    -- Xác định khóa học và mức học phí tham chiếu
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
        -- Bắt buộc phải có Mã hồ sơ EGOV
        IF v_admission_code_clean IS NULL THEN
            RAISE EXCEPTION 'Mã hồ sơ EGOV là bắt buộc khi xác nhận hồ sơ đối soát hợp lệ.'
                USING ERRCODE = '22023';
        END IF;

        -- Validate định dạng Regex đúng 7 chữ số: ^[0-9]{7}$
        IF NOT (v_admission_code_clean ~ '^[0-9]{7}$') THEN
            RAISE EXCEPTION 'Mã hồ sơ EGOV không hợp lệ: Phải gồm đúng 7 chữ số viết liền nhau (Ví dụ: 0012345, 1089234).'
                USING ERRCODE = '22023';
        END IF;

        -- Kiểm tra mã EGOV có đang được gắn với đối soát MATCHED_VALID khác không
        IF EXISTS (
            SELECT 1 FROM public.lead_reconciliations 
            WHERE external_admission_code = v_admission_code_clean 
              AND reconciliation_status = 'MATCHED_VALID'
        ) THEN
            RAISE EXCEPTION 'Mã hồ sơ EGOV "%" đã được đối soát hợp lệ cho một học viên khác trong hệ thống.', v_admission_code_clean
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
            staff_note,
            reconciled_at
        ) VALUES (
            p_lead_id,
            p_staff_id,
            v_target_course_id,
            v_course_fee,
            CASE WHEN v_course_fee IS NOT NULL THEN 'ESTIMATE' ELSE NULL END,
            v_admission_code_clean,
            v_student_code_clean,
            p_tuition_fee_collected,
            v_receipt_clean,
            p_tuition_paid_at,
            'MATCHED_VALID',
            v_clean_note,
            v_now
        ) RETURNING id INTO v_reconciliation_id;

        -- Xử lý sinh thưởng cho CTV nếu hợp lệ
        IF v_lead.affiliate_id IS NOT NULL THEN
            SELECT * INTO v_affiliate 
            FROM public.affiliate_profiles 
            WHERE id = v_lead.affiliate_id;

            IF v_affiliate.id IS NOT NULL AND v_affiliate.status = 'ACTIVE' THEN
                -- Tạo bản ghi thưởng PENDING_APPROVAL 500.000 VNĐ
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
        -- Bắt buộc phải có lý do / ghi chú xác định nguồn gốc
        IF v_clean_note IS NULL THEN
            RAISE EXCEPTION 'Bắt buộc phải nhập căn cứ/ghi chú khi xác nhận khách đã đăng ký trước qua kênh khác.'
                USING ERRCODE = '22023';
        END IF;

        -- Nếu có nhập mã EGOV, kiểm tra đúng 7 chữ số
        IF v_admission_code_clean IS NOT NULL AND NOT (v_admission_code_clean ~ '^[0-9]{7}$') THEN
            RAISE EXCEPTION 'Mã hồ sơ EGOV không hợp lệ: Phải gồm đúng 7 chữ số viết liền nhau.'
                USING ERRCODE = '22023';
        END IF;

        v_new_admission_status := 'ENROLLED';
        v_new_reward_status := 'NONE';

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
            staff_note,
            reconciled_at
        ) VALUES (
            p_lead_id,
            p_staff_id,
            v_target_course_id,
            v_course_fee,
            CASE WHEN v_course_fee IS NOT NULL THEN 'ESTIMATE' ELSE NULL END,
            v_admission_code_clean,
            v_student_code_clean,
            p_tuition_fee_collected,
            v_receipt_clean,
            p_tuition_paid_at,
            'EXISTING_IN_SCHOOL_SYSTEM',
            v_clean_note,
            v_now
        ) RETURNING id INTO v_reconciliation_id;

    -- =========================================================================
    -- TRƯỜNG HỢP 3: MISMATCH_INVALID (KHÔNG TÌM THẤY HỒ SƠ KHỚP TRÊN EGOV)
    -- =========================================================================
    ELSE -- MISMATCH_INVALID
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
            staff_note,
            reconciled_at
        ) VALUES (
            p_lead_id,
            p_staff_id,
            v_target_course_id,
            v_course_fee,
            NULL,
            v_admission_code_clean,
            'MISMATCH_INVALID',
            v_clean_note,
            v_now
        ) RETURNING id INTO v_reconciliation_id;
    END IF;

    -- 7. Cập nhật Lead với cả 2 trục trạng thái: Tình trạng nhập học & Tính hợp lệ CTV
    UPDATE public.leads 
    SET reconciliation_status = p_reconciliation_status,
        admission_status = v_new_admission_status,
        reward_status = v_new_reward_status,
        course_id = COALESCE(v_target_course_id, course_id),
        updated_at = v_now
    WHERE id = p_lead_id;

    -- 8. Ghi nhật ký kiểm toán (Audit Log)
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
        p_staff_id,
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
            'external_admission_code', v_admission_code_clean,
            'reconciliation_id', v_reconciliation_id,
            'reward_id', v_reward_id
        ),
        COALESCE(v_clean_note, 'Đối soát kết quả hồ sơ tuyển sinh'),
        v_now
    );

    RETURN jsonb_build_object(
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
        'reward_id', v_reward_id,
        'reward_created', (v_reward_id IS NOT NULL),
        'updated_at', v_now
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp;

-- ==============================================================================
-- 5. HÀM NGUYÊN TỬ: HỦY GHÉP ĐỐI SOÁT (CHUẨN HÓA A4.3)
-- ==============================================================================
CREATE OR REPLACE FUNCTION public.fn_void_reconciliation_and_reward(
    p_lead_id UUID,
    p_staff_id UUID,
    p_void_reason TEXT,
    p_expected_updated_at TIMESTAMPTZ DEFAULT NULL
)
RETURNS JSONB AS $$
DECLARE
    v_lead public.leads%ROWTYPE;
    v_recon public.lead_reconciliations%ROWTYPE;
    v_reward public.rewards%ROWTYPE;
    v_staff_role VARCHAR(30);
    v_clean_reason TEXT;
    v_now TIMESTAMPTZ := NOW();
BEGIN
    -- 1. Kiểm tra lý do bắt buộc
    v_clean_reason := NULLIF(TRIM(p_void_reason), '');
    IF v_clean_reason IS NULL THEN
        RAISE EXCEPTION 'Bắt buộc phải nhập lý do hủy ghép đối soát.'
            USING ERRCODE = '22023';
    END IF;

    -- 2. Kiểm tra quyền hạn (Cả Staff và Admin đều có quyền)
    SELECT role INTO v_staff_role 
    FROM public.profiles 
    WHERE id = p_staff_id AND is_active = TRUE;

    IF v_staff_role IS NULL OR v_staff_role NOT IN ('staff', 'admin') THEN
        RAISE EXCEPTION 'Bị từ chối: Chỉ Cán bộ Tuyển sinh hoặc Quản trị viên mới có quyền hủy ghép đối soát.'
            USING ERRCODE = '42501';
    END IF;

    -- 3. Khóa bản ghi Lead để kiểm tra đồng thời
    SELECT * INTO v_lead 
    FROM public.leads 
    WHERE id = p_lead_id 
    FOR UPDATE;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Không tìm thấy hồ sơ khách hàng (Lead) với ID: %', p_lead_id 
            USING ERRCODE = 'P0002';
    END IF;

    -- 4. Kiểm soát xung đột đồng thời (Concurrency Check)
    IF p_expected_updated_at IS NOT NULL AND v_lead.updated_at <> p_expected_updated_at THEN
        RAISE EXCEPTION 'Xung đột dữ liệu đồng thời: Hồ sơ đã được cập nhật bởi người dùng khác. Vui lòng tải lại trang.'
            USING ERRCODE = '40001';
    END IF;

    -- 5. Tìm bản ghi đối soát đang có hiệu lực
    SELECT * INTO v_recon 
    FROM public.lead_reconciliations 
    WHERE lead_id = p_lead_id 
      AND reconciliation_status IN ('MATCHED_VALID', 'EXISTING_IN_SCHOOL_SYSTEM', 'MISMATCH_INVALID')
    ORDER BY reconciled_at DESC
    LIMIT 1
    FOR UPDATE;

    IF v_recon.id IS NULL THEN
        RAISE EXCEPTION 'Hồ sơ này hiện không có bản ghi đối soát nào đang có hiệu lực để hủy.'
            USING ERRCODE = 'P0002';
    END IF;

    -- 6. Cập nhật bản ghi đối soát thành VOIDED (bảo toàn lịch sử)
    UPDATE public.lead_reconciliations 
    SET reconciliation_status = 'VOIDED',
        void_reason = v_clean_reason,
        voided_by = p_staff_id,
        voided_at = v_now
    WHERE id = v_recon.id;

    -- 7. Tìm bản ghi thưởng liên kết và chuyển sang VOIDED (kể cả PENDING_APPROVAL hay APPROVED)
    SELECT * INTO v_reward 
    FROM public.rewards 
    WHERE reconciliation_id = v_recon.id 
      AND status IN ('PENDING_APPROVAL', 'APPROVED')
    FOR UPDATE;

    IF v_reward.id IS NOT NULL THEN
        UPDATE public.rewards 
        SET status = 'VOIDED',
            void_reason = v_clean_reason,
            voided_by = p_staff_id,
            voided_at = v_now,
            updated_at = v_now
        WHERE id = v_reward.id;
    END IF;

    -- 8. Cập nhật Lead về trạng thái mặc định chưa đối soát
    UPDATE public.leads 
    SET reconciliation_status = 'NOT_RECONCILED',
        admission_status = 'NOT_ENROLLED',
        reward_status = 'NONE',
        updated_at = v_now
    WHERE id = p_lead_id;

    -- 9. Ghi nhật ký kiểm toán (Audit Log)
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
        p_staff_id,
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

    RETURN jsonb_build_object(
        'success', TRUE,
        'message', 'Đã hủy ghép đối soát thành công và bảo toàn lịch sử!',
        'lead_id', p_lead_id,
        'voided_reconciliation_id', v_recon.id,
        'voided_reward_id', CASE WHEN v_reward.id IS NOT NULL THEN v_reward.id ELSE NULL END,
        'updated_at', v_now
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp;

-- ==============================================================================
-- 6. HÀM TRUY VẤN LỊCH SỬ ĐỐI SOÁT CỦA LEAD (fn_get_lead_reconciliation_history)
-- ==============================================================================
CREATE OR REPLACE FUNCTION public.fn_get_lead_reconciliation_history(
    p_lead_id UUID,
    p_caller_id UUID
)
RETURNS TABLE (
    id UUID,
    lead_id UUID,
    staff_id UUID,
    staff_name VARCHAR,
    course_id UUID,
    course_title VARCHAR,
    course_tuition_fee NUMERIC,
    course_tuition_fee_type VARCHAR,
    external_admission_code VARCHAR,
    external_student_code VARCHAR,
    tuition_fee_collected NUMERIC,
    receipt_number VARCHAR,
    tuition_paid_at TIMESTAMPTZ,
    reconciliation_status VARCHAR,
    staff_note TEXT,
    void_reason TEXT,
    voided_by UUID,
    voided_by_name VARCHAR,
    voided_at TIMESTAMPTZ,
    reconciled_at TIMESTAMPTZ,
    reward_id UUID,
    reward_amount NUMERIC,
    reward_status VARCHAR
) AS $$
DECLARE
    v_caller_role VARCHAR(30);
    v_lead_affiliate_id UUID;
    v_caller_affiliate_id UUID;
BEGIN
    -- 1. Tra cứu vai trò caller
    SELECT role INTO v_caller_role FROM public.profiles WHERE profiles.id = p_caller_id AND is_active = TRUE;
    IF v_caller_role IS NULL THEN
        RAISE EXCEPTION 'Người gọi không tồn tại hoặc đã bị vô hiệu hóa.' USING ERRCODE = '42501';
    END IF;

    -- 2. Nếu là CTV, kiểm tra quyền sở hữu lead
    IF v_caller_role = 'affiliate' THEN
        SELECT affiliate_id INTO v_lead_affiliate_id FROM public.leads WHERE leads.id = p_lead_id;
        SELECT affiliate_profiles.id INTO v_caller_affiliate_id FROM public.affiliate_profiles WHERE affiliate_profiles.user_id = p_caller_id;

        IF v_lead_affiliate_id IS NULL OR v_caller_affiliate_id IS NULL OR v_lead_affiliate_id <> v_caller_affiliate_id THEN
            RAISE EXCEPTION 'Bị từ chối: Bạn không có quyền xem lịch sử đối soát của hồ sơ này.' USING ERRCODE = '42501';
        END IF;
    END IF;

    -- 3. Trả về lịch sử đối soát
    RETURN QUERY
    SELECT 
        r.id,
        r.lead_id,
        r.staff_id,
        p_staff.full_name AS staff_name,
        r.course_id,
        c.title AS course_title,
        r.course_tuition_fee,
        r.course_tuition_fee_type,
        r.external_admission_code,
        r.external_student_code,
        r.tuition_fee_collected,
        r.receipt_number,
        r.tuition_paid_at,
        r.reconciliation_status,
        r.staff_note,
        r.void_reason,
        r.voided_by,
        p_void.full_name AS voided_by_name,
        r.voided_at,
        r.reconciled_at,
        rw.id AS reward_id,
        rw.amount AS reward_amount,
        rw.status AS reward_status
    FROM public.lead_reconciliations r
    LEFT JOIN public.profiles p_staff ON p_staff.id = r.staff_id
    LEFT JOIN public.profiles p_void ON p_void.id = r.voided_by
    LEFT JOIN public.courses c ON c.id = r.course_id
    LEFT JOIN public.rewards rw ON rw.reconciliation_id = r.id
    WHERE r.lead_id = p_lead_id
    ORDER BY r.reconciled_at DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp;

-- ==============================================================================
-- 7. PHÂN QUYỀN THỰC THI CHO CÁC HÀM NGUYÊN TỬ
-- ==============================================================================
REVOKE EXECUTE ON FUNCTION public.fn_reconcile_lead_and_create_reward FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.fn_void_reconciliation_and_reward FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.fn_get_lead_reconciliation_history FROM PUBLIC, anon;

GRANT EXECUTE ON FUNCTION public.fn_reconcile_lead_and_create_reward TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.fn_void_reconciliation_and_reward TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.fn_get_lead_reconciliation_history TO authenticated, service_role;
