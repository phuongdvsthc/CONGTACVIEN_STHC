-- ==============================================================================
-- BỔ SUNG QUY TRÌNH TẠM NGƯNG & KÍCH HOẠT LẠI CTV (YÊU CẦU A1.4)
-- Migration: 20260930000003_affiliate_suspension_workflow.sql
-- Dự án: Hệ thống Cộng tác viên Tuyển sinh Trường Saigontourist (STHC)
-- ==============================================================================

-- 1. BỔ SUNG CỘT THEO DÕI TẠM NGƯNG VÀ KÍCH HOẠT LẠI (KHÔNG GHI ĐÈ KẾT QUẢ DUYỆT BAN ĐẦU)
ALTER TABLE public.affiliate_profiles 
ADD COLUMN IF NOT EXISTS suspended_by UUID REFERENCES public.profiles(id) ON DELETE RESTRICT,
ADD COLUMN IF NOT EXISTS suspended_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS suspension_reason TEXT,
ADD COLUMN IF NOT EXISTS reactivated_by UUID REFERENCES public.profiles(id) ON DELETE RESTRICT,
ADD COLUMN IF NOT EXISTS reactivated_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS reactivation_note TEXT;

-- Tạo index cho các trường quản lý mới
CREATE INDEX IF NOT EXISTS idx_affiliate_profiles_suspended_by ON public.affiliate_profiles(suspended_by);
CREATE INDEX IF NOT EXISTS idx_affiliate_profiles_reactivated_by ON public.affiliate_profiles(reactivated_by);

-- 2. HÀM NGUYÊN TỬ TẠM NGƯNG HOẠT ĐỘNG CỦA CTV (ACTIVE -> SUSPENDED)
CREATE OR REPLACE FUNCTION public.fn_suspend_affiliate_profile(
    p_affiliate_id UUID,
    p_actor_id UUID,
    p_reason TEXT,
    p_client_ip VARCHAR(50) DEFAULT NULL,
    p_user_agent TEXT DEFAULT NULL
)
RETURNS JSONB AS $$
DECLARE
    v_aff public.affiliate_profiles%ROWTYPE;
    v_actor public.profiles%ROWTYPE;
    v_clean_reason TEXT;
    v_result JSONB;
BEGIN
    -- 2.1 Kiểm tra quyền hạn người thực hiện
    SELECT *
    INTO v_actor 
    FROM public.profiles 
    WHERE id = p_actor_id;

    IF NOT FOUND OR v_actor.is_active = FALSE THEN
        RAISE EXCEPTION 'Bị từ chối: Tài khoản người xử lý không tồn tại hoặc đã bị vô hiệu hóa.'
            USING ERRCODE = '42501';
    END IF;

    IF v_actor.role NOT IN ('staff', 'admin') THEN
        RAISE EXCEPTION 'Bị từ chối: Chỉ Cán bộ Tuyển sinh (Staff) hoặc Quản trị viên (Admin) mới có quyền tạm ngưng CTV.'
            USING ERRCODE = '42501';
    END IF;

    -- 2.2 Kiểm tra lý do tạm ngưng (BẮT BUỘC, không chấp nhận khoảng trắng)
    v_clean_reason := NULLIF(TRIM(p_reason), '');
    IF v_clean_reason IS NULL OR LENGTH(v_clean_reason) = 0 THEN
        RAISE EXCEPTION 'Bắt buộc phải nhập lý do tạm ngưng hoạt động của cộng tác viên.'
            USING ERRCODE = '22023';
    END IF;

    -- 2.3 Khóa bản ghi hồ sơ CTV để chống xung đột đồng thời (Pessimistic Locking)
    SELECT * INTO v_aff 
    FROM public.affiliate_profiles 
    WHERE id = p_affiliate_id 
    FOR UPDATE;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Không tìm thấy hồ sơ cộng tác viên với mã định danh cung cấp.'
            USING ERRCODE = 'P0002';
    END IF;

    -- 2.4 Chỉ CTV đang ACTIVE mới được tạm ngưng
    IF v_aff.status <> 'ACTIVE' THEN
        RAISE EXCEPTION 'Thao tác không hợp lệ: Chỉ cộng tác viên đang ở trạng thái Hoạt động (ACTIVE) mới có thể tạm ngưng.'
            USING ERRCODE = 'P0004';
    END IF;

    -- 2.5 Cập nhật hồ sơ CTV (Bảo toàn nguyên vẹn reviewed_by, reviewed_at, review_note)
    UPDATE public.affiliate_profiles
    SET 
        status = 'SUSPENDED',
        suspended_by = p_actor_id,
        suspended_at = NOW(),
        suspension_reason = v_clean_reason,
        updated_at = NOW()
    WHERE id = p_affiliate_id;

    -- 2.6 Ghi nhật ký kiểm toán vào audit_logs trong cùng transaction
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
        p_actor_id,
        'AFFILIATE_SUSPENDED',
        'affiliate_profiles',
        p_affiliate_id,
        jsonb_build_object(
            'status', 'ACTIVE'
        ),
        jsonb_build_object(
            'status', 'SUSPENDED',
            'suspended_by', p_actor_id,
            'suspended_at', NOW(),
            'suspension_reason', v_clean_reason
        ),
        v_clean_reason,
        p_client_ip,
        p_user_agent,
        NOW()
    );

    v_result := jsonb_build_object(
        'success', TRUE,
        'affiliate_id', p_affiliate_id,
        'status', 'SUSPENDED',
        'suspended_by', p_actor_id,
        'suspended_at', NOW(),
        'suspension_reason', v_clean_reason
    );

    RETURN v_result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, auth, pg_temp;

