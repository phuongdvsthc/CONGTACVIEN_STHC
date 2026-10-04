-- ==============================================================================
-- BƯỚC DB-A3.7.2: MIGRATION 20261004000002 - BẮT BUỘC KIỂM SOÁT PHIÊN BẢN (MANDATORY CONCURRENCY TIMESTAMP) TẠI DATABASE CHO RPC CHĂM SÓC
-- Dự án: Hệ thống Cộng tác viên Tuyển sinh Trường Saigontourist (STHC)
-- Mã file: 20261004000002_enforce_mandatory_concurrency_timestamp.sql
-- ==============================================================================

-- 1. Cập nhật hàm RPC fn_update_lead_care_and_audit: Bắt buộc p_expected_updated_at khi có thao tác ghi
CREATE OR REPLACE FUNCTION public.fn_update_lead_care_and_audit(
    p_lead_id UUID,
    p_actor_id UUID,
    p_counseling_status VARCHAR(50) DEFAULT NULL,
    p_note TEXT DEFAULT NULL,
    p_expected_updated_at TIMESTAMPTZ DEFAULT NULL,
    p_idempotency_key VARCHAR(100) DEFAULT NULL
)
RETURNS JSONB AS $$
DECLARE
    v_lead RECORD;
    v_actor RECORD;
    v_clean_note TEXT;
    v_old_status VARCHAR(50);
    v_new_status VARCHAR(50);
    v_old_note TEXT;
    v_now TIMESTAMPTZ := NOW();
    v_action VARCHAR(100);
    v_audit_id UUID;
    v_status_changed BOOLEAN := FALSE;
    v_note_added BOOLEAN := FALSE;
    v_caller_uid UUID;
    v_existing_audit RECORD;
    v_clean_idempotency_key VARCHAR(100);
