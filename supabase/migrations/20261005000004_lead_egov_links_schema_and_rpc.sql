-- ==============================================================================
-- MIGRATION: A4-F2 - Bảng lead_egov_links và các hàm RPC nguyên tử quản lý EGOV độc lập
-- ==============================================================================

-- 1. Tạo bảng public.lead_egov_links
CREATE TABLE IF NOT EXISTS public.lead_egov_links (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    lead_id UUID NOT NULL REFERENCES public.leads(id) ON DELETE RESTRICT,
    external_admission_code VARCHAR(100) NOT NULL,
    link_status VARCHAR(50) NOT NULL DEFAULT 'ACTIVE',
    verified_by UUID NOT NULL REFERENCES public.profiles(id) ON DELETE RESTRICT,
    verified_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    void_reason TEXT,
    voided_by UUID REFERENCES public.profiles(id) ON DELETE RESTRICT,
    voided_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT chk_lead_egov_links_status CHECK (
        link_status IN ('ACTIVE', 'VOIDED')
    ),
    CONSTRAINT chk_external_admission_code_format CHECK (
        external_admission_code ~ '^[0-9]{7}$'
    )
);

CREATE TRIGGER trg_lead_egov_links_updated_at
BEFORE UPDATE ON public.lead_egov_links
FOR EACH ROW EXECUTE FUNCTION public.set_current_timestamp_updated_at();

CREATE INDEX IF NOT EXISTS idx_lead_egov_links_lead_id ON public.lead_egov_links(lead_id);
CREATE INDEX IF NOT EXISTS idx_lead_egov_links_code ON public.lead_egov_links(external_admission_code);
CREATE INDEX IF NOT EXISTS idx_lead_egov_links_status ON public.lead_egov_links(link_status);

-- Chỉ mục duy nhất có điều kiện cho liên kết đang hoạt động (ACTIVE)
CREATE UNIQUE INDEX IF NOT EXISTS uq_active_external_admission_code 
ON public.lead_egov_links (external_admission_code) 
WHERE link_status = 'ACTIVE';

CREATE UNIQUE INDEX IF NOT EXISTS uq_active_egov_per_lead 
ON public.lead_egov_links (lead_id) 
WHERE link_status = 'ACTIVE';