-- 3. HÀM NGUYÊN TỬ KÍCH HOẠT LẠI CTV (SUSPENDED -> ACTIVE)
CREATE OR REPLACE FUNCTION public.fn_reactivate_affiliate_profile(
    p_affiliate_id UUID,
    p_actor_id UUID,
    p_note TEXT DEFAULT NULL,
    p_client_ip VARCHAR(50) DEFAULT NULL,
    p_user_agent TEXT DEFAULT NULL
)
RETURNS JSONB AS $$
DECLARE
    v_aff public.affiliate_profiles%ROWTYPE;
    v_actor public.profiles%ROWTYPE;
    v_clean_note TEXT;
    v_email_confirmed_at TIMESTAMPTZ;
    v_result JSONB;
BEGIN
    -- 3.1 Kiểm tra quyền hạn người thực hiện
    SELECT *
    INTO v_actor 
    FROM public.profiles 
    WHERE id = p_actor_id;

    IF NOT FOUND OR v_actor.is_active = FALSE THEN
        RAISE EXCEPTION 'Bị từ chối: Tài khoản người xử lý không tồn tại hoặc đã bị vô hiệu hóa.'
            USING ERRCODE = '42501';
    END IF;

    IF v_actor.role NOT IN ('staff', 'admin') THEN
        RAISE EXCEPTION 'Bị từ chối: Chỉ Cán bộ Tuyển sinh (Staff) hoặc Quản trị viên (Admin) mới có quyền kích hoạt lại CTV.'
            USING ERRCODE = '42501';
    END IF;

    v_clean_note := NULLIF(TRIM(p_note), '');

    -- 3.2 Khóa bản ghi hồ sơ CTV để chống xung đột đồng thời (Pessimistic Locking)
    SELECT * INTO v_aff 
    FROM public.affiliate_profiles 
    WHERE id = p_affiliate_id 
    FOR UPDATE;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Không tìm thấy hồ sơ cộng tác viên với mã định danh cung cấp.'
            USING ERRCODE = 'P0002';
    END IF;

    -- 3.3 Chỉ CTV đang SUSPENDED mới được kích hoạt lại (ngăn chặn bypass A1.3)
    IF v_aff.status <> 'SUSPENDED' THEN
        RAISE EXCEPTION 'Thao tác không hợp lệ: Chỉ cộng tác viên đang ở trạng thái Tạm ngưng (SUSPENDED) mới có thể kích hoạt lại.'
            USING ERRCODE = 'P0005';
    END IF;

    -- 3.4 Kiểm tra xác thực email khi kích hoạt lại
    SELECT email_confirmed_at INTO v_email_confirmed_at
    FROM auth.users
    WHERE id = v_aff.user_id;

    IF v_email_confirmed_at IS NULL THEN
        RAISE EXCEPTION 'Không thể kích hoạt lại hồ sơ do email của Cộng tác viên chưa được xác thực.'
            USING ERRCODE = '22023';
    END IF;

    -- 3.5 Cập nhật hồ sơ CTV sang ACTIVE
    UPDATE public.affiliate_profiles
    SET 
        status = 'ACTIVE',
        reactivated_by = p_actor_id,
        reactivated_at = NOW(),
        reactivation_note = v_clean_note,
        updated_at = NOW()
    WHERE id = p_affiliate_id;

    -- 3.6 Ghi nhật ký kiểm toán vào audit_logs trong cùng transaction
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
        p_actor_id,
        'AFFILIATE_REACTIVATED',
        'affiliate_profiles',
        p_affiliate_id,
        jsonb_build_object(
            'status', 'SUSPENDED',
            'suspension_reason', v_aff.suspension_reason
        ),
        jsonb_build_object(
            'status', 'ACTIVE',
            'reactivated_by', p_actor_id,
            'reactivated_at', NOW(),
            'reactivation_note', v_clean_note
        ),
        v_clean_note,
        p_client_ip,
        p_user_agent,
        NOW()
    );

    v_result := jsonb_build_object(
        'success', TRUE,
        'affiliate_id', p_affiliate_id,
        'status', 'ACTIVE',
        'reactivated_by', p_actor_id,
        'reactivated_at', NOW(),
        'reactivation_note', v_clean_note
    );

    RETURN v_result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, auth, pg_temp;

-- 4. PHÂN QUYỀN THỰC THI CHO HÀM TẠM NGƯNG VÀ KÍCH HOẠT LẠI
REVOKE ALL ON FUNCTION public.fn_suspend_affiliate_profile(UUID, UUID, TEXT, VARCHAR, TEXT) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.fn_suspend_affiliate_profile(UUID, UUID, TEXT, VARCHAR, TEXT) TO authenticated, service_role;

REVOKE ALL ON FUNCTION public.fn_reactivate_affiliate_profile(UUID, UUID, TEXT, VARCHAR, TEXT) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.fn_reactivate_affiliate_profile(UUID, UUID, TEXT, VARCHAR, TEXT) TO authenticated, service_role;
