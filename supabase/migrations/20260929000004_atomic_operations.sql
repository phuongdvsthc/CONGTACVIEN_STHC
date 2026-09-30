-- ==============================================================================
-- BƯỚC DB-A: MIGRATION 004 - THAO TÁC NGUYÊN TỬ CHO ĐỐI SOÁT, TẠO THƯỞNG, PHÊ DUYỆT VÀ HỦY GHÉP
-- Dự án: Hệ thống Cộng tác viên Tuyển sinh Trường Saigontourist (STHC)
-- Mã file: 20260929000004_atomic_operations.sql
-- ==============================================================================

-- ==============================================================================
-- 1. HÀM NGUYÊN TỬ: ĐỐI SOÁT HỒ SƠ & TỰ ĐỘNG KHỞI TẠO THƯỞNG 500.000 VNĐ
-- Quy tắc: Nếu bất kỳ bước nào lỗi (như trùng mã hồ sơ, sai trạng thái),
-- toàn bộ thao tác tự động rollback, không để lại bản ghi rác hoặc dở dang.
-- ==============================================================================
CREATE OR REPLACE FUNCTION public.fn_reconcile_lead_and_create_reward(
    p_lead_id UUID,
    p_staff_id UUID,
    p_external_admission_code VARCHAR(100),
    p_external_student_code VARCHAR(100),
    p_tuition_fee_collected NUMERIC(14, 2),
    p_receipt_number VARCHAR(100),
    p_tuition_paid_at TIMESTAMPTZ,
    p_staff_note TEXT DEFAULT NULL
)
RETURNS JSONB AS $$
DECLARE
    v_lead RECORD;
    v_affiliate RECORD;
    v_reconciliation_id UUID;
    v_reward_id UUID := NULL;
    v_staff_role VARCHAR(30);
    v_admission_code_clean VARCHAR(100);