-- 2. RPC Nguyên tử: fn_link_or_update_lead_egov
CREATE OR REPLACE FUNCTION public.fn_link_or_update_lead_egov(
    p_lead_id UUID,
    p_staff_id UUID,
    p_external_admission_code VARCHAR,
    p_reason TEXT,
    p_expected_updated_at TIMESTAMPTZ
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_lead RECORD;
    v_clean_code VARCHAR;
    v_existing_active_link RECORD;
    v_active_recon RECORD;
    v_new_link_id UUID;
    v_now TIMESTAMPTZ := NOW();
BEGIN
    -- 1. Trim và validate định dạng 7 chữ số
    v_clean_code := TRIM(p_external_admission_code);
    IF v_clean_code !~ '^[0-9]{7}$' THEN
        RAISE EXCEPTION 'INVALID_EGOV_CODE: Mã hồ sơ EGOV phải gồm đúng 7 chữ số viết liền.' USING ERRCODE = 'P0001';
    END IF;

    -- 2. Khóa lead (FOR UPDATE) để chống race condition
    SELECT * INTO v_lead FROM public.leads WHERE id = p_lead_id FOR UPDATE;
    IF NOT FOUND THEN
        RAISE EXCEPTION 'LEAD_NOT_FOUND: Không tìm thấy hồ sơ khách hàng.' USING ERRCODE = 'P0002';
    END IF;

    -- 3. Kiểm tra xung đột phiên bản (Concurrency Check)
    IF v_lead.updated_at IS DISTINCT FROM p_expected_updated_at THEN
        RAISE EXCEPTION 'CONCURRENT_CONFLICT: Hồ sơ đã được cập nhật bởi cán bộ khác. Vui lòng tải lại trang.' USING ERRCODE = 'P0003';
    END IF;

    -- 4. Kiểm tra xem mã EGOV này đã được liên kết ACTIVE cho lead KHÁC chưa
    SELECT * INTO v_existing_active_link 
    FROM public.lead_egov_links 
    WHERE external_admission_code = v_clean_code 
      AND link_status = 'ACTIVE' 
      AND lead_id <> p_lead_id;

    IF FOUND THEN
        RAISE EXCEPTION 'EGOV_ALREADY_LINKED: Mã hồ sơ EGOV này đã được liên kết với một hồ sơ thí sinh khác.' USING ERRCODE = 'P0004';
    END IF;

    -- 5. Kiểm tra xem lead này đã có liên kết ACTIVE chưa
    SELECT * INTO v_existing_active_link 
    FROM public.lead_egov_links 
    WHERE lead_id = p_lead_id 
      AND link_status = 'ACTIVE';

    IF FOUND THEN
        -- Nếu đã có liên kết ACTIVE: yêu cầu phải có lý do (p_reason) để sửa
        IF v_existing_active_link.external_admission_code = v_clean_code THEN
            -- Trùng mã cũ -> Không cần thay đổi gì, trả về thành công hiện tại
            RETURN jsonb_build_object(
                'success', true,
                'message', 'Mã hồ sơ EGOV không thay đổi.',
                'lead_id', p_lead_id,
                'egov_link_id', v_existing_active_link.id,
                'external_admission_code', v_clean_code,
                'updated_at', v_lead.updated_at
            );
        END IF;

        IF p_reason IS NULL OR TRIM(p_reason) = '' THEN
            RAISE EXCEPTION 'MISSING_RECONCILIATION_NOTE: Bắt buộc phải nhập lý do khi sửa đổi mã EGOV đã liên kết.' USING ERRCODE = 'P0005';
        END IF;

        -- Kiểm tra xem lead có đang có kết quả đối soát nào đang hoạt động không phụ thuộc
        -- Nếu có đối soát, quy tắc chốt là phải hủy đối soát trước khi sửa mã EGOV
        SELECT * INTO v_active_recon 
        FROM public.lead_reconciliations 
        WHERE lead_id = p_lead_id 
          AND reconciliation_status IN ('MATCHED_VALID', 'EXISTING_IN_SCHOOL_SYSTEM', 'MISMATCH_INVALID');

        IF FOUND THEN
            RAISE EXCEPTION 'ACTIVE_RECON_EXISTS: Hồ sơ đang có kết quả đối soát hoạt động. Vui lòng hủy kết quả đối soát trước khi sửa mã EGOV.' USING ERRCODE = 'P0006';
        END IF;

        -- VOID liên kết cũ
        UPDATE public.lead_egov_links 
        SET link_status = 'VOIDED',
            void_reason = TRIM(p_reason),
            voided_by = p_staff_id,
            voided_at = v_now,
            updated_at = v_now
        WHERE id = v_existing_active_link.id;
    END IF;

    -- 6. Tạo liên kết ACTIVE mới
    INSERT INTO public.lead_egov_links (
        lead_id,
        external_admission_code,
        link_status,
        verified_by,
        verified_at,
        created_at,
        updated_at
    ) VALUES (
        p_lead_id,
        v_clean_code,
        'ACTIVE',
        p_staff_id,
        v_now,
        v_now,
        v_now
    ) RETURNING id INTO v_new_link_id;

    -- 7. Cập nhật updated_at của leads để tăng phiên bản
    UPDATE public.leads 
    SET updated_at = v_now 
    WHERE id = p_lead_id;

    -- 8. Ghi audit log
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
        CASE WHEN v_existing_active_link.id IS NOT NULL THEN 'UPDATE_EGOV_LINK' ELSE 'CREATE_EGOV_LINK' END,
        'lead_egov_links',
        v_new_link_id,
        jsonb_build_object('old_code', v_existing_active_link.external_admission_code),
        jsonb_build_object('external_admission_code', v_clean_code, 'link_status', 'ACTIVE'),
        COALESCE(p_reason, 'Liên kết hồ sơ EGOV mới'),
        v_now
    );

    RETURN jsonb_build_object(
        'success', true,
        'message', 'Liên kết mã hồ sơ EGOV thành công!',
        'lead_id', p_lead_id,
        'egov_link_id', v_new_link_id,
        'external_admission_code', v_clean_code,
        'updated_at', v_now
    );
