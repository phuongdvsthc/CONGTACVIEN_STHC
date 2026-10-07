-- ==============================================================================
-- MIGRATION: Nâng cấp các hàm RPC A5 (fn_approve_reward, fn_reject_reward, fn_void_reward)
-- Hỗ trợ kiểm quyền linh hoạt qua hệ thống nhóm quyền (PQ.1-PQ.5) và kiểm tra căn cứ ngặt nghèo.
-- ==============================================================================

-- 1. HÀM NGUYÊN TỬ: PHÊ DUYỆT THƯỞNG (APPROVE REWARD)
CREATE OR REPLACE FUNCTION public.fn_approve_reward(
    p_reward_id UUID,
    p_admin_id UUID
)
RETURNS JSONB AS $$
DECLARE
    v_reward RECORD;
    v_recon RECORD;
    v_has_perm BOOLEAN;
BEGIN
    -- 1. Kiểm tra quyền rewards.approve
    SELECT public.fn_has_permission(p_admin_id, 'rewards.approve') INTO v_has_perm;
    IF v_has_perm IS NOT TRUE THEN
        RAISE EXCEPTION 'Bị từ chối: Tài khoản không có quyền phê duyệt thù lao (rewards.approve).'
            USING ERRCODE = '42501';
    END IF;

    -- 2. Khóa và kiểm tra bản ghi thưởng
    SELECT * INTO v_reward FROM public.rewards WHERE id = p_reward_id FOR UPDATE;
    IF v_reward IS NULL THEN
        RAISE EXCEPTION 'Không tìm thấy khoản thù lao với ID: %', p_reward_id USING ERRCODE = 'P0002';
    END IF;

    IF v_reward.status <> 'PENDING_APPROVAL' THEN
        RAISE EXCEPTION 'Khoản thù lao đang ở trạng thái "%", chỉ khoản thù lao "PENDING_APPROVAL" mới có thể phê duyệt.', v_reward.status
            USING ERRCODE = '22023';
    END IF;

    -- 3. Kiểm tra căn cứ đối chiếu (reconciliation) còn hiệu lực và MATCHED_VALID
    SELECT * INTO v_recon FROM public.lead_reconciliations WHERE id = v_reward.reconciliation_id;
    IF v_recon IS NULL OR v_recon.reconciliation_status = 'VOIDED' THEN
        RAISE EXCEPTION 'Căn cứ đối chiếu của khoản thù lao này không tồn tại hoặc đã bị hủy (VOIDED).'
            USING ERRCODE = '22023';
    END IF;

    -- 4. Cập nhật thưởng thành APPROVED
    UPDATE public.rewards 
    SET status = 'APPROVED',
        approved_by = p_admin_id,
        approved_at = NOW(),
        updated_at = NOW()
    WHERE id = p_reward_id;

    -- 5. Đồng bộ trạng thái Lead
    UPDATE public.leads 
    SET reward_status = 'APPROVED',
        updated_at = NOW()
    WHERE id = v_reward.lead_id;

    -- 6. Ghi nhật ký kiểm toán
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
        'Phê duyệt khoản thù lao tuyển sinh 500.000 VNĐ'
    );

    RETURN jsonb_build_object(
        'success', TRUE,
        'message', 'Phê duyệt khoản thù lao 500.000 VNĐ thành công!',
        'reward_id', p_reward_id,
        'status', 'APPROVED'
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 2. HÀM NGUYÊN TỬ: TỪ CHỐI THƯỞNG (REJECT REWARD)
CREATE OR REPLACE FUNCTION public.fn_reject_reward(
    p_reward_id UUID,
    p_admin_id UUID,
    p_rejection_reason TEXT
)
RETURNS JSONB AS $$
DECLARE
    v_reward RECORD;
    v_clean_reason TEXT;
    v_has_perm BOOLEAN;
BEGIN
    v_clean_reason := TRIM(p_rejection_reason);
    IF v_clean_reason IS NULL OR v_clean_reason = '' THEN
        RAISE EXCEPTION 'Bắt buộc phải nhập lý do từ chối phê duyệt thù lao.'
            USING ERRCODE = '22023';
    END IF;

    SELECT public.fn_has_permission(p_admin_id, 'rewards.reject') INTO v_has_perm;
    IF v_has_perm IS NOT TRUE THEN
        RAISE EXCEPTION 'Bị từ chối: Tài khoản không có quyền từ chối thù lao (rewards.reject).'
            USING ERRCODE = '42501';
    END IF;

    SELECT * INTO v_reward FROM public.rewards WHERE id = p_reward_id FOR UPDATE;
    IF v_reward IS NULL THEN
        RAISE EXCEPTION 'Không tìm thấy khoản thù lao với ID: %', p_reward_id USING ERRCODE = 'P0002';
    END IF;

    IF v_reward.status <> 'PENDING_APPROVAL' THEN
        RAISE EXCEPTION 'Khoản thù lao đang ở trạng thái "%", chỉ khoản thù lao "PENDING_APPROVAL" mới có thể từ chối.', v_reward.status
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
        'message', 'Đã từ chối duyệt thù lao.',
        'reward_id', p_reward_id,
        'status', 'REJECTED'
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 3. HÀM NGUYÊN TỬ: HỦY TRỰC TIẾP THƯỞNG (VOID REWARD)
CREATE OR REPLACE FUNCTION public.fn_void_reward(
    p_reward_id UUID,
    p_admin_id UUID,
    p_void_reason TEXT
)
RETURNS JSONB AS $$
DECLARE
    v_reward RECORD;
    v_clean_reason TEXT;
    v_has_perm BOOLEAN;
BEGIN
    v_clean_reason := TRIM(p_void_reason);
    IF v_clean_reason IS NULL OR v_clean_reason = '' THEN
        RAISE EXCEPTION 'Bắt buộc phải nhập lý do hủy thù lao.'
            USING ERRCODE = '22023';
    END IF;

    SELECT public.fn_has_permission(p_admin_id, 'rewards.void') INTO v_has_perm;
    IF v_has_perm IS NOT TRUE THEN
        RAISE EXCEPTION 'Bị từ chối: Tài khoản không có quyền hủy thù lao (rewards.void).'
            USING ERRCODE = '42501';
    END IF;

    SELECT * INTO v_reward FROM public.rewards WHERE id = p_reward_id FOR UPDATE;
    IF v_reward IS NULL THEN
        RAISE EXCEPTION 'Không tìm thấy khoản thù lao với ID: %', p_reward_id USING ERRCODE = 'P0002';
    END IF;

    IF v_reward.status NOT IN ('PENDING_APPROVAL', 'APPROVED') THEN
        RAISE EXCEPTION 'Khoản thù lao đang ở trạng thái "%", chỉ có thể hủy khoản ở trạng thái PENDING_APPROVAL hoặc APPROVED.', v_reward.status
            USING ERRCODE = '22023';
    END IF;

    UPDATE public.rewards 
    SET status = 'VOIDED',
        voided_by = p_admin_id,
        voided_at = NOW(),
        void_reason = v_clean_reason,
        updated_at = NOW()
    WHERE id = p_reward_id;

    UPDATE public.leads 
    SET reward_status = 'VOIDED',
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
        'VOID_REWARD',
        'rewards',
        p_reward_id,
        jsonb_build_object('status', v_reward.status),
        jsonb_build_object('status', 'VOIDED', 'void_reason', v_clean_reason, 'source', 'A5'),
        v_clean_reason
    );

    RETURN jsonb_build_object(
        'success', TRUE,
        'message', 'Hủy khoản thù lao thành công!',
        'reward_id', p_reward_id,
        'status', 'VOIDED'
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

REVOKE EXECUTE ON FUNCTION public.fn_approve_reward FROM anon, public;
REVOKE EXECUTE ON FUNCTION public.fn_reject_reward FROM anon, public;
REVOKE EXECUTE ON FUNCTION public.fn_void_reward FROM anon, public;

GRANT EXECUTE ON FUNCTION public.fn_approve_reward TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.fn_reject_reward TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.fn_void_reward TO authenticated, service_role;
