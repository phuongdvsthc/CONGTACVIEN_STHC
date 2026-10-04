-- ==============================================================================
-- BƯỚC DB-A3.6: MIGRATION 20261003000002 - THAO TÁC NGUYÊN TỬ CẬP NHẬT CHĂM SÓC & GHI NHẬT KÝ KIỂM TOÁN LEAD
-- Dự án: Hệ thống Cộng tác viên Tuyển sinh Trường Saigontourist (STHC)
-- Mã file: 20261003000002_add_lead_care_history_and_atomic_update.sql
-- ==============================================================================

-- ==============================================================================
-- 1. HÀM NGUYÊN TỬ: CẬP NHẬT TRẠNG THÁI CHĂM SÓC & GHI CHÚ NỘI BỘ (A3.6)
-- Quy tắc:
--   - Chỉ cán bộ tuyển sinh (staff) hoặc quản trị viên (admin) mới được thực hiện.
--   - Kiểm tra optimistic concurrency (xung đột cập nhật đồng thời qua updated_at).
--   - Khóa bi quan (FOR UPDATE) để ngăn chặn race condition.
--   - Không cho phép can thiệp vào các trường đối chiếu (reconciliation_status, external_admission_code, v.v.)
--   - Ghi nhật ký audit_logs trong cùng một giao dịch nguyên tử.
-- ==============================================================================
CREATE OR REPLACE FUNCTION public.fn_update_lead_care_and_audit(
    p_lead_id UUID,
    p_actor_id UUID,
    p_counseling_status VARCHAR(50) DEFAULT NULL,
    p_note TEXT DEFAULT NULL,
    p_expected_updated_at TIMESTAMPTZ DEFAULT NULL
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
BEGIN
    -- 1. Kiểm tra quyền hạn của người thực hiện
    SELECT id, role, full_name, email, is_active INTO v_actor
    FROM public.profiles 
    WHERE id = p_actor_id AND is_active = TRUE;

    IF v_actor IS NULL OR v_actor.role NOT IN ('staff', 'admin') THEN
        RAISE EXCEPTION 'Bị từ chối: Chỉ Cán bộ Tuyển sinh hoặc Quản trị viên mới có quyền cập nhật chăm sóc khách hàng.'
            USING ERRCODE = '42501';
    END IF;

    -- 2. Khóa dòng Lead để kiểm soát đồng thời (Pessimistic Lock)
    SELECT * INTO v_lead
    FROM public.leads
    WHERE id = p_lead_id
    FOR UPDATE;

    IF v_lead IS NULL THEN
        RAISE EXCEPTION 'Không tìm thấy hồ sơ khách hàng với ID: %', p_lead_id
            USING ERRCODE = 'P0002';
    END IF;

    -- 3. Kiểm tra xung đột cập nhật đồng thời (Optimistic Concurrency Control)
    IF p_expected_updated_at IS NOT NULL AND v_lead.updated_at IS NOT NULL THEN
        IF ABS(EXTRACT(EPOCH FROM (v_lead.updated_at - p_expected_updated_at))) > 2 THEN
            RAISE EXCEPTION 'Xung đột cập nhật: Dữ liệu hồ sơ này vừa được cán bộ khác chỉnh sửa. Vui lòng tải lại trang để lấy thông tin mới nhất.'
                USING ERRCODE = '40001';
        END IF;
    END IF;

    -- 4. Chuẩn hóa & Validate trạng thái chăm sóc
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

    -- 5. Chuẩn hóa & Validate ghi chú nội bộ
    v_clean_note := NULLIF(TRIM(p_note), '');
    IF v_clean_note IS NOT NULL THEN
        IF LENGTH(v_clean_note) > 2000 THEN
            RAISE EXCEPTION 'Ghi chú chăm sóc vượt quá độ dài cho phép (tối đa 2000 ký tự).'
                USING ERRCODE = '22023';
        END IF;
        v_note_added := TRUE;
    END IF;

    -- 6. Nếu không có thay đổi nào và không có ghi chú mới, trả về trạng thái hiện tại
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
        created_at
    ) VALUES (
        p_actor_id,
        v_action,
        'leads',
        p_lead_id,
        jsonb_build_object(
            'counseling_status', v_old_status,
            'counselor_note', v_old_note
        ),
        jsonb_build_object(
            'counseling_status', v_new_status,
            'counselor_note', COALESCE(v_clean_note, v_old_note),
            'added_note', v_clean_note
        ),
        COALESCE(v_clean_note, 'Thay đổi tiến độ tư vấn sang: ' || v_new_status),
        v_now
    ) RETURNING id INTO v_audit_id;

    -- 10. Trả về kết quả thành công
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
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Phân quyền thực thi hàm RPC
REVOKE ALL ON FUNCTION public.fn_update_lead_care_and_audit(UUID, UUID, VARCHAR, TEXT, TIMESTAMPTZ) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.fn_update_lead_care_and_audit(UUID, UUID, VARCHAR, TEXT, TIMESTAMPTZ) TO authenticated;
GRANT EXECUTE ON FUNCTION public.fn_update_lead_care_and_audit(UUID, UUID, VARCHAR, TEXT, TIMESTAMPTZ) TO service_role;