END;
$$;


-- 3. RPC Nguyên tử: fn_unlink_lead_egov
CREATE OR REPLACE FUNCTION public.fn_unlink_lead_egov(
    p_lead_id UUID,
    p_staff_id UUID,
    p_target_egov_link_id UUID,
    p_void_reason TEXT,
    p_expected_updated_at TIMESTAMPTZ
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_lead RECORD;
    v_link RECORD;
    v_active_recon RECORD;
    v_now TIMESTAMPTZ := NOW();
BEGIN
    -- 1. Validate lý do hủy
    IF p_void_reason IS NULL OR TRIM(p_void_reason) = '' THEN
        RAISE EXCEPTION 'MISSING_VOID_REASON: Bắt buộc phải nhập lý do hủy liên kết EGOV.' USING ERRCODE = 'P0001';
    END IF;

    -- 2. Khóa lead
    SELECT * INTO v_lead FROM public.leads WHERE id = p_lead_id FOR UPDATE;
    IF NOT FOUND THEN
        RAISE EXCEPTION 'LEAD_NOT_FOUND: Không tìm thấy hồ sơ khách hàng.' USING ERRCODE = 'P0002';
    END IF;

    -- 3. Kiểm tra concurrency
    IF v_lead.updated_at IS DISTINCT FROM p_expected_updated_at THEN
        RAISE EXCEPTION 'CONCURRENT_CONFLICT: Hồ sơ đã được cập nhật bởi cán bộ khác. Vui lòng tải lại trang.' USING ERRCODE = 'P0003';
    END IF;

    -- 4. Tìm liên kết EGOV đích
    SELECT * INTO v_link FROM public.lead_egov_links WHERE id = p_target_egov_link_id AND lead_id = p_lead_id FOR UPDATE;
    IF NOT FOUND THEN
        RAISE EXCEPTION 'LINK_NOT_FOUND: Không tìm thấy bản ghi liên kết EGOV.' USING ERRCODE = 'P0004';
    END IF;

    IF v_link.link_status <> 'ACTIVE' THEN
        RAISE EXCEPTION 'LINK_NOT_ACTIVE: Bản ghi liên kết EGOV này đã bị hủy trước đó.' USING ERRCODE = 'P0005';
    END IF;

    -- 5. Kiểm tra xem lead có đang có kết quả đối soát hoạt động không
    SELECT * INTO v_active_recon 
    FROM public.lead_reconciliations 
    WHERE lead_id = p_lead_id 
      AND reconciliation_status IN ('MATCHED_VALID', 'EXISTING_IN_SCHOOL_SYSTEM', 'MISMATCH_INVALID');

    IF FOUND THEN
        RAISE EXCEPTION 'ACTIVE_RECON_EXISTS: Hồ sơ đang có kết quả đối soát hoạt động. Vui lòng hủy kết quả đối soát trước khi hủy liên kết EGOV.' USING ERRCODE = 'P0006';
    END IF;

    -- 6. VOID liên kết
    UPDATE public.lead_egov_links 
    SET link_status = 'VOIDED',
        void_reason = TRIM(p_void_reason),
        voided_by = p_staff_id,
        voided_at = v_now,
        updated_at = v_now
    WHERE id = p_target_egov_link_id;

    -- 7. Cập nhật version lead
    UPDATE public.leads 
    SET updated_at = v_now 
    WHERE id = p_lead_id;

    -- 8. Ghi audit log
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
        'VOID_EGOV_LINK',
        'lead_egov_links',
        p_target_egov_link_id,
        jsonb_build_object('external_admission_code', v_link.external_admission_code, 'link_status', 'ACTIVE'),
        jsonb_build_object('link_status', 'VOIDED'),
        TRIM(p_void_reason),
        v_now
    );

    RETURN jsonb_build_object(
        'success', true,
        'message', 'Hủy liên kết mã hồ sơ EGOV thành công!',
        'lead_id', p_lead_id,
        'voided_egov_link_id', p_target_egov_link_id,
        'updated_at', v_now
    );
END;
$$;