BEGIN
    -- 1. Kiểm tra quyền hạn của cán bộ thực hiện
    SELECT role INTO v_staff_role FROM public.profiles WHERE id = p_staff_id AND is_active = TRUE;
    IF v_staff_role IS NULL OR v_staff_role NOT IN ('staff', 'admin') THEN
        RAISE EXCEPTION 'Bị từ chối: Chỉ Cán bộ Tuyển sinh hoặc Quản trị viên mới có quyền thực hiện đối soát hồ sơ.'
            USING ERRCODE = '42501';
    END IF;

    -- 2. Kiểm tra tính hợp lệ của tham số bắt buộc
    v_admission_code_clean := TRIM(p_external_admission_code);
    IF v_admission_code_clean IS NULL OR v_admission_code_clean = '' THEN
        RAISE EXCEPTION 'Mã hồ sơ tuyển sinh ngoại bộ (external_admission_code) không được để trống.'
            USING ERRCODE = '22023';
    END IF;

    IF p_tuition_fee_collected IS NULL OR p_tuition_fee_collected <= 0 THEN
        RAISE EXCEPTION 'Số tiền học phí thực thu phải lớn hơn 0.'
            USING ERRCODE = '22023';
    END IF;

    IF p_tuition_paid_at IS NULL THEN
        RAISE EXCEPTION 'Ngày nộp học phí thực tế không được để trống.'
            USING ERRCODE = '22023';
    END IF;

    -- 3. Khóa bản ghi Lead để kiểm tra đồng thời (Pessimistic Locking)
    SELECT * INTO v_lead 
    FROM public.leads 
    WHERE id = p_lead_id 
    FOR UPDATE;

    IF v_lead IS NULL THEN
        RAISE EXCEPTION 'Không tìm thấy Lead với ID: %', p_lead_id
            USING ERRCODE = 'P0002';
    END IF;

    -- Kiểm tra lead đã có đối soát hợp lệ nào đang hoạt động chưa
    IF v_lead.reconciliation_status = 'MATCHED_VALID' THEN
        RAISE EXCEPTION 'Lead này đã được đối soát hợp lệ thành công trước đó. Vui lòng hủy ghép trước nếu muốn thay đổi.'
            USING ERRCODE = '23505';
    END IF;

    -- 4. Kiểm tra mã hồ sơ ngoại bộ có đang được gắn với lead hợp lệ khác không
    IF EXISTS (
        SELECT 1 FROM public.lead_reconciliations 
        WHERE external_admission_code = v_admission_code_clean 
          AND reconciliation_status = 'MATCHED_VALID'
    ) THEN
        RAISE EXCEPTION 'Mã hồ sơ tuyển sinh "%" đã được đối soát cho một học viên khác trong hệ thống.', v_admission_code_clean
            USING ERRCODE = '23505';
    END IF;

    -- 5. Tạo bản ghi đối soát mới
    INSERT INTO public.lead_reconciliations (
        lead_id,
        staff_id,
        external_admission_code,
        external_student_code,
        tuition_fee_collected,
        receipt_number,
        tuition_paid_at,
        reconciliation_status,
        staff_note
    ) VALUES (
        p_lead_id,
        p_staff_id,
        v_admission_code_clean,
        NULLIF(TRIM(p_external_student_code), ''),
        p_tuition_fee_collected,
        NULLIF(TRIM(p_receipt_number), ''),
        p_tuition_paid_at,
        'MATCHED_VALID',
        p_staff_note
    ) RETURNING id INTO v_reconciliation_id;

    -- 6. Cập nhật trạng thái đối soát của Lead
    UPDATE public.leads 
    SET reconciliation_status = 'MATCHED_VALID',
        updated_at = NOW()
    WHERE id = p_lead_id;

    -- 7. Kiểm tra điều kiện sinh thưởng 500.000 VNĐ cho CTV
    IF v_lead.affiliate_id IS NOT NULL THEN
        -- Kiểm tra CTV có đang ở trạng thái ACTIVE hay không
        SELECT * INTO v_affiliate 
        FROM public.affiliate_profiles 
        WHERE id = v_lead.affiliate_id;

        IF v_affiliate IS NOT NULL AND v_affiliate.status = 'ACTIVE' THEN
            -- Tạo khoản thưởng PENDING_APPROVAL
            INSERT INTO public.rewards (
                lead_id,
                reconciliation_id,
                affiliate_id,
                amount,
                status
            ) VALUES (
                p_lead_id,
                v_reconciliation_id,
                v_lead.affiliate_id,
                500000.00,
                'PENDING_APPROVAL'
            ) RETURNING id INTO v_reward_id;

            -- Cập nhật trạng thái thưởng của Lead
            UPDATE public.leads 
            SET reward_status = 'PENDING_APPROVAL',
                updated_at = NOW()
            WHERE id = p_lead_id;
        ELSE
            -- CTV không ACTIVE -> Không sinh thưởng
            UPDATE public.leads 
            SET reward_status = 'NONE',
                updated_at = NOW()
            WHERE id = p_lead_id;
        END IF;
    ELSE
        -- Lead tự nhiên (không qua CTV) -> Không sinh thưởng
        UPDATE public.leads 
        SET reward_status = 'NONE',
            updated_at = NOW()
        WHERE id = p_lead_id;
    END IF;

    -- 8. Ghi nhật ký kiểm toán (Audit Log)
    INSERT INTO public.audit_logs (
        actor_id,
        action,
        entity_name,
        entity_id,
        old_values,
        new_values,
        reason
    ) VALUES (
        p_staff_id,
        'RECONCILE_LEAD',
        'leads',
        p_lead_id,
        jsonb_build_object(
            'reconciliation_status', v_lead.reconciliation_status,
            'reward_status', v_lead.reward_status
        ),
        jsonb_build_object(
            'reconciliation_status', 'MATCHED_VALID',
            'reward_status', CASE WHEN v_reward_id IS NOT NULL THEN 'PENDING_APPROVAL' ELSE 'NONE' END,
            'external_admission_code', v_admission_code_clean,
            'reconciliation_id', v_reconciliation_id,
            'reward_id', v_reward_id
        ),
        COALESCE(p_staff_note, 'Đối soát hồ sơ thực tế và tạo thưởng')
    );

    RETURN jsonb_build_object(
        'success', TRUE,
        'message', 'Đối soát thành công!',
        'lead_id', p_lead_id,
        'reconciliation_id', v_reconciliation_id,
        'reward_id', v_reward_id,
        'reward_created', (v_reward_id IS NOT NULL)
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ==============================================================================
-- 2. HÀM NGUYÊN TỬ: HỦY GHÉP ĐỐI SOÁT (BẢO TOÀN LỊCH SỬ KỂ CẢ KHI THƯỞNG ĐÃ DUYỆT)
-- Quy tắc:
-- - Bản ghi đối soát chuyển sang VOIDED kèm lý do và người hủy.
-- - Bản ghi thưởng liên quan (kể cả APPROVED hay PENDING) chuyển sang VOIDED.
-- - Bản ghi KHÔNG bị xóa để phục vụ thanh tra, kiểm toán.
-- - Giải phóng mã hồ sơ để cho phép đối soát lại chính xác cho cùng lead hoặc lead khác.
-- ==============================================================================
CREATE OR REPLACE FUNCTION public.fn_void_reconciliation_and_reward(
    p_lead_id UUID,
    p_staff_id UUID,
    p_void_reason TEXT
)
RETURNS JSONB AS $$
DECLARE
    v_lead RECORD;
    v_recon RECORD;
    v_reward RECORD;
    v_staff_role VARCHAR(30);
    v_clean_reason TEXT;
BEGIN
    -- 1. Kiểm tra lý do bắt buộc
    v_clean_reason := TRIM(p_void_reason);
    IF v_clean_reason IS NULL OR v_clean_reason = '' THEN
        RAISE EXCEPTION 'Bắt buộc phải nhập lý do hủy ghép đối soát.'
            USING ERRCODE = '22023';
    END IF;

    -- 2. Kiểm tra quyền hạn
    SELECT role INTO v_staff_role FROM public.profiles WHERE id = p_staff_id AND is_active = TRUE;
    IF v_staff_role IS NULL OR v_staff_role NOT IN ('staff', 'admin') THEN
        RAISE EXCEPTION 'Bị từ chối: Chỉ Cán bộ Tuyển sinh hoặc Quản trị viên mới có quyền hủy ghép đối soát.'
            USING ERRCODE = '42501';
    END IF;

    -- 3. Khóa bản ghi Lead
    SELECT * INTO v_lead FROM public.leads WHERE id = p_lead_id FOR UPDATE;
    IF v_lead IS NULL THEN
        RAISE EXCEPTION 'Không tìm thấy Lead với ID: %', p_lead_id USING ERRCODE = 'P0002';
    END IF;

    -- 4. Tìm bản ghi đối soát đang MATCHED_VALID
    SELECT * INTO v_recon 
    FROM public.lead_reconciliations 
    WHERE lead_id = p_lead_id AND reconciliation_status = 'MATCHED_VALID'
    FOR UPDATE;

    IF v_recon IS NULL THEN
        RAISE EXCEPTION 'Lead này hiện không có bản ghi đối soát hợp lệ nào đang hoạt động để hủy.'
            USING ERRCODE = 'P0002';
    END IF;

    -- 5. Cập nhật bản ghi đối soát thành VOIDED (bảo toàn lịch sử)
    UPDATE public.lead_reconciliations 
    SET reconciliation_status = 'VOIDED',
        void_reason = v_clean_reason,
        voided_by = p_staff_id,
        voided_at = NOW()
    WHERE id = v_recon.id;

    -- 6. Tìm bản ghi thưởng liên kết và chuyển sang VOIDED
    SELECT * INTO v_reward 
    FROM public.rewards 
    WHERE reconciliation_id = v_recon.id AND status IN ('PENDING_APPROVAL', 'APPROVED')
    FOR UPDATE;

    IF v_reward IS NOT NULL THEN
        UPDATE public.rewards 
        SET status = 'VOIDED',
            void_reason = v_clean_reason,
            voided_by = p_staff_id,
            voided_at = NOW(),
            updated_at = NOW()
        WHERE id = v_reward.id;
    END IF;

    -- 7. Cập nhật lại Lead về trạng thái ban đầu
    UPDATE public.leads 
    SET reconciliation_status = 'NOT_RECONCILED',
        reward_status = 'NONE',
        updated_at = NOW()
    WHERE id = p_lead_id;

    -- 8. Ghi nhật ký kiểm toán
    INSERT INTO public.audit_logs (
        actor_id,
        action,
        entity_name,
        entity_id,
        old_values,
        new_values,
        reason
    ) VALUES (
        p_staff_id,
        'VOID_RECONCILIATION',
        'lead_reconciliations',
        v_recon.id,
        jsonb_build_object(
            'external_admission_code', v_recon.external_admission_code,
            'reconciliation_status', 'MATCHED_VALID',
            'reward_status', CASE WHEN v_reward IS NOT NULL THEN v_reward.status ELSE 'NONE' END
        ),
        jsonb_build_object(
            'reconciliation_status', 'VOIDED',
            'reward_status', 'VOIDED',
            'lead_reconciliation_status', 'NOT_RECONCILED',
            'lead_reward_status', 'NONE'
        ),
        v_clean_reason
    );

    RETURN jsonb_build_object(
        'success', TRUE,
        'message', 'Đã hủy ghép đối soát thành công và bảo toàn lịch sử!',
        'lead_id', p_lead_id,
        'voided_reconciliation_id', v_recon.id,
        'voided_reward_id', CASE WHEN v_reward IS NOT NULL THEN v_reward.id ELSE NULL END
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ==============================================================================
-- 3. HÀM NGUYÊN TỬ: PHÊ DUYỆT THƯỞNG TUYỂN SINH (APPROVE REWARD)
-- ==============================================================================
CREATE OR REPLACE FUNCTION public.fn_approve_reward(
    p_reward_id UUID,
    p_admin_id UUID
)
RETURNS JSONB AS $$
DECLARE
    v_reward RECORD;
    v_admin_role VARCHAR(30);
BEGIN
    -- 1. Kiểm tra quyền Admin
    SELECT role INTO v_admin_role FROM public.profiles WHERE id = p_admin_id AND is_active = TRUE;
    IF v_admin_role IS NULL OR v_admin_role <> 'admin' THEN
        RAISE EXCEPTION 'Bị từ chối: Chỉ Quản trị viên / Trưởng bộ phận Tuyển sinh mới có quyền phê duyệt thưởng.'
            USING ERRCODE = '42501';
    END IF;

    -- 2. Khóa bản ghi thưởng
    SELECT * INTO v_reward FROM public.rewards WHERE id = p_reward_id FOR UPDATE;
    IF v_reward IS NULL THEN
        RAISE EXCEPTION 'Không tìm thấy khoản thưởng với ID: %', p_reward_id USING ERRCODE = 'P0002';
    END IF;

    IF v_reward.status <> 'PENDING_APPROVAL' THEN
        RAISE EXCEPTION 'Khoản thưởng này đang ở trạng thái "%", chỉ khoản thưởng "PENDING_APPROVAL" mới có thể phê duyệt.', v_reward.status
            USING ERRCODE = '22023';
    END IF;

    -- 3. Cập nhật thưởng thành APPROVED
    UPDATE public.rewards 
    SET status = 'APPROVED',
        approved_by = p_admin_id,
        approved_at = NOW(),
        updated_at = NOW()
    WHERE id = p_reward_id;

    -- 4. Đồng bộ trạng thái Lead
    UPDATE public.leads 
    SET reward_status = 'APPROVED',
        updated_at = NOW()
    WHERE id = v_reward.lead_id;

    -- 5. Ghi nhật ký kiểm toán
    INSERT INTO public.audit_logs (
        actor_id,
        action,
        entity_name,
        entity_id,
        old_values,
        new_values,
        reason
    ) VALUES (
        p_admin_id,
        'APPROVE_REWARD',
        'rewards',
        p_reward_id,
        jsonb_build_object('status', 'PENDING_APPROVAL'),
        jsonb_build_object('status', 'APPROVED', 'approved_by', p_admin_id, 'approved_at', NOW()),
        'Phê duyệt thưởng tuyển sinh 500.000 VNĐ'
    );

    RETURN jsonb_build_object(
        'success', TRUE,
        'message', 'Phê duyệt thưởng 500.000 VNĐ thành công!',
        'reward_id', p_reward_id,
        'status', 'APPROVED'
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ==============================================================================
-- 4. HÀM NGUYÊN TỬ: TỪ CHỐI DUYỆT THƯỞNG (REJECT REWARD)
-- ==============================================================================
CREATE OR REPLACE FUNCTION public.fn_reject_reward(
    p_reward_id UUID,
    p_admin_id UUID,
    p_rejection_reason TEXT
)
RETURNS JSONB AS $$
DECLARE
    v_reward RECORD;
    v_admin_role VARCHAR(30);
    v_clean_reason TEXT;
BEGIN
    v_clean_reason := TRIM(p_rejection_reason);
    IF v_clean_reason IS NULL OR v_clean_reason = '' THEN
        RAISE EXCEPTION 'Bắt buộc phải nhập lý do từ chối duyệt thưởng.'
            USING ERRCODE = '22023';
    END IF;

    SELECT role INTO v_admin_role FROM public.profiles WHERE id = p_admin_id AND is_active = TRUE;
    IF v_admin_role IS NULL OR v_admin_role <> 'admin' THEN
        RAISE EXCEPTION 'Bị từ chối: Chỉ Quản trị viên mới có quyền từ chối duyệt thưởng.'
            USING ERRCODE = '42501';
    END IF;

    SELECT * INTO v_reward FROM public.rewards WHERE id = p_reward_id FOR UPDATE;
    IF v_reward IS NULL THEN
        RAISE EXCEPTION 'Không tìm thấy khoản thưởng với ID: %', p_reward_id USING ERRCODE = 'P0002';
    END IF;

    IF v_reward.status <> 'PENDING_APPROVAL' THEN
        RAISE EXCEPTION 'Khoản thưởng này đang ở trạng thái "%", chỉ khoản thưởng "PENDING_APPROVAL" mới có thể từ chối.', v_reward.status
            USING ERRCODE = '22023';
    END IF;

    UPDATE public.rewards 
    SET status = 'REJECTED',
        approved_by = p_admin_id,
        approved_at = NOW(),
        rejection_reason = v_clean_reason,
        updated_at = NOW()
    WHERE id = p_reward_id;

    UPDATE public.leads 
    SET reward_status = 'REJECTED',
        updated_at = NOW()
    WHERE id = v_reward.lead_id;

    INSERT INTO public.audit_logs (
        actor_id,
        action,
        entity_name,
        entity_id,
        old_values,
        new_values,
        reason
    ) VALUES (
        p_admin_id,
        'REJECT_REWARD',
        'rewards',
        p_reward_id,
        jsonb_build_object('status', 'PENDING_APPROVAL'),
        jsonb_build_object('status', 'REJECTED', 'rejection_reason', v_clean_reason),
        v_clean_reason
    );

    RETURN jsonb_build_object(
        'success', TRUE,
        'message', 'Đã từ chối duyệt thưởng.',
        'reward_id', p_reward_id,
        'status', 'REJECTED'
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ==============================================================================
-- 5. PHÂN QUYỀN THỰC THI CHO CÁC HÀM NGUYÊN TỬ
-- ==============================================================================
REVOKE EXECUTE ON FUNCTION public.fn_reconcile_lead_and_create_reward FROM anon, public;
REVOKE EXECUTE ON FUNCTION public.fn_void_reconciliation_and_reward FROM anon, public;
REVOKE EXECUTE ON FUNCTION public.fn_approve_reward FROM anon, public;
REVOKE EXECUTE ON FUNCTION public.fn_reject_reward FROM anon, public;

GRANT EXECUTE ON FUNCTION public.fn_reconcile_lead_and_create_reward TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.fn_void_reconciliation_and_reward TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.fn_approve_reward TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.fn_reject_reward TO authenticated, service_role;