BEGIN
    -- 1. Ràng buộc an toàn danh tính (Caller Identity Binding)
    v_caller_uid := auth.uid();
    
    -- Nếu gọi trực tiếp từ client authenticated
    IF v_caller_uid IS NOT NULL THEN
        -- Bắt buộc p_actor_id phải khớp 100% với auth.uid() (chống giả mạo UUID Admin)
        IF p_actor_id IS NOT NULL AND p_actor_id <> v_caller_uid THEN
            RAISE EXCEPTION 'Bị từ chối: Danh tính người thực hiện (actor_id) không khớp với tài khoản đăng nhập hiện tại.'
                USING ERRCODE = '42501';
        END IF;
        p_actor_id := v_caller_uid;
    END IF;

    IF p_actor_id IS NULL THEN
        RAISE EXCEPTION 'Bị từ chối: Thiếu thông tin định danh cán bộ thực hiện thao tác.'
            USING ERRCODE = '42501';
    END IF;

    -- Kiểm tra vai trò thực tế của cán bộ trong bảng public.profiles
    SELECT id, role, full_name, email, is_active INTO v_actor
    FROM public.profiles 
    WHERE id = p_actor_id AND is_active = TRUE;

    IF v_actor IS NULL OR v_actor.role NOT IN ('staff', 'admin') THEN
        RAISE EXCEPTION 'Bị từ chối: Chỉ Cán bộ Tuyển sinh (staff) hoặc Quản trị viên (admin) mới có quyền cập nhật chăm sóc khách hàng.'
            USING ERRCODE = '42501';
    END IF;

    -- 2. Chuẩn hóa & Validate trạng thái và ghi chú trước
    v_clean_note := NULLIF(TRIM(p_note), '');
    IF v_clean_note IS NOT NULL THEN
        IF LENGTH(v_clean_note) > 2000 THEN
            RAISE EXCEPTION 'Ghi chú chăm sóc vượt quá độ dài cho phép (tối đa 2000 ký tự).'
                USING ERRCODE = '22023';
        END IF;
        v_note_added := TRUE;
    END IF;

    v_clean_idempotency_key := NULLIF(TRIM(p_idempotency_key), '');

    -- 3. Khóa dòng Lead để kiểm soát đồng thời (Pessimistic Locking)
    SELECT * INTO v_lead
    FROM public.leads
    WHERE id = p_lead_id
    FOR UPDATE;

    IF v_lead IS NULL THEN
        RAISE EXCEPTION 'Không tìm thấy hồ sơ khách hàng với ID: %', p_lead_id
            USING ERRCODE = 'P0002';
    END IF;

    v_old_status := v_lead.counseling_status;
    IF p_counseling_status IS NOT NULL AND TRIM(p_counseling_status) <> '' THEN
        v_new_status := UPPER(TRIM(p_counseling_status));
        IF v_new_status NOT IN ('NEW', 'CONTACTED', 'CONSULTING', 'UNREACHABLE', 'LOST') THEN
            RAISE EXCEPTION 'Trạng thái chăm sóc không hợp lệ: "%". Chỉ chấp nhận: NEW, CONTACTED, CONSULTING, UNREACHABLE, LOST.', v_new_status
                USING ERRCODE = '22023';
        END IF;
        IF v_new_status <> v_old_status THEN
            v_status_changed := TRUE;
        END IF;
    ELSE
        v_new_status := v_old_status;
    END IF;

    -- 4. Kiểm tra Idempotency Token SAU KHI ĐÃ CÓ KHÓA HỒ SƠ
    IF v_clean_idempotency_key IS NOT NULL THEN
        SELECT id, action, old_values, new_values, created_at INTO v_existing_audit
        FROM public.audit_logs
        WHERE actor_id = p_actor_id 
          AND entity_name = 'leads'
          AND entity_id = p_lead_id
          AND idempotency_key = v_clean_idempotency_key
        LIMIT 1;

        IF v_existing_audit IS NOT NULL THEN
            -- Kiểm tra khớp nội dung thao tác đã ghi nhận
            IF (v_existing_audit.new_values->>'counseling_status' = v_new_status) AND
               ((v_existing_audit.new_values->>'added_note' IS NULL AND v_clean_note IS NULL) OR 
                (v_existing_audit.new_values->>'added_note' = v_clean_note)) THEN
                -- Replay đúng kết quả ban đầu
                RETURN jsonb_build_object(
                    'success', true,
                    'message', 'Thao tác đã được ghi nhận trước đó (Idempotent replay).',
                    'lead_id', p_lead_id,
                    'counseling_status', v_lead.counseling_status,
                    'counselor_note', v_lead.counselor_note,
                    'updated_at', v_lead.updated_at,
                    'audit_id', v_existing_audit.id,
                    'audit_action', v_existing_audit.action,
                    'audit_logged', true,
                    'is_idempotent_replay', true
                );
            ELSE
                RAISE EXCEPTION 'Xung đột khóa thao tác (Idempotency Key Mismatch): Khóa định danh "%" đã được sử dụng cho một nội dung khác.', v_clean_idempotency_key
                    USING ERRCODE = '22023';
            END IF;
        END IF;
    END IF;

    -- 5. Nếu không có thay đổi nào và không có ghi chú mới (Không phải thao tác ghi)
    IF NOT v_status_changed AND NOT v_note_added THEN
        RETURN jsonb_build_object(
            'success', true,
            'message', 'Không có thay đổi nào cần lưu.',
            'lead_id', p_lead_id,
            'counseling_status', v_old_status,
            'counselor_note', v_lead.counselor_note,
            'updated_at', v_lead.updated_at,
            'audit_logged', false
        );
    END IF;

    -- 6. BẮT BUỘC KIỂM SOÁT XUNG ĐỘT PHIÊN BẢN TẠI DATABASE CHO THAO TÁC GHI (A3.7.2)
    -- Khi có thao tác ghi thực sự (đổi trạng thái hoặc thêm ghi chú), bắt buộc caller phải truyền p_expected_updated_at
    IF v_lead.updated_at IS NOT NULL THEN
        IF p_expected_updated_at IS NULL THEN
            RAISE EXCEPTION 'Bị từ chối: Bắt buộc cung cấp thời điểm phiên bản dữ liệu hiện tại (expected_updated_at) để kiểm soát xung đột đồng thời.'
                USING ERRCODE = '22023';
        END IF;

        IF v_lead.updated_at <> p_expected_updated_at THEN
            RAISE EXCEPTION 'Xung đột cập nhật: Dữ liệu hồ sơ này đã được chỉnh sửa bởi cán bộ khác. Vui lòng tải lại trang để lấy thông tin mới nhất.'
                USING ERRCODE = '40001';
        END IF;
    END IF;

    v_old_note := v_lead.counselor_note;

    -- 7. Cập nhật bảng public.leads
    UPDATE public.leads
    SET counseling_status = v_new_status,
        counselor_note = COALESCE(v_clean_note, counselor_note),
        updated_at = v_now
    WHERE id = p_lead_id;

    -- 8. Xác định loại hành động kiểm toán
    IF v_status_changed AND v_note_added THEN
        v_action := 'LEAD_CARE_UPDATED';
    ELSIF v_status_changed THEN
        v_action := 'LEAD_COUNSELING_STATUS_CHANGED';
    ELSE
        v_action := 'LEAD_CARE_NOTE_ADDED';
    END IF;

    -- 9. Ghi nhật ký vào public.audit_logs trong cùng giao dịch
    INSERT INTO public.audit_logs (
        actor_id,
        action,
        entity_name,
        entity_id,
        old_values,
        new_values,
        reason,
        idempotency_key,
        created_at
    ) VALUES (
        p_actor_id,
        v_action,
        'leads',
        p_lead_id,
        jsonb_build_object('counseling_status', v_old_status, 'counselor_note', v_old_note),
        jsonb_build_object('counseling_status', v_new_status, 'counselor_note', COALESCE(v_clean_note, v_old_note), 'added_note', v_clean_note),
        COALESCE(v_clean_note, 'Thay đổi tiến độ tư vấn sang: ' || v_new_status),
        v_clean_idempotency_key,
        v_now
    ) RETURNING id INTO v_audit_id;

    -- 10. Trả về kết quả hoàn tất
    RETURN jsonb_build_object(
        'success', true,
        'message', 'Cập nhật tiến độ chăm sóc khách hàng thành công!',
        'lead_id', p_lead_id,
        'counseling_status', v_new_status,
        'counselor_note', COALESCE(v_clean_note, v_old_note),
        'updated_at', v_now,
        'audit_id', v_audit_id,
        'audit_action', v_action,
        'audit_logged', true
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp;

-- 2. Đảm bảo phân quyền chặt chẽ cho RPC
REVOKE ALL ON FUNCTION public.fn_update_lead_care_and_audit(UUID, UUID, VARCHAR, TEXT, TIMESTAMPTZ, VARCHAR) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.fn_update_lead_care_and_audit(UUID, UUID, VARCHAR, TEXT, TIMESTAMPTZ, VARCHAR) FROM anon;
GRANT EXECUTE ON FUNCTION public.fn_update_lead_care_and_audit(UUID, UUID, VARCHAR, TEXT, TIMESTAMPTZ, VARCHAR) TO authenticated;
GRANT EXECUTE ON FUNCTION public.fn_update_lead_care_and_audit(UUID, UUID, VARCHAR, TEXT, TIMESTAMPTZ, VARCHAR) TO service_role;

-- 3. Tạo index phục vụ tìm kiếm nhanh CTV theo affiliate_code trên affiliate_profiles và full_name trên profiles (nếu chưa có)
CREATE INDEX IF NOT EXISTS idx_affiliate_profiles_code_trgm ON public.affiliate_profiles USING btree (affiliate_code);
CREATE INDEX IF NOT EXISTS idx_leads_affiliate_code_captured ON public.leads USING btree (affiliate_code_captured);
