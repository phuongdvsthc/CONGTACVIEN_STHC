-- ==============================================================================
-- BỔ SUNG QUY TRÌNH DUYỆT / TỪ CHỐI HỒ SƠ CTV & GHI NHẬT KÝ KIỂM TOÁN NGUYÊN TỬ (A1.3)
-- Migration: 20260930000002_affiliate_review_workflow.sql
-- Dự án: Hệ thống Cộng tác viên Tuyển sinh Trường Saigontourist (STHC)
-- ==============================================================================

-- 1. HÀM NGUYÊN TỬ XÉT DUYỆT HỒ SƠ CTV (DUYỆT HOẶC TỪ CHỐI)
-- Đảm bảo tính nguyên tử (Atomicity): Cập nhật trạng thái và ghi audit_logs
-- trong cùng một transaction. Nếu có xung đột đồng thời hoặc lỗi, tự động rollback.
CREATE OR REPLACE FUNCTION public.fn_review_affiliate_profile(
    p_affiliate_id UUID,
    p_reviewer_id UUID,
    p_action VARCHAR(20),       -- 'APPROVE' hoặc 'REJECT'
    p_review_note TEXT DEFAULT NULL,
    p_client_ip VARCHAR(50) DEFAULT NULL,
    p_user_agent TEXT DEFAULT NULL
)
RETURNS JSONB AS $$
DECLARE
    v_aff public.affiliate_profiles%ROWTYPE;
    v_reviewer public.profiles%ROWTYPE;
    v_new_status VARCHAR(30);
    v_audit_action VARCHAR(100);
    v_clean_note TEXT;
    v_email_confirmed_at TIMESTAMPTZ;
    v_result JSONB;
BEGIN
    -- 1.1 Kiểm tra quyền hạn của người thực hiện
    SELECT *
    INTO v_reviewer 
    FROM public.profiles 
    WHERE id = p_reviewer_id;

    IF NOT FOUND OR v_reviewer.is_active = FALSE THEN
        RAISE EXCEPTION 'Bị từ chối: Tài khoản người duyệt không tồn tại hoặc đã bị vô hiệu hóa.'
            USING ERRCODE = '42501';
    END IF;

    IF v_reviewer.role NOT IN ('staff', 'admin') THEN
        RAISE EXCEPTION 'Bị từ chối: Chỉ Cán bộ Tuyển sinh (Staff) hoặc Quản trị viên (Admin) mới có quyền duyệt hồ sơ CTV.'
            USING ERRCODE = '42501';
    END IF;

    -- 1.2 Kiểm tra hành động hợp lệ
    IF p_action NOT IN ('APPROVE', 'REJECT') THEN
        RAISE EXCEPTION 'Hành động xét duyệt không hợp lệ (chỉ chấp nhận APPROVE hoặc REJECT).'
            USING ERRCODE = '22023';
    END IF;

    v_clean_note := NULLIF(TRIM(p_review_note), '');

    -- 1.3 Quy tắc lý do: Khi từ chối, bắt buộc phải có lý do rõ ràng
    IF p_action = 'REJECT' AND (v_clean_note IS NULL OR LENGTH(v_clean_note) = 0) THEN
        RAISE EXCEPTION 'Bắt buộc phải nhập lý do từ chối hồ sơ cộng tác viên.'
            USING ERRCODE = '22023';
    END IF;

    -- 1.4 Khóa bản ghi hồ sơ CTV để chống xung đột đồng thời (Pessimistic Locking)
    SELECT * INTO v_aff 
    FROM public.affiliate_profiles 
    WHERE id = p_affiliate_id 
    FOR UPDATE;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Không tìm thấy hồ sơ cộng tác viên với mã định danh cung cấp.'
            USING ERRCODE = 'P0002';
    END IF;

    -- 1.5 Quy tắc trạng thái: Chỉ hồ sơ đang CHỜ DUYỆT (PENDING_REVIEW) mới được xử lý
    IF v_aff.status <> 'PENDING_REVIEW' THEN
        RAISE EXCEPTION 'Hồ sơ đã được xử lý trước đó, vui lòng tải lại trang.'
            USING ERRCODE = 'P0003';
    END IF;

    -- 1.5.1 Quy tắc xác thực email: Chỉ cho duyệt khi email đã được xác thực (A1.3)
    IF p_action = 'APPROVE' THEN
        SELECT email_confirmed_at INTO v_email_confirmed_at
        FROM auth.users
        WHERE id = v_aff.user_id;

        IF v_email_confirmed_at IS NULL THEN
            RAISE EXCEPTION 'Không thể duyệt hồ sơ do email của Cộng tác viên chưa được xác thực. Vui lòng yêu cầu CTV hoàn tất xác thực email trước khi duyệt.'
                USING ERRCODE = '22023';
        END IF;
    END IF;

    -- 1.6 Xác định trạng thái mới và mã hành động kiểm toán
    IF p_action = 'APPROVE' THEN
        v_new_status := 'ACTIVE';
        v_audit_action := 'AFFILIATE_APPROVED';
    ELSE
        v_new_status := 'REJECTED';
        v_audit_action := 'AFFILIATE_REJECTED';
    END IF;

    -- 1.7 Cập nhật hồ sơ CTV
    UPDATE public.affiliate_profiles
    SET 
        status = v_new_status,
        reviewed_by = p_reviewer_id,
        reviewed_at = NOW(),
        review_note = v_clean_note,
        updated_at = NOW()
    WHERE id = p_affiliate_id;

    -- 1.8 Ghi nhật ký kiểm toán vào bảng audit_logs
    INSERT INTO public.audit_logs (
        actor_id,
        action,
        entity_name,
        entity_id,
        old_values,
        new_values,
        reason,
        ip_address,
        user_agent,
        created_at
    ) VALUES (
        p_reviewer_id,
        v_audit_action,
        'affiliate_profiles',
        p_affiliate_id,
        jsonb_build_object(
            'status', v_aff.status,
            'review_note', v_aff.review_note
        ),
        jsonb_build_object(
            'status', v_new_status,
            'reviewed_by', p_reviewer_id,
            'reviewed_at', NOW(),
            'review_note', v_clean_note
        ),
        v_clean_note,
        p_client_ip,
        p_user_agent,
        NOW()
    );

    v_result := jsonb_build_object(
        'success', TRUE,
        'affiliate_id', p_affiliate_id,
        'status', v_new_status,
        'reviewed_by', p_reviewer_id,
        'reviewer_name', v_reviewer.full_name,
        'reviewed_at', NOW(),
        'review_note', v_clean_note
    );

    RETURN v_result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, auth, pg_temp;

-- Phân quyền thực thi: Chỉ service_role và authenticated có role staff/admin
REVOKE ALL ON FUNCTION public.fn_review_affiliate_profile(UUID, UUID, VARCHAR, TEXT, VARCHAR, TEXT) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.fn_review_affiliate_profile(UUID, UUID, VARCHAR, TEXT, VARCHAR, TEXT) TO authenticated, service_role;
